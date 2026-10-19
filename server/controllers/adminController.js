import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ApiError from '../utils/ApiError.js';
import { getClerk } from '../middleware/auth.js';
import { purgeStudentData } from '../utils/cleanup.js';

// GET /api/admin/users?role=student
export const listUsers = async (req, res) => {
  const { role } = req.validatedQuery || {};
  const users = await User.find(role ? { role } : {}).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
};

// PUT /api/admin/users/:id/role  { role }
export const updateUserRole = async (req, res) => {
  if (req.params.id === req.user._id) throw new ApiError(400, 'You cannot change your own role');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.role = req.body.role;
  await user.save();
  try {
    const clerk = getClerk();
    if (clerk && user.authProvider === 'clerk') {
      await clerk.users.updateUserMetadata(user._id, { publicMetadata: { role: user.role } });
    }
  } catch (e) {
    console.warn('⚠️  Could not sync role to Clerk metadata:', e.message);
  }
  res.json({ success: true, message: 'Role updated', user });
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  if (req.params.id === req.user._id) throw new ApiError(400, 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const ownedCourses = await Course.find({ educator: user._id }).select('_id');
  const ownedIds = ownedCourses.map((c) => c._id);
  await Enrollment.deleteMany({ course: { $in: ownedIds } });
  await Course.deleteMany({ educator: user._id });
  await purgeStudentData(user._id);
  await user.deleteOne();
  res.json({
    success: true,
    message: 'User and related data deleted (delete the user in the Clerk dashboard too if they should not be able to sign in again)',
  });
};

// GET /api/admin/courses – every course, published or not
export const listAllCourses = async (_req, res) => {
  const courses = await Course.find().populate('educator', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, count: courses.length, courses });
};

// GET /api/admin/analytics
export const analytics = async (_req, res) => {
  const [students, educators, admins, totalCourses, publishedCourses, totalEnrollments, enrollments, courses] =
    await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'educator' }),
      User.countDocuments({ role: 'admin' }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Enrollment.countDocuments(),
      Enrollment.find().select('course amount'),
      Course.find().select('courseTitle'),
    ]);

  const revenue = Number(enrollments.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2));
  const counts = new Map();
  for (const e of enrollments) counts.set(String(e.course), (counts.get(String(e.course)) || 0) + 1);
  const topCourses = courses
    .map((c) => ({ courseId: c._id, courseTitle: c.courseTitle, enrollments: counts.get(String(c._id)) || 0 }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  res.json({
    success: true,
    analytics: {
      users: { students, educators, admins, total: students + educators + admins },
      courses: { total: totalCourses, published: publishedCourses },
      enrollments: totalEnrollments,
      revenue,
      topCourses,
    },
  });
};

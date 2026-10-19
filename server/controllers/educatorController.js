import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { getClerk } from '../middleware/auth.js';

// POST /api/educator/update-role – a signed-in student becomes an educator ("Become Educator" button)
export const becomeEducator = async (req, res) => {
  const user = req.user;
  if (user.role === 'student') {
    user.role = 'educator';
    await user.save();
    try {
      const clerk = getClerk();
      if (clerk && user.authProvider === 'clerk') {
        await clerk.users.updateUserMetadata(user._id, { publicMetadata: { role: 'educator' } });
      }
    } catch (e) {
      console.warn('⚠️  Could not sync role to Clerk metadata:', e.message);
    }
  }
  res.json({ success: true, message: user.role === 'admin' ? 'You are an admin' : 'You can publish a course now', role: user.role });
};

// GET /api/educator/courses
export const educatorCourses = async (req, res) => {
  const courses = await Course.find({ educator: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: courses.length, courses });
};

// GET /api/educator/dashboard  → shape used by the frontend Dashboard page
export const dashboard = async (req, res) => {
  const courses = await Course.find({ educator: req.user._id }).select('courseTitle');
  const titles = new Map(courses.map((c) => [String(c._id), c.courseTitle]));
  const enrollments = await Enrollment.find({ course: { $in: courses.map((c) => c._id) } })
    .populate('student', 'name imageUrl')
    .sort({ createdAt: -1 });

  const totalEarnings = Number(enrollments.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2));
  const enrolledStudentsData = enrollments
    .filter((e) => e.student)
    .map((e) => ({
      courseTitle: titles.get(String(e.course)),
      student: { _id: e.student._id, name: e.student.name, imageUrl: e.student.imageUrl },
    }));

  res.json({
    success: true,
    dashboardData: { totalEarnings, enrolledStudentsData, totalCourses: courses.length },
  });
};

// GET /api/educator/enrolled-students  → shape used by StudentsEnrolled page
export const enrolledStudents = async (req, res) => {
  const courses = await Course.find({ educator: req.user._id }).select('courseTitle');
  const titles = new Map(courses.map((c) => [String(c._id), c.courseTitle]));
  const enrollments = await Enrollment.find({ course: { $in: courses.map((c) => c._id) } })
    .populate('student', 'name imageUrl')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    enrolledStudents: enrollments
      .filter((e) => e.student)
      .map((e) => ({
        student: { _id: e.student._id, name: e.student.name, imageUrl: e.student.imageUrl },
        courseTitle: titles.get(String(e.course)),
        purchaseDate: e.createdAt,
      })),
  });
};

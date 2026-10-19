import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ApiError from '../utils/ApiError.js';
import { allLectureIds, finalPrice } from '../utils/courseHelpers.js';

// POST /api/enroll  { courseId }
export const enroll = async (req, res) => {
  const course = await Course.findById(req.body.courseId);
  if (!course || !course.isPublished) throw new ApiError(404, 'Course not found');
  if (course.educator === req.user._id) throw new ApiError(400, 'You cannot enroll in your own course');

  try {
    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: course._id,
      amount: finalPrice(course),
    });
    await Course.updateOne({ _id: course._id }, { $addToSet: { enrolledStudents: req.user._id } });
    res.status(201).json({ success: true, message: 'Enrolled successfully', enrollment });
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, 'You are already enrolled in this course');
    throw err;
  }
};

// GET /api/my-courses  (also /api/user/enrolled-courses)
export const myCourses = async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({ path: 'course', populate: { path: 'educator', select: 'name imageUrl' } })
    .sort({ createdAt: -1 });

  const valid = enrollments.filter((e) => e.course); // course may have been deleted
  const enrolledCourses = valid.map((e) => e.course);
  res.json({
    success: true,
    count: valid.length,
    enrolledCourses, // same key the frontend context uses
    enrollments: valid.map((e) => ({
      _id: e._id,
      course: e.course,
      progress: e.progress,
      completedLectures: e.completedLectures,
      enrolledAt: e.createdAt,
    })),
  });
};

// POST /api/user/update-course-progress  { courseId, lectureId }
export const updateProgress = async (req, res) => {
  const { courseId, lectureId } = req.body;
  const [course, enrollment] = await Promise.all([
    Course.findById(courseId),
    Enrollment.findOne({ student: req.user._id, course: courseId }),
  ]);
  if (!enrollment || !course) throw new ApiError(404, 'You are not enrolled in this course');

  const ids = allLectureIds(course);
  if (!ids.includes(lectureId)) throw new ApiError(400, 'Lecture does not belong to this course');

  if (!enrollment.completedLectures.includes(lectureId)) enrollment.completedLectures.push(lectureId);
  enrollment.progress = ids.length ? Math.round((enrollment.completedLectures.length / ids.length) * 100) : 0;
  await enrollment.save();
  res.json({
    success: true,
    message: 'Progress updated',
    progress: enrollment.progress,
    progressData: { lectureCompleted: enrollment.completedLectures },
  });
};

// POST /api/user/get-course-progress  { courseId }
export const getProgress = async (req, res) => {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.body.courseId });
  if (!enrollment) throw new ApiError(404, 'You are not enrolled in this course');
  res.json({
    success: true,
    progress: enrollment.progress,
    progressData: { lectureCompleted: enrollment.completedLectures },
  });
};

// POST /api/user/add-rating  { courseId, rating }
export const addRating = async (req, res) => {
  const { courseId, rating } = req.body;
  const enrolled = await Enrollment.exists({ student: req.user._id, course: courseId });
  if (!enrolled) throw new ApiError(403, 'Only enrolled students can rate a course');
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');

  const existing = course.courseRatings.find((r) => r.userId === req.user._id);
  if (existing) existing.rating = rating;
  else course.courseRatings.push({ userId: req.user._id, rating });
  await course.save();
  res.json({ success: true, message: 'Rating saved' });
};

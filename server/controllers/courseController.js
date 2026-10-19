import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ApiError from '../utils/ApiError.js';
import { normalizeContent, toPublicCourse } from '../utils/courseHelpers.js';
import { randomUUID } from 'node:crypto';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const populateEducator = { path: 'educator', select: 'name imageUrl' };

const thumbnailFromRequest = (req) =>
  req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : undefined;

// Loads a course and checks the caller is its educator (or an admin).
const loadOwnedCourse = async (req) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (req.user.role !== 'admin' && course.educator !== req.user._id) {
    throw new ApiError(403, 'You can only modify your own courses');
  }
  return course;
};

// GET /api/courses  (public) – published courses
export const listCourses = async (req, res) => {
  const { search, category } = req.validatedQuery || {};
  const filter = { isPublished: true };
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (search) filter.courseTitle = new RegExp(escapeRegex(search), 'i');
  const courses = await Course.find(filter).populate(populateEducator).sort({ createdAt: -1 });
  res.json({ success: true, count: courses.length, courses: courses.map(toPublicCourse) });
};

// GET /api/courses/:id  (public)
export const getCourse = async (req, res) => {
  const course = await Course.findById(req.params.id).populate(populateEducator);
  if (!course || !course.isPublished) throw new ApiError(404, 'Course not found');
  res.json({ success: true, courseData: toPublicCourse(course), course: toPublicCourse(course) });
};

// POST /api/courses  (educator, admin)
export const createCourse = async (req, res) => {
  const data = { ...req.body };
  if (data.courseContent) data.courseContent = normalizeContent(data.courseContent);
  const thumb = thumbnailFromRequest(req);
  if (thumb) data.courseThumbnail = thumb;
  const course = await Course.create({ ...data, educator: req.user._id });
  res.status(201).json({ success: true, message: 'Course created', course });
};

// PUT /api/courses/:id  (owner educator, admin)
export const updateCourse = async (req, res) => {
  const course = await loadOwnedCourse(req);
  const data = { ...req.body };
  if (data.courseContent) data.courseContent = normalizeContent(data.courseContent);
  const thumb = thumbnailFromRequest(req);
  if (thumb) data.courseThumbnail = thumb;
  course.set(data);
  await course.save();
  res.json({ success: true, message: 'Course updated', course });
};

// DELETE /api/courses/:id  (owner educator, admin)
export const deleteCourse = async (req, res) => {
  const course = await loadOwnedCourse(req);
  await Enrollment.deleteMany({ course: course._id });
  await course.deleteOne();
  res.json({ success: true, message: 'Course deleted' });
};

// POST /api/courses/:id/chapters  – add a chapter
export const addChapter = async (req, res) => {
  const course = await loadOwnedCourse(req);
  course.courseContent.push({
    chapterId: randomUUID(),
    chapterOrder: course.courseContent.length + 1,
    chapterTitle: req.body.chapterTitle,
    chapterContent: [],
  });
  await course.save();
  res.status(201).json({ success: true, message: 'Chapter added', course });
};

// POST /api/courses/:id/chapters/:chapterId/lectures  – upload/add a lesson
export const addLecture = async (req, res) => {
  const course = await loadOwnedCourse(req);
  const chapter = course.courseContent.find((c) => c.chapterId === req.params.chapterId);
  if (!chapter) throw new ApiError(404, 'Chapter not found');
  chapter.chapterContent.push({
    lectureId: randomUUID(),
    lectureTitle: req.body.lectureTitle,
    lectureDuration: req.body.lectureDuration,
    lectureUrl: req.body.lectureUrl || '',
    isPreviewFree: Boolean(req.body.isPreviewFree),
    lectureOrder: req.body.lectureOrder ?? chapter.chapterContent.length + 1,
  });
  await course.save();
  res.status(201).json({ success: true, message: 'Lecture added', course });
};

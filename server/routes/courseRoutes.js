import { Router } from 'express';
import {
  listCourses, getCourse, createCourse, updateCourse, deleteCourse, addChapter, addLecture,
} from '../controllers/courseController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { uploadThumbnail, parseCourseForm } from '../middleware/upload.js';
import {
  createCourseSchema, updateCourseSchema, chapterSchema, lectureSchema, listCoursesQuery,
} from '../utils/validators.js';

const router = Router();
const staff = [authenticate, requireRole('educator', 'admin')];

// Public
router.get('/', validate(listCoursesQuery, 'query'), listCourses);
router.get('/all', validate(listCoursesQuery, 'query'), listCourses); // alias used by common LMS frontends
router.get('/:id', validateObjectId('id'), getCourse);

// Educator / Admin
router.post('/', ...staff, uploadThumbnail, parseCourseForm, validate(createCourseSchema), createCourse);
router.put('/:id', ...staff, validateObjectId('id'), uploadThumbnail, parseCourseForm, validate(updateCourseSchema), updateCourse);
router.delete('/:id', ...staff, validateObjectId('id'), deleteCourse);
router.post('/:id/chapters', ...staff, validateObjectId('id'), validate(chapterSchema), addChapter);
router.post('/:id/chapters/:chapterId/lectures', ...staff, validateObjectId('id'), validate(lectureSchema), addLecture);

export default router;

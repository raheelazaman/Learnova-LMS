import { Router } from 'express';
import { becomeEducator, educatorCourses, dashboard, enrolledStudents } from '../controllers/educatorController.js';
import { createCourse } from '../controllers/courseController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadThumbnail, parseCourseForm } from '../middleware/upload.js';
import { createCourseSchema } from '../utils/validators.js';

const router = Router();
router.use(authenticate);

router.post('/update-role', becomeEducator); // any signed-in user ("Become Educator")

router.use(requireRole('educator', 'admin'));
router.post('/add-course', uploadThumbnail, parseCourseForm, validate(createCourseSchema), createCourse);
router.get('/courses', educatorCourses);
router.get('/dashboard', dashboard);
router.get('/enrolled-students', enrolledStudents);

export default router;

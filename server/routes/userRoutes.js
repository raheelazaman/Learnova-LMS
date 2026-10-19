import { Router } from 'express';
import { getUserData } from '../controllers/userController.js';
import { myCourses, updateProgress, getProgress, addRating } from '../controllers/enrollmentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { progressSchema, courseIdSchema, ratingSchema } from '../utils/validators.js';

const router = Router();
router.use(authenticate);

router.get('/data', getUserData);
router.get('/enrolled-courses', myCourses); // same handler as GET /api/my-courses
router.post('/update-course-progress', validate(progressSchema), updateProgress);
router.post('/get-course-progress', validate(courseIdSchema), getProgress);
router.post('/add-rating', validate(ratingSchema), addRating);

export default router;

import { Router } from 'express';
import { enroll, myCourses } from '../controllers/enrollmentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { enrollSchema } from '../utils/validators.js';

const router = Router();
// Assignment endpoints: POST /api/enroll and GET /api/my-courses
router.post('/enroll', authenticate, validate(enrollSchema), enroll);
router.get('/my-courses', authenticate, myCourses);

export default router;

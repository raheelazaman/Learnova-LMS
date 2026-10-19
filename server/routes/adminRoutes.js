import { Router } from 'express';
import { listUsers, updateUserRole, deleteUser, listAllCourses, analytics } from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { roleSchema, usersQuery } from '../utils/validators.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/users', validate(usersQuery, 'query'), listUsers);
router.put('/users/:id/role', validate(roleSchema), updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/courses', listAllCourses);
router.get('/analytics', analytics);

export default router;

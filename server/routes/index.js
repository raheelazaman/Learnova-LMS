import { Router } from 'express';
import authRoutes from './authRoutes.js';
import courseRoutes from './courseRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import userRoutes from './userRoutes.js';
import educatorRoutes from './educatorRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/course', courseRoutes); // alias → /api/course/all, /api/course/:id
router.use('/', enrollmentRoutes);
router.use('/user', userRoutes);
router.use('/educator', educatorRoutes);
router.use('/admin', adminRoutes);

export default router;

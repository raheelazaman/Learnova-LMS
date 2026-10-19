import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { getUserData } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../utils/validators.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const router = Router();
const localOnly = (_req, _res, next) =>
  env.enableLocalAuth ? next() : next(new ApiError(404, 'Local authentication is disabled; use Clerk'));

router.post('/register', localOnly, validate(registerSchema), register);
router.post('/login', localOnly, validate(loginSchema), login);
router.get('/me', authenticate, getUserData);

export default router;

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { LOCAL_ISSUER } from '../middleware/auth.js';

const signToken = (user) =>
  jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: String(user._id),
    issuer: LOCAL_ISSUER,
    expiresIn: env.jwtExpiresIn,
  });

// POST /api/auth/register  (optional local auth: bcrypt + JWT, as the assignment text describes)
export const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'Email is already registered');
  const user = await User.create({
    _id: `local_${new mongoose.Types.ObjectId()}`,
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: role === 'student' || !role ? 'student' : 'educator', // admins can never self-register
    authProvider: 'local',
  });
  res.status(201).json({ success: true, message: 'Registered successfully', token: signToken(user), user });
};

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const ok = user?.authProvider === 'local' && user.password && (await bcrypt.compare(password, user.password));
  if (!ok) throw new ApiError(401, 'Invalid email or password');
  res.json({ success: true, message: 'Logged in', token: signToken(user), user });
};

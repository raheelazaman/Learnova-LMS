import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ApiError from '../utils/ApiError.js';

export const uploadDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, 'Only png, jpg, webp or gif images are allowed')),
});

export const uploadThumbnail = upload.single('thumbnail');

// Multipart requests may send the course as a JSON string in `courseData` (same style as the common LMS frontend).
export const parseCourseForm = (req, _res, next) => {
  if (typeof req.body?.courseData === 'string') {
    try {
      req.body = JSON.parse(req.body.courseData);
    } catch {
      return next(new ApiError(400, 'courseData must be valid JSON'));
    }
  }
  next();
};

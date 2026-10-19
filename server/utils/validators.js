import { z } from 'zod';

const lecture = z.object({
  lectureId: z.string().optional(),
  lectureTitle: z.string().trim().min(1, 'Lecture title is required'),
  lectureDuration: z.number().min(0, 'Duration must be >= 0 (minutes)'),
  lectureUrl: z.string().trim().optional(),
  isPreviewFree: z.boolean().optional(),
  lectureOrder: z.number().int().optional(),
});

const chapter = z.object({
  chapterId: z.string().optional(),
  chapterOrder: z.number().int().optional(),
  chapterTitle: z.string().trim().min(1, 'Chapter title is required'),
  chapterContent: z.array(lecture).optional(),
});

const courseBase = z.object({
  courseTitle: z.string().trim().min(3, 'Title must be at least 3 characters'),
  courseDescription: z.string().trim().min(10, 'Description must be at least 10 characters'),
  category: z.string().trim().min(1).optional(),
  courseThumbnail: z.string().trim().optional(),
  coursePrice: z.number().min(0, 'Price must be >= 0'),
  discount: z.number().min(0).max(100).optional(),
  isPublished: z.boolean().optional(),
  courseContent: z.array(chapter).optional(),
});

export const createCourseSchema = courseBase;
export const updateCourseSchema = courseBase
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });
export const chapterSchema = z.object({ chapterTitle: z.string().trim().min(1, 'Chapter title is required') });
export const lectureSchema = lecture;

export const listCoursesQuery = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'educator', 'instructor']).optional(),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const enrollSchema = z.object({ courseId: z.string().min(1, 'courseId is required') });
export const progressSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  lectureId: z.string().min(1, 'lectureId is required'),
});
export const courseIdSchema = enrollSchema;
export const ratingSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  rating: z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
});
export const roleSchema = z.object({ role: z.enum(['student', 'educator', 'admin']) });
export const usersQuery = z.object({ role: z.enum(['student', 'educator', 'admin']).optional() });

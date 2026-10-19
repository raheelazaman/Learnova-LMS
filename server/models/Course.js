import mongoose from 'mongoose';

// Field names intentionally match the frontend's dummyCourses shape (assets.js).
const lectureSchema = new mongoose.Schema(
  {
    lectureId: { type: String, required: true },
    lectureTitle: { type: String, required: true, trim: true },
    lectureDuration: { type: Number, required: true, min: 0 }, // minutes
    lectureUrl: { type: String, default: '' },
    isPreviewFree: { type: Boolean, default: false },
    lectureOrder: { type: Number, required: true },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    chapterId: { type: String, required: true },
    chapterOrder: { type: Number, required: true },
    chapterTitle: { type: String, required: true, trim: true },
    chapterContent: { type: [lectureSchema], default: [] },
  },
  { _id: false }
);

const ratingSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
});

const courseSchema = new mongoose.Schema(
  {
    courseTitle: { type: String, required: true, trim: true },
    courseDescription: { type: String, required: true },
    category: { type: String, default: 'General', trim: true },
    courseThumbnail: { type: String, default: '' },
    coursePrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    isPublished: { type: Boolean, default: true },
    courseContent: { type: [chapterSchema], default: [] },
    courseRatings: { type: [ratingSchema], default: [] },
    educator: { type: String, ref: 'User', required: true, index: true }, // instructor reference
    enrolledStudents: [{ type: String, ref: 'User' }],
  },
  { timestamps: true, minimize: false }
);

courseSchema.index({ courseTitle: 'text', category: 'text' });

export default mongoose.model('Course', courseSchema);

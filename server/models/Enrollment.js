import mongoose from 'mongoose';

// Assignment: Enrollment (student reference, course reference, progress).
const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: String, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 }, // percent complete
    completedLectures: { type: [String], default: [] }, // lectureIds
    amount: { type: Number, default: 0 }, // price paid (after discount) – used for educator earnings
    status: { type: String, enum: ['completed'], default: 'completed' },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);

import mongoose from 'mongoose';

export const ROLES = ['student', 'educator', 'admin']; // "educator" == Instructor in the assignment

// _id is the Clerk user id (e.g. "user_2abc...") so it matches the frontend's data shape.
// Users created through the optional local /register endpoint get a generated "local_<ObjectId>" id.
const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    imageUrl: { type: String, default: '' },
    role: { type: String, enum: ROLES, default: 'student' },
    // Only used by the optional local auth; never set for Clerk users.
    password: { type: String, select: false },
    authProvider: { type: String, enum: ['clerk', 'local'], default: 'clerk' },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);

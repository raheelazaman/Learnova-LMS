import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// Removes a student's traces (enrollment records, enrolled-list entries, ratings) from all courses.
// Plain read-modify-write instead of conditional $pull so it behaves identically on every MongoDB-compatible server.
export const purgeStudentData = async (userId) => {
  await Enrollment.deleteMany({ student: userId });
  const courses = await Course.find({ $or: [{ enrolledStudents: userId }, { 'courseRatings.userId': userId }] });
  for (const c of courses) {
    c.enrolledStudents = c.enrolledStudents.filter((id) => id !== userId);
    c.courseRatings = c.courseRatings.filter((r) => r.userId !== userId);
    await c.save();
  }
};

// Usage: npm run seed        (adds demo users + courses; wipes ONLY the demo data it created before)
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

if (env.nodeEnv === 'production') {
  console.error('Refusing to seed in production.');
  process.exit(1);
}

const lec = (n, title, min, url, free = false) => ({
  lectureId: `lecture${n}`, lectureTitle: title, lectureDuration: min, lectureUrl: url, isPreviewFree: free, lectureOrder: n,
});

const courses = (educator) => [
  {
    courseTitle: 'Introduction to JavaScript', category: 'Web Development', coursePrice: 49.99, discount: 20,
    courseDescription: '<h2>Learn the Basics of JavaScript</h2><p>Syntax, data types and control structures for complete beginners.</p>',
    courseThumbnail: 'https://img.youtube.com/vi/CBWnBi-awSA/maxresdefault.jpg',
    courseContent: [
      { chapterId: 'chapter1', chapterOrder: 1, chapterTitle: 'Getting Started with JavaScript', chapterContent: [
        lec(1, 'What is JavaScript?', 16, 'https://youtu.be/CBWnBi-awSA', true), lec(2, 'Setting Up Your Environment', 19, 'https://youtu.be/4l87c2aeB4I') ] },
      { chapterId: 'chapter2', chapterOrder: 2, chapterTitle: 'Variables and Data Types', chapterContent: [
        lec(1, 'Understanding Variables', 20, 'https://youtu.be/pZQeBJsGoDQ', true), lec(2, 'Data Types in JavaScript', 10, 'https://youtu.be/ufHT2WEkkC4') ] },
    ],
    educator,
  },
  {
    courseTitle: 'Advanced Python Programming', category: 'Programming', coursePrice: 79.99, discount: 15,
    courseDescription: '<h2>Deep Dive into Python</h2><p>Decorators, generators and context managers.</p>',
    courseThumbnail: 'https://img.youtube.com/vi/HGOBQPFzWKo/maxresdefault.jpg',
    courseContent: [
      { chapterId: 'chapter1', chapterOrder: 1, chapterTitle: 'Advanced Data Structures', chapterContent: [
        lec(1, 'Lists and Tuples', 15, 'https://youtu.be/HGOBQPFzWKo', true), lec(2, 'Dictionaries and Sets', 18, 'https://youtu.be/daefaLgNkw0') ] },
    ],
    educator,
  },
  {
    courseTitle: 'MERN Stack Bootcamp', category: 'Web Development', coursePrice: 99, discount: 10,
    courseDescription: '<h2>Build full-stack apps</h2><p>MongoDB, Express, React and Node.js from scratch.</p>',
    courseThumbnail: 'https://img.youtube.com/vi/7CqJlxBYj-M/maxresdefault.jpg',
    courseContent: [
      { chapterId: 'chapter1', chapterOrder: 1, chapterTitle: 'Backend Basics', chapterContent: [
        lec(1, 'Express Fundamentals', 25, 'https://youtu.be/7CqJlxBYj-M', true), lec(2, 'Mongoose Models', 22, 'https://youtu.be/DZBGEVgL2eE') ] },
    ],
    educator,
  },
];

const run = async () => {
  await connectDB();
  const demo = [
    { _id: 'local_demo_admin', name: 'Demo Admin', email: 'admin@demo.com', role: 'admin' },
    { _id: 'local_demo_educator', name: 'Demo Educator', email: 'educator@demo.com', role: 'educator' },
    { _id: 'local_demo_student', name: 'Demo Student', email: 'student@demo.com', role: 'student' },
  ];
  const ids = demo.map((d) => d._id);
  const oldCourses = await Course.find({ educator: { $in: ids } }).select('_id');
  await Enrollment.deleteMany({ $or: [{ student: { $in: ids } }, { course: { $in: oldCourses.map((c) => c._id) } }] });
  await Course.deleteMany({ educator: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });

  const password = await bcrypt.hash('Password@123', 10);
  await User.insertMany(demo.map((d) => ({ ...d, password, authProvider: 'local' })));
  const created = await Course.insertMany(courses('local_demo_educator'));
  console.log(`🌱 Seeded ${demo.length} users and ${created.length} courses.`);
  console.log('   Demo logins (local auth, password "Password@123"): admin@demo.com, educator@demo.com, student@demo.com');
  await disconnectDB();
};
run().catch((e) => { console.error(e); process.exit(1); });

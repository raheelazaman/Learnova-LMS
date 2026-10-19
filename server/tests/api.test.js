import './setup.js';
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { Webhook } from 'svix';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';

const api = request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
let admin, educator, educator2, student, student2;
let courseId, chapterId, lectureId;

const reg = async (name, role) => {
  const r = await api.post('/api/auth/register').send({ name, email: `${name}@test.com`, password: 'secret123', role });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { token: r.body.token, id: r.body.user._id };
};

before(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await User.syncIndexes();
  educator = await reg('edu1', 'educator');
  educator2 = await reg('edu2', 'instructor'); // "instructor" is mapped to educator
  student = await reg('stu1');
  student2 = await reg('stu2', 'student');
  admin = await reg('boss');
  await User.updateOne({ _id: admin.id }, { role: 'admin' }); // admins cannot self-register
  const login = await api.post('/api/auth/login').send({ email: 'boss@test.com', password: 'secret123' });
  admin.token = login.body.token; // fresh token after promotion (role is read from DB anyway)
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});

describe('health & basics', () => {
  test('GET /api/health', async () => {
    const r = await api.get('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
  });
  test('unknown route → 404 JSON', async () => {
    const r = await api.get('/api/nope');
    assert.equal(r.status, 404);
    assert.equal(r.body.success, false);
  });
  test('malformed JSON → 400', async () => {
    const r = await api.post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    assert.equal(r.status, 400);
  });
});

describe('local auth (bcrypt + JWT)', () => {
  test('instructor registers as educator, admin role cannot be self-assigned', async () => {
    const u = await User.findById(educator2.id);
    assert.equal(u.role, 'educator');
    const r = await api.post('/api/auth/register').send({ name: 'Hack', email: 'h@test.com', password: 'secret123', role: 'admin' });
    assert.equal(r.status, 400); // zod enum rejects "admin"
  });
  test('password is hashed and never returned', async () => {
    const u = await User.findById(student.id).select('+password');
    assert.notEqual(u.password, 'secret123');
    assert.match(u.password, /^\$2[aby]\$/);
    const me = await api.get('/api/auth/me').set(auth(student.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.user.password, undefined);
  });
  test('duplicate email → 409', async () => {
    const r = await api.post('/api/auth/register').send({ name: 'Dup', email: 'stu1@test.com', password: 'secret123' });
    assert.equal(r.status, 409);
  });
  test('validation errors → 400 with details', async () => {
    const r = await api.post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: '123' });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.length >= 3);
  });
  test('wrong password → 401', async () => {
    const r = await api.post('/api/auth/login').send({ email: 'stu1@test.com', password: 'wrongpass' });
    assert.equal(r.status, 401);
  });
  test('no token / garbage token → 401', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401);
    assert.equal((await api.get('/api/auth/me').set(auth('garbage'))).status, 503); // non-local token → Clerk path, not configured in tests
  });
});

describe('courses & RBAC', () => {
  const payload = {
    courseTitle: 'Intro to Node',
    courseDescription: '<p>Learn Node.js from scratch</p>',
    category: 'Backend',
    coursePrice: 100,
    discount: 20,
    courseContent: [
      { chapterTitle: 'Basics', chapterContent: [
        { lectureTitle: 'What is Node', lectureDuration: 10, lectureUrl: 'https://youtu.be/abc123', isPreviewFree: true },
        { lectureTitle: 'Modules', lectureDuration: 15, lectureUrl: 'https://youtu.be/def456', isPreviewFree: false },
      ] },
    ],
  };

  test('student cannot create a course (403)', async () => {
    const r = await api.post('/api/courses').set(auth(student.token)).send(payload);
    assert.equal(r.status, 403);
  });
  test('unauthenticated cannot create a course (401)', async () => {
    assert.equal((await api.post('/api/courses').send(payload)).status, 401);
  });
  test('invalid course body → 400', async () => {
    const r = await api.post('/api/courses').set(auth(educator.token)).send({ courseTitle: 'x', coursePrice: -5 });
    assert.equal(r.status, 400);
  });
  test('educator creates a course, ids & orders are generated', async () => {
    const r = await api.post('/api/courses').set(auth(educator.token)).send(payload);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    courseId = r.body.course._id;
    assert.equal(r.body.course.educator, educator.id);
    chapterId = r.body.course.courseContent[0].chapterId;
    lectureId = r.body.course.courseContent[0].chapterContent[1].lectureId;
    assert.ok(chapterId && lectureId);
    assert.equal(r.body.course.courseContent[0].chapterContent[1].lectureOrder, 2);
  });
  test('multipart create with courseData JSON + thumbnail file', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const r = await api.post('/api/educator/add-course').set(auth(educator.token))
      .field('courseData', JSON.stringify({ ...payload, courseTitle: 'With Thumbnail' }))
      .attach('thumbnail', png, { filename: 't.png', contentType: 'image/png' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(r.body.course.courseThumbnail, /\/uploads\/.+\.png$/);
    const img = await api.get(new URL(r.body.course.courseThumbnail).pathname);
    assert.equal(img.status, 200);
    await api.delete(`/api/courses/${r.body.course._id}`).set(auth(educator.token));
  });
  test('non-image upload rejected', async () => {
    const r = await api.post('/api/educator/add-course').set(auth(educator.token))
      .field('courseData', JSON.stringify(payload))
      .attach('thumbnail', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    assert.equal(r.status, 400);
  });
  test('public list hides non-preview lecture URLs, populates educator', async () => {
    const r = await api.get('/api/courses');
    assert.equal(r.status, 200);
    const c = r.body.courses.find((x) => x._id === courseId);
    assert.equal(c.educator.name, 'edu1');
    const [free, paid] = c.courseContent[0].chapterContent;
    assert.equal(free.lectureUrl, 'https://youtu.be/abc123');
    assert.equal(paid.lectureUrl, '');
  });
  test('search / category filter, and /course/all alias', async () => {
    assert.equal((await api.get('/api/courses?search=node')).body.count, 1);
    assert.equal((await api.get('/api/courses?search=python')).body.count, 0);
    assert.equal((await api.get('/api/courses?category=backend')).body.count, 1);
    assert.equal((await api.get('/api/course/all')).body.count, 1);
  });
  test('GET /courses/:id and invalid / missing ids', async () => {
    assert.equal((await api.get(`/api/courses/${courseId}`)).status, 200);
    assert.equal((await api.get('/api/courses/not-an-id')).status, 400);
    assert.equal((await api.get(`/api/courses/${new mongoose.Types.ObjectId()}`)).status, 404);
  });
  test('another educator cannot edit/delete; owner & admin can', async () => {
    assert.equal((await api.put(`/api/courses/${courseId}`).set(auth(educator2.token)).send({ coursePrice: 1 })).status, 403);
    assert.equal((await api.delete(`/api/courses/${courseId}`).set(auth(educator2.token))).status, 403);
    const ok = await api.put(`/api/courses/${courseId}`).set(auth(educator.token)).send({ coursePrice: 120 });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.course.coursePrice, 120);
    const adm = await api.put(`/api/courses/${courseId}`).set(auth(admin.token)).send({ coursePrice: 100 });
    assert.equal(adm.status, 200);
    assert.equal((await api.put(`/api/courses/${courseId}`).set(auth(educator.token)).send({})).status, 400);
  });
  test('add chapter and lecture', async () => {
    const ch = await api.post(`/api/courses/${courseId}/chapters`).set(auth(educator.token)).send({ chapterTitle: 'Advanced' });
    assert.equal(ch.status, 201);
    const newChapterId = ch.body.course.courseContent[1].chapterId;
    const lec = await api.post(`/api/courses/${courseId}/chapters/${newChapterId}/lectures`).set(auth(educator.token))
      .send({ lectureTitle: 'Streams', lectureDuration: 20, lectureUrl: 'https://youtu.be/zzz999' });
    assert.equal(lec.status, 201);
    assert.equal(lec.body.course.courseContent[1].chapterContent.length, 1);
    assert.equal((await api.post(`/api/courses/${courseId}/chapters/nope/lectures`).set(auth(educator.token))
      .send({ lectureTitle: 'x', lectureDuration: 1 })).status, 404);
  });
});

describe('enrollment, progress, ratings', () => {
  test('POST /enroll requires auth and a valid course', async () => {
    assert.equal((await api.post('/api/enroll').send({ courseId })).status, 401);
    assert.equal((await api.post('/api/enroll').set(auth(student.token)).send({})).status, 400);
    assert.equal((await api.post('/api/enroll').set(auth(student.token)).send({ courseId: String(new mongoose.Types.ObjectId()) })).status, 404);
  });
  test('student enrolls; duplicate → 409; educator cannot enroll in own course', async () => {
    const r = await api.post('/api/enroll').set(auth(student.token)).send({ courseId });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.enrollment.amount, 80); // 100 - 20%
    assert.equal((await api.post('/api/enroll').set(auth(student.token)).send({ courseId })).status, 409);
    assert.equal((await api.post('/api/enroll').set(auth(educator.token)).send({ courseId })).status, 400);
    assert.equal((await api.post('/api/enroll').set(auth(student2.token)).send({ courseId })).status, 201);
  });
  test('GET /my-courses returns full lecture URLs', async () => {
    const r = await api.get('/api/my-courses').set(auth(student.token));
    assert.equal(r.status, 200);
    assert.equal(r.body.count, 1);
    assert.equal(r.body.enrolledCourses[0].courseContent[0].chapterContent[1].lectureUrl, 'https://youtu.be/def456');
    assert.equal((await api.get('/api/user/enrolled-courses').set(auth(student.token))).body.count, 1);
    assert.equal((await api.get('/api/my-courses').set(auth(educator2.token))).body.count, 0);
  });
  test('progress updates & is validated', async () => {
    const r = await api.post('/api/user/update-course-progress').set(auth(student.token)).send({ courseId, lectureId });
    assert.equal(r.status, 200);
    assert.equal(r.body.progress, 33); // 1 of 3 lectures
    await api.post('/api/user/update-course-progress').set(auth(student.token)).send({ courseId, lectureId });
    const g = await api.post('/api/user/get-course-progress').set(auth(student.token)).send({ courseId });
    assert.deepEqual(g.body.progressData.lectureCompleted, [lectureId]); // no duplicates
    assert.equal((await api.post('/api/user/update-course-progress').set(auth(student.token)).send({ courseId, lectureId: 'bogus' })).status, 400);
    assert.equal((await api.post('/api/user/update-course-progress').set(auth(educator2.token)).send({ courseId, lectureId })).status, 404);
  });
  test('rating: only enrolled, 1-5, updates in place', async () => {
    assert.equal((await api.post('/api/user/add-rating').set(auth(educator2.token)).send({ courseId, rating: 5 })).status, 403);
    assert.equal((await api.post('/api/user/add-rating').set(auth(student.token)).send({ courseId, rating: 9 })).status, 400);
    assert.equal((await api.post('/api/user/add-rating').set(auth(student.token)).send({ courseId, rating: 4 })).status, 200);
    assert.equal((await api.post('/api/user/add-rating').set(auth(student.token)).send({ courseId, rating: 5 })).status, 200);
    const c = await api.get(`/api/courses/${courseId}`);
    assert.equal(c.body.course.courseRatings.length, 1);
    assert.equal(c.body.course.courseRatings[0].rating, 5);
    assert.equal(c.body.course.enrolledStudents.length, 2);
  });
});

describe('educator & admin', () => {
  test('student cannot read educator dashboard; can become educator', async () => {
    assert.equal((await api.get('/api/educator/dashboard').set(auth(student2.token))).status, 403);
  });
  test('educator dashboard shape + earnings', async () => {
    const r = await api.get('/api/educator/dashboard').set(auth(educator.token));
    assert.equal(r.status, 200);
    const d = r.body.dashboardData;
    assert.equal(d.totalCourses, 1);
    assert.equal(d.totalEarnings, 160);
    assert.equal(d.enrolledStudentsData.length, 2);
    assert.ok(d.enrolledStudentsData[0].student.name);
    assert.equal(d.enrolledStudentsData[0].courseTitle, 'Intro to Node');
  });
  test('educator courses & enrolled students', async () => {
    assert.equal((await api.get('/api/educator/courses').set(auth(educator.token))).body.count, 1);
    const s = await api.get('/api/educator/enrolled-students').set(auth(educator.token));
    assert.equal(s.body.enrolledStudents.length, 2);
    assert.ok(s.body.enrolledStudents[0].purchaseDate);
  });
  test('become educator (student2 → educator)', async () => {
    const r = await api.post('/api/educator/update-role').set(auth(student2.token));
    assert.equal(r.body.role, 'educator');
    assert.equal((await api.get('/api/educator/dashboard').set(auth(student2.token))).status, 200);
  });
  test('admin routes are admin-only', async () => {
    assert.equal((await api.get('/api/admin/users').set(auth(educator.token))).status, 403);
    assert.equal((await api.get('/api/admin/analytics').set(auth(student.token))).status, 403);
  });
  test('admin lists users, filters by role, sees analytics', async () => {
    const u = await api.get('/api/admin/users').set(auth(admin.token));
    assert.equal(u.body.count, 5);
    assert.equal((await api.get('/api/admin/users?role=admin').set(auth(admin.token))).body.count, 1);
    assert.equal((await api.get('/api/admin/users?role=wizard').set(auth(admin.token))).status, 400);
    const a = await api.get('/api/admin/analytics').set(auth(admin.token));
    assert.equal(a.status, 200);
    assert.equal(a.body.analytics.revenue, 160);
    assert.equal(a.body.analytics.enrollments, 2);
    assert.equal(a.body.analytics.courses.total, 1);
    assert.equal(a.body.analytics.topCourses[0].enrollments, 2);
    assert.equal((await api.get('/api/admin/courses').set(auth(admin.token))).body.count, 1);
  });
  test('admin changes roles; cannot change/delete self', async () => {
    const r = await api.put(`/api/admin/users/${student.id}/role`).set(auth(admin.token)).send({ role: 'educator' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, 'educator');
    assert.equal((await api.put(`/api/admin/users/${admin.id}/role`).set(auth(admin.token)).send({ role: 'student' })).status, 400);
    assert.equal((await api.put(`/api/admin/users/${student.id}/role`).set(auth(admin.token)).send({ role: 'god' })).status, 400);
    assert.equal((await api.delete(`/api/admin/users/${admin.id}`).set(auth(admin.token))).status, 400);
    await api.put(`/api/admin/users/${student.id}/role`).set(auth(admin.token)).send({ role: 'student' });
  });
  test('admin deletes a student → enrollments & ratings cleaned up', async () => {
    const r = await api.delete(`/api/admin/users/${student.id}`).set(auth(admin.token));
    assert.equal(r.status, 200);
    const c = await api.get(`/api/courses/${courseId}`);
    assert.equal(c.body.course.enrolledStudents.length, 1);
    assert.equal(c.body.course.courseRatings.length, 0);
  });
  test('deleting a course removes its enrollments', async () => {
    assert.equal((await api.delete(`/api/courses/${courseId}`).set(auth(educator.token))).status, 200);
    assert.equal((await api.get(`/api/courses/${courseId}`)).status, 404);
    assert.equal((await api.get('/api/my-courses').set(auth(student2.token))).body.count, 0);
  });
});

describe('Clerk webhook', () => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const send = (event, { sign = true } = {}) => {
    const body = JSON.stringify(event);
    const id = 'msg_test_1';
    const ts = new Date();
    const sig = new Webhook(secret).sign(id, ts, body);
    const req = api.post('/api/webhooks/clerk').set('Content-Type', 'application/json');
    if (sign) req.set({ 'svix-id': id, 'svix-timestamp': String(Math.floor(ts.getTime() / 1000)), 'svix-signature': sig });
    return req.send(body);
  };
  const clerkUser = (over = {}) => ({
    id: 'user_clerk_1', first_name: 'Ada', last_name: 'Lovelace', image_url: 'https://img/x.png',
    primary_email_address_id: 'e1', email_addresses: [{ id: 'e1', email_address: 'Ada@Example.com' }],
    public_metadata: {}, ...over,
  });

  test('rejects unsigned / badly signed requests', async () => {
    assert.equal((await send({ type: 'user.created', data: clerkUser() }, { sign: false })).status, 400);
    const bad = await api.post('/api/webhooks/clerk').set({ 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,xx' })
      .set('Content-Type', 'application/json').send('{}');
    assert.equal(bad.status, 400);
  });
  test('user.created creates the user keyed by Clerk id', async () => {
    const r = await send({ type: 'user.created', data: clerkUser() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const u = await User.findById('user_clerk_1');
    assert.equal(u.name, 'Ada Lovelace');
    assert.equal(u.email, 'ada@example.com');
    assert.equal(u.role, 'student');
    assert.equal(u.authProvider, 'clerk');
  });
  test('user.updated syncs profile and publicMetadata.role; replay is idempotent', async () => {
    const r = await send({ type: 'user.updated', data: clerkUser({ first_name: 'Augusta', public_metadata: { role: 'admin' } }) });
    assert.equal(r.status, 200);
    const u = await User.findById('user_clerk_1');
    assert.equal(u.name, 'Augusta Lovelace');
    assert.equal(u.role, 'admin');
    assert.equal(await User.countDocuments({ email: 'ada@example.com' }), 1);
  });
  test('user.deleted removes the user', async () => {
    const r = await send({ type: 'user.deleted', data: { id: 'user_clerk_1', deleted: true } });
    assert.equal(r.status, 200);
    assert.equal(await User.findById('user_clerk_1'), null);
  });
});

# LMS Backend (Node.js + Express + MongoDB + Clerk)

REST API for the LMS in `../client`. Field names match the frontend's data shapes (`courseTitle`, `courseContent`, `chapterContent`, `enrolledStudents`, `dashboardData`, …).

## 1. Install
```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

## 2. MongoDB
- **Local:** install MongoDB Community, keep `MONGODB_URI=mongodb://127.0.0.1:27017/lms`.
- **Atlas:** create a free cluster → *Connect → Drivers* → paste the string into `MONGODB_URI` (replace user/password, add `/lms` before `?`). Allow your IP under *Network Access*.

## 3. Clerk
1. Dashboard → *API Keys*: put `CLERK_SECRET_KEY` (and `CLERK_PUBLISHABLE_KEY`) in `backend/.env`. Put the **same publishable key** in `client/.env` as `VITE_CLERK_PUBLISHABLE_KEY`.
2. `CLIENT_URL` must match the exact origin your React app runs on (default `http://localhost:5173`; `localhost` ≠ `127.0.0.1`). A mismatch makes Clerk tokens fail with 401.
3. **Webhook** (keeps MongoDB users in sync): Dashboard → *Webhooks → Add endpoint* → URL `https://<public-backend-url>/api/webhooks/clerk` → subscribe to `user.created`, `user.updated`, `user.deleted` → copy the *Signing Secret* into `CLERK_WEBHOOK_SECRET`.
   - Localhost isn't reachable by Clerk. Use a tunnel (`ngrok http 5000`) if you want to see webhooks locally.
   - **Without webhooks it still works:** on a user's first API call the backend creates their MongoDB record from Clerk automatically.
4. **Roles** live in MongoDB (`student` | `educator` | `admin`; *educator = Instructor*).
   - "Become Educator" button → `POST /api/educator/update-role`.
   - First admin: sign in once through the app, then `npm run make-admin -- you@example.com`
     (or set `{"role":"admin"}` in the user's *Public metadata* in the Clerk dashboard; the webhook applies it).

## 4. Run
```bash
npm run seed     # optional: demo users + 3 courses (see below)
npm run dev      # nodemon, or: npm start
```
API: `http://localhost:5000` · health check: `GET /api/health`

Seeded demo logins (local auth, password `Password@123`): `admin@demo.com`, `educator@demo.com`, `student@demo.com`.

## 5. Connect the frontend
1. `cd client && npm install axios`
2. Create `client/.env` (see `client/.env.example`): `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CURRENCY`, `VITE_BACKEND_URL=http://localhost:5000`.
3. `client/src/services/api.js` (new file) is an axios instance that adds the Clerk token to each request.
4. Replace `client/src/context/AppContext.jsx` with `docs/AppContext.connected.jsx` (all existing helpers kept; dummy data replaced with API calls). Your other pages are untouched.

## 6. Test
```bash
npm test      # 38 automated tests (needs a MongoDB; uses DB "lms_test", which it DROPS – override with TEST_MONGODB_URI)
```
Postman: import `postman/LMS-API.postman_collection.json` → run the collection (33 requests with assertions; tokens and ids are saved automatically). Or: `npx newman run postman/LMS-API.postman_collection.json`.
To call protected routes with a **Clerk** token, copy it from the browser console: `await window.Clerk.session.getToken()` and send `Authorization: Bearer <token>`.

## 7. API (prefix `/api`)
| Method & path | Access | Notes |
|---|---|---|
| `GET /health` | public | |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | public / auth | optional local bcrypt+JWT auth (see §9) |
| `GET /courses` (alias `/course/all`) | public | `?search=&category=`; non-preview lecture URLs hidden |
| `GET /courses/:id` | public | |
| `POST /courses` (alias `POST /educator/add-course`) | educator, admin | JSON, or multipart: `courseData` (JSON string) + `thumbnail` image |
| `PUT /courses/:id`, `DELETE /courses/:id` | owner educator, admin | |
| `POST /courses/:id/chapters`, `POST /courses/:id/chapters/:chapterId/lectures` | owner educator, admin | add lessons |
| `POST /enroll` `{courseId}` | any signed-in | 409 if already enrolled |
| `GET /my-courses` (alias `/user/enrolled-courses`) | signed-in | full lecture URLs |
| `GET /user/data` | signed-in | |
| `POST /user/update-course-progress`, `/user/get-course-progress`, `/user/add-rating` | enrolled student | |
| `POST /educator/update-role` | signed-in | become educator |
| `GET /educator/courses`, `/educator/dashboard`, `/educator/enrolled-students` | educator, admin | |
| `GET /admin/users`, `PUT /admin/users/:id/role`, `DELETE /admin/users/:id`, `GET /admin/courses`, `GET /admin/analytics` | admin | |
| `POST /webhooks/clerk` | Svix-signed | raw body, signature verified |

Errors are always `{ "success": false, "message": "...", "errors": [...] }` with proper status codes (400 validation, 401, 403, 404, 409).

## 8. Structure
```
backend/
├─ server.js  app.js
├─ config/       env.js  db.js
├─ models/       User  Course  Enrollment
├─ controllers/  auth  user  course  enrollment  educator  admin  webhook
├─ routes/       index + one file per module
├─ middleware/   auth (Clerk/JWT)  role guard  validate (zod)  upload (multer)  errorHandler
├─ utils/        validators  courseHelpers  cleanup  ApiError
├─ seed/         seed.js  makeAdmin.js
├─ tests/        api.test.js (node:test + supertest)
└─ postman/      LMS-API.postman_collection.json
```

## 9. Notes
- **Clerk vs. assignment text.** The assignment asks for JWT + bcrypt, `POST /register`, `POST /login`. You asked to keep Clerk, so Clerk is the primary auth. The small local bcrypt+JWT module is kept so those assignment endpoints exist; the middleware accepts either token type. Don't want it? Set `ENABLE_LOCAL_AUTH=false` (those routes then return 404).
- **Enrollment is free** (the assignment has no payments). `Enrollment.amount` stores the discounted price so educator earnings/admin revenue work.
- **Quizzes/assignments** are not implemented: neither the assignment nor the current frontend uses them.
- **Thumbnails** upload to `backend/uploads/` (disk). Free hosts wipe disk on redeploy; for deployment prefer a URL in `courseThumbnail` (YouTube thumbnails work, as in your dummy data) or add cloud storage.
- **Deploy:** deploy `backend/` (Render/Railway; start `npm start`, set the env vars, `CLIENT_URL` = your Vercel URL, add a Clerk webhook to the public URL) and set `VITE_BACKEND_URL` on the frontend host.

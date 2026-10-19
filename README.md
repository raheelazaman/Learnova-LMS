# Learnova LMS – MERN Stack Learning Management System

A full-stack Learning Management System where **students** browse and enroll in courses, **educators (instructors)** create and manage them, and **admins** manage users and view analytics.

> Final Project – MERN Stack Web Development (Hunarmand Punjab, Batch 3)

## Features
- Browse, search and view courses; free-preview lectures; course ratings
- Student: enroll, "My Enrollments", lecture progress tracking, rate courses
- Educator: create / edit / delete courses, add chapters and lectures, dashboard (earnings, enrollments, students)
- Admin: manage users and roles, view all courses, platform analytics
- Authentication with **Clerk** (+ optional local bcrypt/JWT login), **role-based authorization** (student / educator / admin) enforced by backend middleware
- Clerk **webhook** keeps MongoDB users in sync
- Input validation (Zod), consistent JSON error responses, rate-limited auth routes

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Axios |
| Backend | Node.js, Express 5 |
| Database | MongoDB + Mongoose |
| Auth | Clerk (session tokens + webhooks), bcryptjs + JWT (optional local auth) |
| Other | Zod, Multer, Helmet, CORS, Svix, node:test + Supertest, Postman |

## Project Structure
```
LMS/
├─ client/                  React + Vite frontend
│  └─ src/ components, pages, context, services/api.js
├─ backend/                 Express API
│  ├─ config/ models/ controllers/ routes/ middleware/ utils/
│  ├─ seed/  tests/  postman/
│  └─ server.js  app.js
└─ docs/                    AppContext.connected.jsx, POSTMAN_TESTING.md
```

## Installation

### Prerequisites
Node.js 18+, a MongoDB (local or Atlas), a free Clerk account.

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
```
Edit `backend/.env`:
| Variable | Meaning |
|---|---|
| `MONGODB_URI` | Local `mongodb://127.0.0.1:27017/lms` or your Atlas string |
| `CLIENT_URL` | Frontend origin, e.g. `http://localhost:5173` |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → endpoint signing secret |
| `JWT_SECRET` | Any long random string (used by optional local auth) |

```bash
npm run seed      # optional demo data
npm run dev       # http://localhost:5000
```

### 2. Frontend
```bash
cd client
npm install
npm install axios
copy .env.example .env        # then fill in values
```
`client/.env`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CURRENCY=$
VITE_BACKEND_URL=http://localhost:5000
```
Copy `docs/AppContext.connected.jsx` over `client/src/context/AppContext.jsx` to switch the app from dummy data to the real API, then:
```bash
npm run dev       # http://localhost:5173
```

### 3. Clerk webhook (optional locally)
Add an endpoint `https://<public-backend-url>/api/webhooks/clerk` for `user.created`, `user.updated`, `user.deleted`. Locally you need a tunnel (e.g. ngrok); without it, users are still created in MongoDB on their first API request.

### 4. First admin
Sign in once through the app, then: `cd backend && npm run make-admin -- you@example.com`

## Roles
| Role | Can do |
|---|---|
| Student | Browse, enroll, view enrolled courses, track progress, rate |
| Educator (Instructor) | Everything above + create/edit/delete **own** courses, add lectures, dashboard |
| Admin | Everything + manage users/roles, all courses, analytics |

## API Overview (prefix `/api`)
| Method | Route | Access |
|---|---|---|
| GET | `/health` | Public |
| POST | `/auth/register`, `/auth/login` | Public (optional local auth) |
| GET | `/auth/me`, `/user/data` | Signed-in |
| GET | `/courses`, `/courses/:id` | Public |
| POST | `/courses` | Educator, Admin |
| PUT / DELETE | `/courses/:id` | Owner educator, Admin |
| POST | `/courses/:id/chapters`, `/courses/:id/chapters/:chapterId/lectures` | Owner educator, Admin |
| POST | `/enroll` | Signed-in |
| GET | `/my-courses` | Signed-in |
| POST | `/user/update-course-progress`, `/user/get-course-progress`, `/user/add-rating` | Enrolled student |
| POST | `/educator/update-role` | Signed-in |
| GET | `/educator/courses`, `/educator/dashboard`, `/educator/enrolled-students` | Educator, Admin |
| GET | `/admin/users`, `/admin/courses`, `/admin/analytics` | Admin |
| PUT | `/admin/users/:id/role` | Admin |
| DELETE | `/admin/users/:id` | Admin |
| POST | `/webhooks/clerk` | Clerk (signature verified) |

Full request bodies and expected responses: **`docs/POSTMAN_TESTING.md`**.

## Testing
```bash
cd backend
npm test          # 38 automated API tests (uses DB "lms_test" and drops it)
```
Postman: import `backend/postman/LMS-API.postman_collection.json` and run the collection (33 requests with assertions).

## Deployment
- **Backend** (Render / Railway): root `backend`, start command `npm start`, set all env vars, `CLIENT_URL` = deployed frontend URL.
- **Frontend** (Vercel): root `client`, build `npm run build`, set `VITE_BACKEND_URL` to the deployed API and the Clerk publishable key.
- Add the deployed backend URL as the Clerk webhook endpoint.

## Screenshots
In Screenshots Folder.

## Author
_Raheela Sultana – Hunarmand Punjab, MERN Stack Batch 3_

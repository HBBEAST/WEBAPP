# ProjectFlow — Project Management App

Full-stack app with Auth, RBAC, Projects, Tasks, and Dashboard.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcryptjs |
| Deployment | Railway |

---

## Local Setup

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set up the database

Create a PostgreSQL database locally, then:

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET
```

### 3. Run migrations

```bash
cd backend
npx prisma migrate dev --name init
# or: npx prisma db push (for quick dev)
```

### 4. Start backend

```bash
cd backend
npm run dev   # runs on http://localhost:5000
```

### 5. Start frontend

```bash
cd frontend
npm run dev   # runs on http://localhost:5173
```

---

## API Reference

### Auth
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| POST | /api/auth/signup | name, email, password | No |
| POST | /api/auth/login | email, password | No |
| GET | /api/auth/me | — | Yes |

### Projects
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create (you become ADMIN) |
| GET | /api/projects/:id | Get with tasks + members |
| PUT | /api/projects/:id | Update — ADMIN only |
| DELETE | /api/projects/:id | Delete — ADMIN only |
| POST | /api/projects/:id/members | Add by email — ADMIN only |
| DELETE | /api/projects/:id/members/:uid | Remove — ADMIN only |

### Tasks
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | /api/tasks?projectId=xxx | Filter by status/assignee |
| POST | /api/tasks | Any member |
| PUT | /api/tasks/:id | Members update status; Admins update all |
| DELETE | /api/tasks/:id | Admin or task creator |

### Dashboard
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | /api/dashboard | Stats for current user |

---

## Deploy to Railway

### Step 1 — Create Railway account
Go to https://railway.app and sign up with GitHub.

### Step 2 — Create a new project
Click "New Project" → "Empty Project"

### Step 3 — Add PostgreSQL
In your project → "Add Service" → "Database" → "PostgreSQL"
Copy the `DATABASE_URL` from the Variables tab.

### Step 4 — Deploy Backend
1. "Add Service" → "GitHub Repo" → select your repo
2. Set **Root Directory** to `backend`
3. Set environment variables:
   ```
   DATABASE_URL=<from postgres service>
   JWT_SECRET=<random 32+ char string>
   FRONTEND_URL=<your frontend railway URL>
   PORT=5000
   ```
4. Railway auto-detects Dockerfile and builds

### Step 5 — Deploy Frontend
1. "Add Service" → "GitHub Repo" → same repo
2. Set **Root Directory** to `frontend`
3. Set environment variables:
   ```
   VITE_API_URL=https://<your-backend-railway-url>/api
   ```
4. Railway builds and deploys via Dockerfile

### Step 6 — Run migrations
In the backend service terminal (or add to Dockerfile CMD):
```bash
npx prisma migrate deploy
```
The Dockerfile already does this automatically before starting.

### Step 7 — Set FRONTEND_URL
Update `FRONTEND_URL` in backend to point to your deployed frontend URL.

---

## Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| Create project | ✅ | ✅ |
| Delete project | ✅ | ❌ |
| Invite members | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Update task (full) | ✅ | ❌ |
| Update task status | ✅ | ✅ |
| Delete own task | ✅ | ✅ |
| Delete any task | ✅ | ❌ |

---

## Project Structure

```
project-manager/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # DB models
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT + RBAC
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   ├── tasks.js
│   │   │   └── dashboard.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx  # Auth state
    │   ├── lib/
    │   │   └── api.js           # Axios client
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ProjectsPage.jsx
    │   │   └── ProjectDetailPage.jsx
    │   └── components/
    │       └── Layout.jsx       # Sidebar + nav
    ├── Dockerfile
    ├── nginx.conf
    └── package.json
```

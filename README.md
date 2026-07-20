# TaskFlow

A full-featured TODO application with hours tracking, multi-user support, and audit capabilities.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20TypeORM%20%7C%20MySQL%20%7C%20Tailwind-blue?style=for-the-badge)

## Features

### Task Management
- **Create, edit, and delete tasks** with title, description, and deadline
- **Task status workflow** — Pendente, Em Execução, Concluída, Cancelada (with status badges)
- **Tab filtering** — Active tasks, completed, and cancelled views with counts
- **Completion toggle** — Checkbox synced with status (marking complete sets status to Concluída)
- **Pagination** — 10 tasks per page in list views
- **Modal creation** — Dedicated modal for new tasks with date and time pickers

### Hours Tracking
- **Estimated vs executed hours** with automatic progress calculation
- **Progress bar** — Visual indicator with red overflow when hours exceed estimate
- **Overrun percentage** — Shows how much the task exceeded its estimated time
- **Time input** — HH:MM format for estimated hours and apontamento duration

### Apontamentos (Work Notes)
- **Work notes linked to each task** — Date, duration, and description per entry
- **Automatic hour rollup** — Executed hours update when apontamentos are added, edited, or removed
- **Apontamentos count** — Displayed on each task card
- **Dedicated panel** — Modal to list, add, and delete apontamentos per task

### Auto-Postpone
- **Automatic postponement count** when deadlines or hours are exceeded
- Triggers on deadline changes, overdue tasks, and hour overruns
- All postponements logged in the audit trail

### Audit Trail
- **Full tracking of all task changes** — Creation, updates, status changes, postponements, deletions
- **Apontamento events** — Added, updated, and removed entries with actor and payload
- Stored in `task_events` table with timestamp and username

### Authentication & Users
- **JWT authentication** — Secure login with bearer tokens (24h expiry)
- **Role-based access** — Admin and User roles
- **Per-user task isolation** — Each user sees only their own tasks
- **Default admin user** — Seeded automatically on first run (`admin` / `tsk123`)
- **User management (admin)** — Create, edit, and delete users with display names
- **User impersonation** — Admins can "login as" another user for support/debugging, with one-click return

### UI & UX
- **Dark theme** — Modern slate/indigo interface built with Tailwind CSS
- **Date picker** — Calendar widget for deadlines and apontamento dates
- **Toast notifications & confirmations** — SweetAlert2 for feedback and destructive action guards
- **Health indicator** — Live backend and database status (auto-refreshes every 10s)
- **Error boundary** — Graceful recovery from React rendering errors

### Security
- **Helmet** — HTTP security headers
- **CORS** — Configurable frontend origin
- **Rate limiting** — 200 requests/minute per IP
- **Input validation** — Zod schemas on all API endpoints
- **Password hashing** — bcrypt for user credentials

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js 20+ + Express + TypeORM |
| Database | MySQL 8 (Docker) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| API | REST |

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and adjust if needed
cp .env.example .env

# Start MySQL and the application
npm run dev
```

Access the app at **http://localhost:5173**

Default login: `admin` / `tsk123`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start MySQL (Docker), backend, and frontend |
| `npm run build` | Build backend and frontend for production |
| `npm run start` | Run production backend |
| `npm run down` | Stop Docker containers |
| `npm run lint` | Run ESLint on backend and frontend |
| `npm run format` | Format code with Prettier |
| `./smoke-test.sh` | Run API smoke test (health, login, CRUD) |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend port |
| `JWT_SECRET` | — | Secret for JWT signing |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3305` | MySQL port (Docker maps 3305→3306) |
| `DB_USER` | `todo` | MySQL user |
| `DB_PASSWORD` | `todo` | MySQL password |
| `DB_NAME` | `todo` | Database name |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `VITE_API_URL` | `http://localhost:4000` | Frontend API base URL |

### Services

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- MySQL: `127.0.0.1:3305`

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Backend and DB status |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/users` | Admin | List users |
| POST | `/auth/users` | Admin | Create user |
| PUT | `/auth/users/:id` | Admin | Update user |
| DELETE | `/auth/users/:id` | Admin | Delete user and their tasks |
| POST | `/auth/impersonate` | Admin | Get token as another user |
| GET | `/tasks` | User | List own tasks |
| POST | `/tasks` | User | Create task |
| PUT | `/tasks/:id` | User | Update task |
| DELETE | `/tasks/:id` | User | Delete task |
| GET | `/tasks/:id/apontamentos` | User | List apontamentos |
| POST | `/tasks/apontamentos` | User | Create apontamento |
| PUT | `/tasks/apontamentos/:id` | User | Update apontamento |
| DELETE | `/tasks/apontamentos/:id` | User | Delete apontamento |

## Project Structure

```
todo/
├── backend/          # Express API + TypeORM entities
├── frontend/         # React + Vite SPA
├── docker-compose.yml
├── smoke-test.sh     # API integration smoke test
└── package.json      # Monorepo root (npm workspaces)
```

### 💖 Support the Project

If you enjoy this project and want to support its development, consider buying me a coffee!

<div align="center">

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-FF5E5B?logo=ko-fi&logoColor=white&style=for-the-badge)](https://ko-fi.com/laurorafael)

<a href="https://ko-fi.com/laurorafael">
  <img src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy Me a Coffee at ko-fi.com" height="50" />
</a>

</div>

---

Built with care by [Lauro Rafael](https://github.com/laurorafael)

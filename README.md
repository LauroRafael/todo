# TaskFlow

A full-featured TODO application with hours tracking and audit capabilities.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20TypeORM%20%7C%20MySQL%20%7C%20Tailwind-blue?style=for-the-badge)

## Features

- **Task Management** — Create, edit, and track tasks with deadlines
- **Hours Tracking** — Estimated vs executed hours with automatic progress calculation
- **Apontamentos** — Work notes linked to each task
- **Auto-Postpone** — Automatic postponement count when deadlines or hours are exceeded
- **Audit Trail** — Full tracking of all task changes

## Quick Start

```bash
# Install dependencies
npm install

# Start MySQL and the application
npm run dev
```

Access the app at **http://localhost:5173**

## Tech Details

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeORM |
| Database | MySQL 8 (Docker) |
| API | REST |

## Environment

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- MySQL: `127.0.0.1:3305`
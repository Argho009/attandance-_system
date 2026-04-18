# CAMS — College Attendance Management System

A production-ready College Attendance Management System built with:
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Cloudflare Pages Functions (Edge API)
- **Database**: Cloudflare D1 (SQLite at the Edge)
- **Deployment**: Cloudflare Pages (Free tier)

## 🚀 Local Development

```bash
npm install
npm run dev
```

## 🗄️ Database Setup

Initialize the D1 database (run once):

```bash
# Create tables
npx wrangler d1 execute cams-db --remote --file=./supabase/migrations/d1_schema.sql

# Seed admin account (ID: ADMIN123, Pass: 123)
npx wrangler d1 execute cams-db --remote --file=./functions/api/db/seed.sql
```

## 📦 Deploy

Push to GitHub — Cloudflare Pages will auto-deploy.

Set these environment variables in Cloudflare Pages dashboard:
- `JWT_SECRET` → any long random string (e.g. `my-super-secret-key-2024`)

## 🔑 Default Admin Account

| Field | Value |
|---|---|
| College ID | `ADMIN123` |
| Password | `123` |

## 👥 Roles

- **Admin** — Full system control, user provisioning
- **HOD** — Attendance oversight, leave approvals
- **Teacher** — Mark attendance, manage lectures
- **Student** — View attendance, marks, notices

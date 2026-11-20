# Meta Lead Ads CRM - Final README

## Overview

Meta Lead Ads CRM is a full‑stack application for Meta (Facebook) Lead Ads with:

- **JWT authentication** + **role‑based access control** (`admin`, `manager`, `sales_exec`)
- **SQLite** persistence with migration files (compatible with PostgreSQL migration style) and **demo mode**
- **Meta Graph API integration**: webhook receive/verify with HMAC, idempotent lead upsert, duplicate detection, automatic retry queue, manual sync, settings wizard, and connection test
- **Dashboard analytics** (totals, by status, conversion rate, by executive, by campaign, follow‑ups due, recent activity)
- **In‑app notifications**
- **React client** (Vite + Tailwind): Dashboard, Leads list, Lead detail, Kanban pipeline, Meta settings, Users admin, Notifications

## Prerequisites

- Node.js >= 20
- npm

## Quick start (local development)

```bash
cd meta-crm
npm install
cp .env.example .env
# populate MASTER_KEY, JWT_SECRET, and Meta credentials in .env
npm run migrate
npm run seed        # inserts demo data (admin, manager, sales_exec, 25 leads, etc.)
npm run dev        # starts server (4000) + client (5173)
```

### Demo mode

When `DEMO_MODE=true` (default), the first time the DB is empty the `seed` script runs automatically.

## API endpoints (base URL: `http://localhost:4000`)

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/auth/register` | First user created becomes admin |
| POST   | `/api/auth/login` | Obtain JWT token |
| GET    | `/api/auth/me` | Current user info |

### Leads

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/leads` | List leads (role‑filtered, search, pagination) |
| GET    | `/api/leads/:id` | Lead detail (includes notes & activity) |
| POST   | `/api/leads` | Create manual lead (admin/manager) |
| PATCH  | `/api/leads/:id` | Update status / assign / follow‑up / custom fields |
| DELETE | `/api/leads/:id` | Delete lead (admin only) |
| POST   | `/api/leads/:id/notes` | Add note |
| DELETE | `/api/leads/:id/notes/:noteId` | Delete note (admin/manager) |
| GET    | `/api/leads/:id/activities` | List activity timeline |

### Dashboard & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/dashboard/summary` | Aggregated stats (filtered by role) |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/notifications` | List notifications (user‑specific) |
| POST   | `/api/notifications/:id/read` | Mark as read |
| POST   | `/api/notifications/read-all` | Mark all as read |

### Users (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/users` | List all users |
| POST   | `/api/users` | Create new user |
| PATCH  | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user (admin, prevents last admin) |

### Meta Integration (webhook + settings)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/meta/webhook` | Verify webhook (returns challenge) |
| POST   | `/api/meta/webhook` | Receive lead events (HMAC signature required) |
| GET    | `/api/meta/settings` | Get Meta configuration (admin) |
| PUT    | `/api/meta/settings` | Update Meta configuration (admin) |
| POST   | `/api/meta/test` | Test Meta connection (admin) |
| POST   | `/api/meta/sync` | Manually pull leads from a form (admin/manager) |

### Scripts (in `package.json`)

- `npm run dev`: start server + client concurrently
- `npm run migrate`: run SQLite migrations (`server/migrations/*.sql`)
- `npm run seed`: insert demo data (or auto‑seeds in demo mode if DB empty)
- `npm run build`: build client + server
- `npm start`: run the server in production

## Security & Architecture notes

- **Secrets** (`app_secret`, `page_access_token`) are encrypted at rest using AES‑256‑GCM (`MASTER_KEY` from `.env`). They are never returned by any API (masked as `***`).
- **Webhook** HMAC‑SHA256 signature verification (`X-Hub-Signature-256`) with timing‑safe comparison.
- **Helmet**, **CORS** (origin from env), **rate‑limit** on auth + webhook + general requests.
- **Zod** validation on all bodies/queries/params; custom `AppError` with status codes.
- **RBAC** enforced via `requireRole` middleware and frontend route guards.
- **Demo mode**: `npm run seed` or `DEMO_MODE=true npm run dev` creates:
  - 3 users (`admin@example.com` / `demo123`, `manager@example.com` / `mgr123`, `exec@example.com` / `exec123`)
  - 25 sample leads across 5 campaigns and 6 statuses
  - Notes, activities, meta_forms entries
  - Settings for Meta (masked)

## Architecture layout

```
meta-crm/
├── server/
│   ├── src/
│   │   ├── config/               # env validation (zod)
│   │   ├── db/                   # connection, migrate, seed
│   │   ├── middleware/           # auth, rbac, validate, errorHandler, rateLimit
│   │   ├── routes/               # auth, leads, meta, dashboard, notifications, users
│   │   ├── services/             # metaGraph, leadService, crypto, activity, notification, queue, metaSync
│   │   ├── utils/                # logger, errorCodes
│   │   └── index.js              # express app + boot
│   ├── migrations/               # *.sql (knox‑style)
│   ├── package.json
│
├── client/
│   ├── src/
│   │   ├── components/           # layout, stats, badge, input, etc.
│   │   ├── hooks/                # useAuth, useLeads, etc.
│   │   ├── pages/                # dashboard, leads, lead‑detail, pipeline, settings‑meta, settings‑users, notifications, login, register
│   │   ├── lib/                  # api client, types
│   │   ├── App.jsx, main.jsx, index.css, components/ …
│   └── package.json
│
├── README.md
├── package.json (workspaces)
└── .env.example
```

## Troubleshooting

- **Node permissions**: If `node: Permission denied` occurs, the Linux environment may not be available. Run `env_status` for details.
- **Missing dependencies**: Ensure `npm install` completes; if stuck, increase timeout or run `npm install --no-bin-links` manually.
- **Migration failures**: Check that SQLite pragmas (`journal_mode`, `foreign_keys`) are set; ensure `better-sqlite3` is installed.
- **Meta webhook signature mismatch**: Verify that `META_APP_SECRET` matches the one configured in Meta Business Suite and that the `X-Hub-Signature-256` header is being forwarded correctly.
- **Client cannot reach server**: By default Vite proxies `/api` to `http://localhost:4000`. If the server is on a different port (see `PORT` env var), adjust the proxy in `client/vite.config.ts`.

## Future enhancements (roadmap)

- Full PostgreSQL support with `node-pg`.
- Email / phone deduplication across Meta leads (merge multiple records).
- Advanced analytics dashboard with filters and export.
- Mobile push notifications (FCM) for new/assigned leads.
- API documentation (OpenAPI/Swagger) and automated tests.

## License

Private.

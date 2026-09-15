# Daloft People
> **Enterprise HR & Workforce Operations Platform**
> Built for Daloft Aerospace Private Limited.

A full-stack HR management system with role-based access control, geofence attendance, leave management, inventory tracking, task assignment, audit logging, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router |
| Backend | Spring Boot 3.3, Java 17, Spring Security + JWT |
| Database | PostgreSQL (Supabase or self-hosted) + Flyway migrations |
| Email | Brevo (Sendinblue) transactional email |

---

## Roles

| Role | Access |
|---|---|
| `SYSTEM_ADMIN` | Full platform governance — org structure, HR admins, security, audit, system settings |
| `HR_ADMIN` | Delegated HR operations — people, attendance, leave, inventory, tasks, announcements |
| `MANAGER` | Team-scoped — leave approvals, attendance corrections, team tasks |
| `EMPLOYEE` | Self-service — clock in/out, leave requests, inventory requests, damage reports |

---

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- PostgreSQL database (local or [Supabase](https://supabase.com))

---


## Project Structure

```
D-HRM/
├── .env.example                 Root reference for all variables
├── .gitignore
├── RUN-PROJECT.ps1              Windows one-click start script
│
├── backend/                     Spring Boot API (Java 17 / Maven)
│   ├── .env                     ← your secrets (gitignored)
│   ├── .env.example             ← safe template (committed)
│   └── src/main/
│       ├── java/com/ems/
│       │   ├── controller/      REST endpoints
│       │   ├── service/         Business logic
│       │   ├── model/           JPA entities
│       │   ├── repository/      Spring Data repositories
│       │   ├── security/        JWT filter + util
│       │   ├── filter/          Maintenance, audit, admin-access filters
│       │   └── dto/             Request / response objects
│       └── resources/
│           ├── application.properties   All values read from env vars
│           └── db/migration/            Flyway SQL migrations
│
└── frontend/                    React 18 + Vite
    ├── .env                     ← your config (gitignored)
    ├── .env.example             ← safe template (committed)
    ├── vite.config.js           Proxy reads VITE_BACKEND_ORIGIN from .env
    └── src/
        ├── api/api.jsx          Fetch wrapper + 15 s GET cache
        ├── context/AuthContext.jsx  JWT session state
        └── components/          Dashboards, modules, shell
```

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.

### Backend (`backend/.env`)

```
DB_URL              PostgreSQL JDBC URL
DB_USERNAME         Database user
DB_PASSWORD         Database password
JWT_SECRET          ≥64-char random secret (openssl rand -hex 64)
JWT_EXPIRATION_MS   Token TTL in ms (default: 86400000 = 24 h)
BREVO_API_KEY       Brevo API key for transactional email
BREVO_SENDER_EMAIL  From address for system emails
APP_FRONTEND_URL    Frontend origin for email links
CORS_ALLOWED_ORIGINS Comma-separated allowed CORS origins
ADMIN_EMPLOYEE_ID   Bootstrap admin ID (default: SYS001)
ADMIN_PASSWORD      Bootstrap admin password
GEOFENCE_ENABLED    true/false — GPS check-in enforcement
FLYWAY_ENABLED      true/false — run DB migrations on startup
```

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL      API base path (/api in dev, full URL in prod)
VITE_BACKEND_ORIGIN    Vite proxy target (local dev only)
VITE_APP_NAME          App display name
```

---

## Security Notes

- Passwords are hashed with **BCrypt** — never stored or returned in plaintext.
- JWTs are stateless and signed with `JWT_SECRET` — use a strong, unique value per deployment.
- All `/api/admin/**` and `/api/system-admin/**` routes enforce role checks **server-side**.
- The `AdminAccessFilter` enforces granular HR permission bitmaps delegated by SYSTEM_ADMIN.
- Maintenance mode (settable by SYSTEM_ADMIN) blocks all non-admin requests at the filter level.
- Audit logging records every mutating API call with actor, method, path, and timestamp.

---

## Database Migrations

Flyway manages schema versioning. Migrations live in `backend/src/main/resources/db/migration/`.
On startup, Flyway applies any pending migrations automatically.

To disable migrations (e.g. for a read-only replica), set `FLYWAY_ENABLED=false`.

---

## GitHub Actions (CI) — Recommended Secrets

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret name | Value |
|---|---|
| `DB_URL` | Production JDBC URL |
| `DB_USERNAME` | Production DB user |
| `DB_PASSWORD` | Production DB password |
| `JWT_SECRET` | Production JWT secret |
| `BREVO_API_KEY` | Brevo API key |
| `ADMIN_PASSWORD` | Initial admin password |

# Daloft People — D-HRM

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


| Variable | Required | Description |
|---|---|---|
| `DB_URL` | ✅ | PostgreSQL JDBC URL |
| `DB_USERNAME` | ✅ | Database username |
| `DB_PASSWORD` | ✅ | Database password |
| `JWT_SECRET` | ✅ | Min 64-char random string — `openssl rand -hex 64` |
| `ADMIN_PASSWORD` | ✅ | Bootstrap SYSTEM_ADMIN password (first run only) |
| `BREVO_API_KEY` | ⬜ | Brevo API key (password reset emails) |
| `BREVO_SENDER_EMAIL` | ⬜ | Sender address for emails |
| `CORS_ALLOWED_ORIGINS` | ⬜ | Comma-separated frontend origins |
| `GEOFENCE_ENABLED` | ⬜ | `true` to enable GPS check-in |



Default values work for local development (Vite proxy forwards `/api` → backend).
For production, set `VITE_API_BASE_URL` to your deployed backend URL.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Backend API base path |
| `VITE_BACKEND_ORIGIN` | `http://127.0.0.1:8080` | Vite dev proxy target |

---




```bash
# Terminal 1 — Backend
cd backend
# Load .env (Linux/macOS)
export $(grep -v '^#' .env | xargs)
mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api |

---

 First login

On first startup the bootstrap SYSTEM_ADMIN account is created using the values in `.env`:

```
Employee ID:  SYS001          (or your ADMIN_EMPLOYEE_ID)
Password:     (your ADMIN_PASSWORD)
```

> Change the password immediately after first login.

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

## GitHub Actions (CI) 

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret name | Value |
|---|---|
| `DB_URL` | Production JDBC URL |
| `DB_USERNAME` | Production DB user |
| `DB_PASSWORD` | Production DB password |
| `JWT_SECRET` | Production JWT secret |
| `BREVO_API_KEY` | Brevo API key |
| `ADMIN_PASSWORD` | Initial admin password |

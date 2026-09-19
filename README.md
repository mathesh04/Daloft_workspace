# Daloft People
 **Enterprise HR & Workforce Operations Platform**
 Built for Daloft Aerospace Private Limited.

A full-stack HR management system with role-based access control, geofence attendance, leave management, inventory tracking, task assignment, audit logging, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router |
| Backend | Spring Boot 3.3, Java 17, Spring Security + JWT |
| Database | PostgreSQL (Supabase) + Flyway migrations |
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



---

## Security Notes

- Passwords are hashed with **BCrypt** — never stored or returned in plaintext.
- JWTs are stateless and signed with `JWT_SECRET` — use a strong, unique value per deployment.
- All `/api/admin/**` and `/api/system-admin/**` routes enforce role checks **server-side**.
- The `AdminAccessFilter` enforces granular HR permission bitmaps delegated by SYSTEM_ADMIN.
- Maintenance mode (settable by SYSTEM_ADMIN) blocks all non-admin requests at the filter level.
- Audit logging records every mutating API call with actor, method, path, and timestamp.

---

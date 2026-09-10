# 🐳 Docker Setup — D-HRM (Daloft People)

Run the full HRM stack (backend + frontend) with a single command and let any device on your office WiFi access it.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and **running**
- The project root `.env` file (already present with your Supabase credentials)

---

## First-Time Setup

### 1 — Find your machine's Wi-Fi IP

Open **PowerShell** and run:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi*" }
```
> Example result: `192.168.0.177`

### 2 — Create your Docker env file

```powershell
Copy-Item .env.docker.example .env.docker
notepad .env.docker
```

Replace `192.168.X.X` with your actual Wi-Fi IP:
```env
APP_FRONTEND_URL=http://192.168.0.177
FRONTEND_RESET_PASSWORD_URL=http://192.168.0.177/reset-password
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://192.168.*.*
```

> **Note:** `.env.docker` is git-ignored. You only need to create it once (or update it if your IP changes).

---

## Running the App

### Start (first time or after code changes)
```powershell
docker compose up --build
```

### Start (no code changes — fast)
```powershell
docker compose up
```

### Stop
```powershell
docker compose down
```

---

## Accessing the App

| Device | URL |
|---|---|
| This PC | `http://localhost` |
| Any device on office WiFi | `http://192.168.0.177` |

> **Windows Firewall:** If other devices can't connect, allow port 80:
> ```powershell
> # Run as Administrator
> New-NetFirewallRule -DisplayName "HRM App Port 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
> ```

---

## Architecture

```
[Employee Browser on WiFi]
         |
         v  http://192.168.0.177:80
  +------------------+
  |  Nginx (port 80) |  <- serves React static files
  |  hrm-frontend    |  <- proxies /api/* -> backend:8080
  +--------+---------+
           |  Docker internal network (hrm-net)
           v
  +------------------+
  |  Spring Boot     |  <- port 8080 (internal only)
  |  hrm-backend     |
  +--------+---------+
           |
           v  (unchanged - cloud)
   Supabase PostgreSQL
```

---

## Useful Commands

```powershell
# View live logs from both services
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Rebuild only the backend image
docker compose up --build backend

# Open a shell inside the backend container (debugging)
docker exec -it hrm-backend sh

# Check container status
docker compose ps
```

---

## Updating the App

After any code change:
```powershell
docker compose up --build
```
Docker only rebuilds layers that changed (dependencies are cached).

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `cannot connect to Docker daemon` | Make sure Docker Desktop is open and running |
| Port 80 already in use | Stop IIS/other web servers, or change the port in `docker-compose.yml` from `"80:80"` to `"8090:80"` |
| Other devices can't connect | Check Windows Firewall — see firewall command above |
| Backend fails to start | Run `docker compose logs backend` to see the error |
| IP changed (reconnected WiFi) | Update `APP_FRONTEND_URL` in `.env.docker` and re-run `docker compose up --build frontend` |

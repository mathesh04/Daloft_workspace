$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Load backend .env into the current process ────────────────────────────────
$backendEnv = Join-Path $root "backend\.env"
if (Test-Path $backendEnv) {
    Get-Content $backendEnv | Where-Object { $_ -match "^\s*[^#].*=.*" } | ForEach-Object {
        $key, $val = $_ -split "=", 2
        [System.Environment]::SetEnvironmentVariable($key.Trim(), $val.Trim(), "Process")
    }
    Write-Host "[env] Loaded backend/.env" -ForegroundColor Cyan
} else {
    Write-Warning "backend/.env not found. Copy backend/.env.example to backend/.env and fill in your values."
}

# ── Start backend (Spring Boot) ────────────────────────────────────────────────
$backendCmd = "Set-Location '$root\backend'; " +
    "Get-Content '.env' | Where-Object { `$_ -match '^\s*[^#].*=.*' } | " +
    "ForEach-Object { `$k,`$v = `$_ -split '=',2; [System.Environment]::SetEnvironmentVariable(`$k.Trim(),`$v.Trim(),'Process') }; " +
    "mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# ── Wait for backend to initialise ────────────────────────────────────────────
Start-Sleep -Seconds 10

# ── Start frontend (Vite / React) ─────────────────────────────────────────────
$frontendCmd = "Set-Location '$root\frontend'; npm install --legacy-peer-deps; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "✓ Backend  → http://localhost:8080" -ForegroundColor Green
Write-Host "✓ Frontend → http://localhost:3000" -ForegroundColor Green

@echo off
setlocal
start "EMS Backend" cmd /k "cd /d %~dp0backend && mvn spring-boot:run"
timeout /t 5 >nul
start "EMS Frontend" cmd /k "cd /d %~dp0frontend && npm install --legacy-peer-deps && npm start"
echo Started backend and frontend in separate windows.
echo Backend: http://localhost:8080
pause

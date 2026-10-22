@echo off
title Smart CCTV Guardian - System Launcher
echo ====================================================
echo    SMART CCTV GUARDIAN - MULTI-PLATFORM LAUNCHER
echo ====================================================
echo Starting Backend AI Engine...
start "CCTV Backend" /d "%~dp0\backend" cmd /c ".\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend & Mobile Web Server...
start "CCTV Web Server" /d "%~dp0\frontend" cmd /c "npm run dev -- --host"

echo Waiting for servers to initialize...
timeout /t 3 /nobreak > nul

echo Launching PC Desktop Window...
cd /d "%~dp0\frontend"
npm run desktop

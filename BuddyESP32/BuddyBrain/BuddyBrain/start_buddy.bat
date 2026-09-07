@echo off
cd /d "%~dp0"

echo Starting BuddyBrain server...
start "BuddyBrain Server" cmd /k "call venv\Scripts\activate.bat && python app.py"

echo Waiting for server to start...
timeout /t 4 /nobreak >nul

start "" http://localhost:5000

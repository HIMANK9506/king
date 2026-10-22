@echo off
title Smart CCTV Guardian - Master Console
:MENU
cls
echo ================================================================
echo           SMART CCTV GUARDIAN - 3-WAY SYSTEM LAUNCHER
echo ================================================================
echo.
echo   [1] Launch PC Desktop App (Software Window via Electron)
echo   [2] Launch Full System (AI Backend + Web Server + Desktop App)
echo   [3] Launch Web & Mobile Server Only (Port 5173 / Port 8000)
echo   [4] Connect Remote Camera or View Device Code
echo   [5] Push Project to GitHub
echo   [6] Stop All CCTV Processes & Release Camera
echo   [0] Exit
echo.
echo ================================================================
set /p opt="Select an option (0-6): "

if "%opt%"=="1" (
    call "%~dp0Launch-Desktop-App.bat"
    goto MENU
)
if "%opt%"=="2" (
    call "%~dp0start-all.bat"
    goto MENU
)
if "%opt%"=="3" (
    echo Starting Backend and Web Server...
    start "CCTV Backend" /d "%~dp0backend" cmd /c ".\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    start "CCTV Web Server" /d "%~dp0frontend" cmd /c "npm run dev -- --host"
    timeout /t 3 /nobreak > nul
    start http://localhost:5173
    goto MENU
)
if "%opt%"=="4" (
    echo.
    echo NVR Unique Station Verification Code:
    type "%~dp0backend\data\device.json" 2>nul
    echo.
    pause
    goto MENU
)
if "%opt%"=="5" (
    call "%~dp0push_to_github.bat"
    goto MENU
)
if "%opt%"=="6" (
    call "%~dp0stop-all.bat"
    goto MENU
)
if "%opt%"=="0" exit
goto MENU

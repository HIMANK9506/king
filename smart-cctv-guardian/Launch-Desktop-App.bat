@echo off
title Smart CCTV Guardian - Desktop Launcher
cd /d "%~dp0"

echo ========================================================
echo    SMART CCTV GUARDIAN - DESKTOP SOFTWARE APP (WAY 1)
echo ========================================================
echo.

:: 1. Check if backend is running on port 8000
powershell -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 8000); $client.Connected } catch { $false } finally { $client.Dispose() }" > "%TEMP%\cctv_port.txt"
set /p PORT_OPEN=<"%TEMP%\cctv_port.txt"
del "%TEMP%\cctv_port.txt" >nul 2>&1

if "%PORT_OPEN%"=="True" (
    echo [OK] AI Engine backend already active on port 8000.
) else (
    echo [STARTING] Launching AI Backend engine in background...
    start "CCTV AI Backend" /min cmd /c "cd /d ""%~dp0backend"" && .\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000"
    echo [WAIT] Initializing camera drivers...
    timeout /t 3 /nobreak > nul
)

:: 2. Launch Native Windows Electron Desktop App
echo.
echo [LAUNCHING] Opening Smart CCTV Guardian Desktop Window...
cd /d "%~dp0frontend"
call npx electron electron/main.cjs

echo.
echo Desktop window closed.
pause

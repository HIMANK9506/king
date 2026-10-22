@echo off
title Smart CCTV Guardian - Shutdown
echo ====================================================
echo    Stopping Smart CCTV Guardian Services
echo ====================================================
echo.
echo Closing Python AI Backend processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo Closing Electron and Node processes...
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

echo.
echo [DONE] All cameras released and background servers stopped cleanly.
timeout /t 2 /nobreak > nul

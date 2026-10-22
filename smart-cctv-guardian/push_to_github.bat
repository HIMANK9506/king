@echo off
title Push Smart CCTV Guardian to GitHub
cd /d "%~dp0"
echo ========================================================
echo   Pushing Smart CCTV Guardian to GitHub
echo   Target: https://github.com/HIMANK9506/smart-cctv-guardian
echo ========================================================
echo.
git push -u origin master
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Smart CCTV Guardian pushed successfully to GitHub!
) else (
    echo.
    echo [NOTE] If repository does not exist yet on GitHub:
    echo        1. Go to https://github.com/new
    echo        2. Create a new repository named: smart-cctv-guardian
    echo        3. Run this script again!
)
echo.
pause

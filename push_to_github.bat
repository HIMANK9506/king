@echo off
title Push King Portfolio to GitHub
cd /d "C:\Users\Techcho\Desktop\git.hub"
echo ========================================================
echo   Pushing King Portfolio to https://github.com/HIMANK9506/king
echo ========================================================
git push -u origin main
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Portfolio pushed successfully to GitHub!
) else (
    echo.
    echo [NOTE] If you were prompted to sign in, please complete the browser login.
)
echo.
pause

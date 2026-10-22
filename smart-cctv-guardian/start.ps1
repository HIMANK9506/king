# Smart CCTV Guardian — Unified Launch Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Smart CCTV Guardian (Backend + Frontend)     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend in new process
Write-Host "[1/2] Launching FastAPI Detection Server on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; .\venv\Scripts\activate; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend in new process
Write-Host "[2/2] Launching React Vite Dashboard on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev"

Write-Host "`nSystem initiated! Open http://localhost:5173 in your browser." -ForegroundColor Yellow

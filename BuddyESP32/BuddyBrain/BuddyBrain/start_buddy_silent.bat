@echo off
cd /d "%~dp0"
start "" /min venv\Scripts\pythonw.exe app.py > buddy_log.txt 2>&1

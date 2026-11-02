@echo off
title Hospital Management System Launcher
echo ==========================================================
echo    Starting AI-Based Hospital Management System (HMS)
echo ==========================================================

echo [1/3] Starting ML Service (port 8000)...
start "HMS - ML Microservice" cmd /k "cd ml-service && .\.venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload"

echo [2/3] Starting Backend API (port 5000)...
start "HMS - Backend API" cmd /k "cd backend && npm run dev"

echo [3/3] Starting Frontend (port 3000)...
start "HMS - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================================
echo All services launched!
echo Frontend:   http://localhost:3000
echo Backend:    http://localhost:5000
echo ML Service: http://localhost:8000
echo ==========================================================
pause

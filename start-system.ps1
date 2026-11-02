# ==============================================================================
# AI-Based Hospital Management System - Master Startup Script
# ==============================================================================
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting AI-Based Hospital Management System (HMS)     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Python FastAPI ML Microservice on port 8000
Write-Host "`n[1/3] Starting ML Disease Prediction Service on http://localhost:8000 ..." -ForegroundColor Green
$mlProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd ml-service; .\.venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload" -PassThru

# 2. Start Express Backend on port 5000
Write-Host "[2/3] Starting Backend API Server on http://localhost:5000 ..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -PassThru

# 3. Start React Frontend on port 3000
Write-Host "[3/3] Starting Frontend Client on http://localhost:3000 ..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru

Write-Host "`nAll services launched successfully!" -ForegroundColor Green
Write-Host "  - Frontend:   http://localhost:3000" -ForegroundColor Yellow
Write-Host "  - Backend:    http://localhost:5000" -ForegroundColor Yellow
Write-Host "  - ML Service: http://localhost:8000" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Runs both DevGuard AI backend and frontend services concurrently

.DESCRIPTION
    Starts FastAPI backend (port 8000) and React frontend (port 5173) in separate processes
    Perfect for development with hot-reload enabled on both

.EXAMPLE
    .\dev.ps1
#>

Write-Host "🚀 Starting DevGuard AI (Frontend + Backend)..." -ForegroundColor Green
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Check if Node is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "📡 Backend → http://localhost:8000" -ForegroundColor Cyan
Start-Process pwsh -ArgumentList @("-NoExit", "-Command", "python -m uvicorn main:app --reload")

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend in a new window
Write-Host "🎨 Frontend → http://localhost:5173" -ForegroundColor Cyan
Start-Process pwsh -ArgumentList @("-NoExit", "-Command", "npm run dev")

Write-Host ""
Write-Host "✅ Both services started! (check new terminal windows)" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access URLs:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in either window to stop services" -ForegroundColor Gray

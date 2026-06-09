#!/bin/bash

# DevGuard AI - Full Stack Development Server
# Runs backend (FastAPI) and frontend (React) concurrently
# Usage: ./dev.sh

set -e

echo "🚀 Starting DevGuard AI (Frontend + Backend)..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "✗ Python 3 not found. Please install Python 3.10+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "✓ Python found: $PYTHON_VERSION"

# Check Node
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js 18+"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✓ Node.js found: $NODE_VERSION"

echo ""
echo "Starting services..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}

trap cleanup EXIT

# Start backend
echo "📡 Backend → http://localhost:8000"
python3 -m uvicorn main:app --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Frontend → http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both services started!"
echo ""
echo "📍 Access URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop services"
echo ""

# Wait for both processes
wait

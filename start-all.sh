#!/bin/bash

# Uber Eats API - Development Server Startup Script
# Starts backend, frontend, and ngrok tunnel simultaneously

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🚀 Uber Eats API - Development Server Startup"
echo "=============================================="
echo ""

# Check if dependencies are installed
echo "📦 Checking dependencies..."

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "⚠️  Backend dependencies not found. Installing..."
  cd "$BACKEND_DIR"
  npm install
  cd "$PROJECT_DIR"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "⚠️  Frontend dependencies not found. Installing..."
  cd "$FRONTEND_DIR"
  npm install
  cd "$PROJECT_DIR"
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "⚠️  ngrok not found. Please install ngrok first:"
  echo "   brew install ngrok"
  exit 1
fi

echo "✅ All dependencies ready!"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down services..."
  jobs -p | xargs -r kill 2>/dev/null || true
  echo "✅ All services stopped"
}

trap cleanup EXIT INT TERM

# Start services
echo "🔧 Starting services..."
echo ""

# Backend (port 3000)
echo "📱 Starting Backend on http://localhost:3000"
cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!
echo "   Process ID: $BACKEND_PID"
echo ""

# Wait a bit for backend to start
sleep 2

# Frontend (port 5174)
echo "🎨 Starting Frontend on http://localhost:5174"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "   Process ID: $FRONTEND_PID"
echo ""

# Wait a bit for frontend to start
sleep 2

# ngrok tunnel
echo "🌐 Starting ngrok tunnel for port 3000"
echo "   This will expose your backend to the internet for Uber webhooks"
echo ""
cd "$PROJECT_DIR"
ngrok http 3000

wait


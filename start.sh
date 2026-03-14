#!/bin/bash
# Quick start script for local development

echo "Starting Coco..."

# Start postgres + redis
echo "Starting database and cache..."
docker-compose up -d postgres redis

# Wait for postgres
echo "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U coco > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL ready!"

# Install backend deps if needed
if [ ! -d "backend/.venv" ]; then
  echo "Creating Python venv..."
  python3 -m venv backend/.venv
fi

echo "Installing backend dependencies..."
backend/.venv/bin/pip install -q -r backend/requirements.txt

# Copy env if not exists
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from example"
fi

echo ""
echo "✅ Infrastructure ready!"
echo ""
echo "Now run in separate terminals:"
echo "  Terminal 1 (backend):  cd backend && ../.venv/bin/uvicorn main:app --reload"
echo "  Terminal 2 (frontend): cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"

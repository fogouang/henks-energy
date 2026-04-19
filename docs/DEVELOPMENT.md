# Development Guide

## Prerequisites

- Python 3.10+ installed
- Node.js 18+ installed
- Docker and Docker Compose installed
- PostgreSQL client tools (optional, for direct DB access)

## Step-by-Step Setup

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and configure:
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET_KEY` - Generate a random 64-character string
- `MQTT_PASSWORD` - MQTT broker password
- Feature flags as needed

### 2. Start Infrastructure Services (Docker)

Start only the database and MQTT broker in Docker:

```bash
docker-compose up -d timescaledb mosquitto
```

Wait for services to be healthy (check with `docker-compose ps`).

### 3. Install Backend Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run Database Migrations

```bash
cd backend
alembic upgrade head
```

### 5. Seed Test Data (Optional)

```bash
cd backend
python scripts/seed_test_data.py
```

This creates:
- Admin user: `admin@jsenergy.nl` / `admin123` (change in production!)
- Test installation with battery, 2 inverters, and main meter

### 6. Start Backend Development Server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### 7. Install Frontend Dependencies

In a new terminal:

```bash
cd frontend
npm install
```

### 8. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at:
- http://localhost:3000

## Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (user: `jsenergy`, db: `jsenergy_db`)
- **MQTT Broker**: localhost:1883

## Hot Reload

Both servers support hot reload:
- **Backend**: Automatically reloads on file changes (via `--reload` flag)
- **Frontend**: Next.js automatically reloads on file changes

## Stopping Services

1. Stop frontend: `Ctrl+C` in frontend terminal
2. Stop backend: `Ctrl+C` in backend terminal
3. Stop Docker services: `docker-compose down`

## Troubleshooting

### Database Connection Issues

If the backend can't connect to the database:
1. Check Docker services: `docker-compose ps`
2. Verify `.env` has correct `DATABASE_URL`
3. Check database logs: `docker-compose logs timescaledb`

### Port Already in Use

If port 8000 or 3000 is already in use:
- Backend: Change port in uvicorn command: `--port 8001`
- Frontend: Change port: `npm run dev -- -p 3001`
- Update CORS in `backend/main.py` if using different ports

### Migration Errors

If migrations fail:
```bash
cd backend
alembic downgrade -1  # Rollback one migration
alembic upgrade head   # Try again
```

### Python Import Errors

Make sure you're in the backend directory and virtual environment is activated:
```bash
cd backend
source venv/bin/activate
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

## Quick Start Script

Create a `dev.sh` script for convenience:

```bash
#!/bin/bash
# Start infrastructure
docker-compose up -d timescaledb mosquitto

# Wait for services
sleep 5

# Start backend (in background)
cd backend
source venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT
wait
```

Make it executable: `chmod +x dev.sh`
Run: `./dev.sh`


# JSEnergy Dashboard - Battery & Solar Monitoring System

A comprehensive web-based battery and solar monitoring system with Raspberry Pi edge devices collecting real-time data. The system manages battery storage, solar inverters, generators, EV charging points, and grid interactions with revenue optimization.

## Architecture

- **Backend**: FastAPI (Python 3.10+) with SQLAlchemy 2.0+ async, TimescaleDB
- **Frontend**: Next.js 14+ (React 18+, App Router) with Tailwind CSS
- **Database**: TimescaleDB (PostgreSQL with time-series extensions)
- **Real-time**: MQTT broker (Mosquitto) for Pi → Backend, WebSocket for Backend → Frontend
- **Deployment**: Docker containers with Nginx reverse proxy

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.10+ (for local development)
- Node.js 18+ (for local development)

### Development Setup

**Single Command Start (Recommended):**

1. **Initial setup (one time only):**
   ```bash
   make dev-setup
   # or: ./scripts/dev-setup.sh
   ```
   This will:
   - Create `.env` file if it doesn't exist
   - Start database and MQTT services
   - Run database migrations
   - Optionally seed test data

2. **Start all development servers:**
   ```bash
   make dev-up
   # or: docker compose -f docker-compose.dev.yml up
   ```
   
   This starts everything with hot reload:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs
   - **Database**: localhost:5432
   - **MQTT**: localhost:1883

3. **Useful commands:**
   ```bash
   make dev-up-d      # Start in background
   make dev-down      # Stop all services
   make dev-logs      # View all logs
   make dev-migrate   # Run migrations
   make help          # Show all commands
   ```

**Alternative: Manual Setup (without Docker for backend/frontend)**

If you prefer to run backend/frontend locally (not in Docker), see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for manual setup instructions.

### Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
├── backend/          # FastAPI application
├── frontend/         # Next.js application
├── edge-device/      # MQTT integration examples/documentation
├── docker/           # Docker configurations
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Features

### MVP (v1.0.0)
- Single installation monitoring
- Battery SoC tracking
- 1-2 Inverter monitoring
- Main meter (import/export)
- Real-time updates via WebSocket
- 24h historical charts

### Full Platform (v2.0.0+)
- Multi-tenant architecture
- Up to 8 inverters
- Generator monitoring
- EV charger management (1-4)
- Revenue analytics
- EPEX spot price integration
- Alert system
- Configuration UI

## Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Edge Device Integration](docs/EDGE_DEVICE_INTEGRATION.md)
- [Migration Guide](docs/MIGRATION_GUIDE.md)

## License

Proprietary - JSEnergy


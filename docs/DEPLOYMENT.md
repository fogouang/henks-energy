# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 80, 443, 3000, 8000, 5432, 1883 available

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and configure:
   - `POSTGRES_PASSWORD` - Strong password for database
   - `JWT_SECRET_KEY` - Random 64-character string
   - `MQTT_PASSWORD` - Strong password for MQTT
   - Feature flags as needed

3. Start services:
   ```bash
   docker-compose up -d
   ```

4. Apply database migrations:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. Seed test data (optional):
   ```bash
   docker-compose exec backend python scripts/seed_test_data.py
   ```

6. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Deploying from pre-built images (client server)

Use this flow when deploying to a client server without giving access to the source code. Images are built and pushed by the development team to `registry.aitech.work`.

### On the client server

1. **Log in to the registry** (credentials provided by the team):
   ```bash
   docker login registry.aitech.work
   ```

2. **Obtain the deployment package** containing:
   - `docker-compose.production.yml`
   - `.env.example` (copy to `.env` and fill in secrets)

   No other files are required (e.g. no Mosquitto config file). Images are built for `linux/amd64`.

3. **Configure environment**: copy `.env.example` to `.env` and set at least:
   - `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, `MQTT_PASSWORD`
   - `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to match the client’s API URL

4. **Pull and start services** (you must use `-f docker-compose.production.yml`; otherwise the default `docker-compose.yml` is used and will fail due to missing files):
   ```bash
   docker compose -f docker-compose.production.yml pull
   docker compose -f docker-compose.production.yml up -d
   ```
   Or in one line: `docker compose -f docker-compose.production.yml pull && docker compose -f docker-compose.production.yml up -d`

5. **Run database migrations** (first deploy and after image updates):
   ```bash
   docker compose -f docker-compose.production.yml exec backend alembic upgrade head
   ```

6. Access the application (ports 9090 for frontend, 9091 for backend API by default).

### Building and pushing images (development team)

From the project root, build and push to the registry:

```bash
make prod-release
```

Or step by step: `make prod-build` then `make prod-push`. To tag with a version: `VERSION=1.0.0 make prod-release`.

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong `JWT_SECRET_KEY` (64+ characters)
- [ ] Enable TLS for MQTT broker
- [ ] Configure SSL certificates for Nginx
- [ ] Set up firewall rules
- [ ] Enable database SSL connections
- [ ] Configure proper CORS origins
- [ ] Set up log rotation
- [ ] Configure backup strategy

### Environment Variables

See `.env.example` for all required variables.

### Database Backups

Configure daily backups:
```bash
docker-compose exec timescaledb pg_dump -U jsenergy jsenergy_db > backup_$(date +%Y%m%d).sql
```

### Monitoring

- Health checks: `/health` endpoint
- Database: Monitor disk usage and connection pool
- MQTT: Monitor message rate and connection count
- Application: Monitor response times and error rates

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` format
- Verify TimescaleDB is running: `docker-compose ps timescaledb`
- Check logs: `docker-compose logs timescaledb`

### MQTT Connection Issues
- Verify Mosquitto is running: `docker-compose ps mosquitto`
- Check authentication credentials
- Review MQTT logs: `docker-compose logs mosquitto`

### Frontend Not Loading
- Check backend is running: `docker-compose ps backend`
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check browser console for errors


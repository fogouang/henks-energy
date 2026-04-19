# Environment Variables

This document describes all environment variables used in the JSEnergy Dashboard system.

## Soketi (Pusher-compatible WebSocket Server)

These variables configure the Soketi WebSocket server for real-time updates:

```bash
# Soketi App Configuration
SOKETI_APP_ID=jsenergy-app-id          # Application ID for Soketi
SOKETI_APP_KEY=jsenergy-app-key        # Public key (used by frontend)
SOKETI_APP_SECRET=jsenergy-app-secret  # Secret key (used by backend)
SOKETI_HOST=soketi                      # Hostname (use 'soketi' in Docker, 'localhost' for local dev)
SOKETI_PORT=6001                        # HTTP API port
SOKETI_CLUSTER=mt1                      # Cluster identifier (default: mt1)
```

### Usage

- **Backend**: Uses `SOKETI_APP_ID`, `SOKETI_APP_KEY`, `SOKETI_APP_SECRET`, `SOKETI_HOST`, and `SOKETI_PORT` to connect to Soketi and broadcast messages
- **Frontend**: Uses `NEXT_PUBLIC_SOKETI_KEY`, `NEXT_PUBLIC_SOKETI_CLUSTER`, `NEXT_PUBLIC_SOKETI_HOST`, and `NEXT_PUBLIC_SOKETI_PORT` to connect to Soketi and receive real-time updates

### Frontend Variables (Next.js)

These are automatically set from the Soketi variables in docker-compose:

```bash
NEXT_PUBLIC_SOKETI_KEY=${SOKETI_APP_KEY}        # Public key for Pusher client
NEXT_PUBLIC_SOKETI_CLUSTER=${SOKETI_CLUSTER}   # Cluster identifier
NEXT_PUBLIC_SOKETI_HOST=${SOKETI_HOST}         # Hostname (localhost for dev, soketi for Docker)
NEXT_PUBLIC_SOKETI_PORT=${SOKETI_PORT:-6002}   # WebSocket port (default: 6002)
```

## Database

```bash
POSTGRES_PASSWORD=your_secure_password_here
```

## MQTT

```bash
MQTT_USERNAME=jsenergy
MQTT_PASSWORD=your_mqtt_password_here
```

## JWT Authentication

```bash
JWT_SECRET_KEY=your_64_character_minimum_secret_key_here
```

## OpenWeather API

```bash
OPEN_WEATHER_API_KEY=your_openweather_api_key_here
```

**Note**: Get your API key from [OpenWeatherMap](https://openweathermap.org/api). The free tier includes 5-day/3-hour forecast API access.

## Redis (Cache)

```bash
REDIS_URL=redis://redis:6379/0
```

**Note**: Redis is used for caching weather data. Default URL works for Docker setup. For local development outside Docker, use `redis://localhost:6379/0`.

## Reverse SSH (Edge Device Remote Access)

These variables configure systemwide defaults for reverse SSH tunnels to edge devices:

```bash
REVERSE_SSH_HOST=support.jsenergy.nl  # SSH server hostname for reverse tunnels
REVERSE_SSH_USER=rpi-tunnel            # SSH username for reverse tunnels
REVERSE_SSH_PORT=22                    # SSH server port (default: 22)
```

**Note**: These values are used as defaults when edge devices don't specify their own host/user. All devices use the same systemwide hostname for reverse SSH connections.

## Feature Flags

```bash
ENABLE_MVP_MODE=true
ENABLE_MULTI_TENANT=false
ENABLE_GENERATOR=false
ENABLE_EV_CHARGERS=false
ENABLE_REVENUE_ANALYTICS=false
```

## Frontend API URLs

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Environment

```bash
ENVIRONMENT=development  # or 'production'
LOG_LEVEL=DEBUG         # or 'INFO', 'WARNING', 'ERROR'
```

## Example .env File

Create a `.env` file in the project root with these variables:

```bash
# Database
POSTGRES_PASSWORD=jsenergy_dev_password

# MQTT
MQTT_USERNAME=jsenergy
MQTT_PASSWORD=jsenergy_dev_password

# JWT
JWT_SECRET_KEY=dev_secret_key_change_in_production_64_chars_minimum

# OpenWeather API (optional - for weather widget)
OPEN_WEATHER_API_KEY=your_openweather_api_key_here

# Redis (Cache - optional, falls back to in-memory cache if not available)
REDIS_URL=redis://localhost:6379/0

# Feature Flags
ENABLE_MVP_MODE=true
ENABLE_MULTI_TENANT=false
ENABLE_GENERATOR=false
ENABLE_EV_CHARGERS=false
ENABLE_REVENUE_ANALYTICS=false

# Soketi (Pusher-compatible WebSocket server)
SOKETI_APP_ID=jsenergy-app-id
SOKETI_APP_KEY=jsenergy-app-key
SOKETI_APP_SECRET=jsenergy-app-secret
SOKETI_HOST=soketi
SOKETI_PORT=6001
SOKETI_CLUSTER=mt1

# Reverse SSH (systemwide defaults for edge device remote access)
REVERSE_SSH_HOST=support.jsenergy.nl
REVERSE_SSH_USER=rpi-tunnel
REVERSE_SSH_PORT=22

# Frontend API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Frontend Feature Flags
NEXT_PUBLIC_ENABLE_MVP_MODE=true
NEXT_PUBLIC_ENABLE_GENERATOR=false
NEXT_PUBLIC_ENABLE_EV_CHARGERS=false
NEXT_PUBLIC_ENABLE_REVENUE_ANALYTICS=false

# Environment
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

## Notes

- All `NEXT_PUBLIC_*` variables are exposed to the browser and should not contain secrets
- For production, use strong, randomly generated values for `SOKETI_APP_SECRET` and `JWT_SECRET_KEY`
- The `SOKETI_HOST` should be `soketi` when running in Docker, or `localhost` when running locally
- The `SOKETI_PORT` for HTTP API is `6001`, and WebSocket port is `6002`


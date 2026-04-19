#!/bin/bash
# Development setup script

set -e

# Detect docker compose command (newer versions use "docker compose" instead of "docker-compose")
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: docker-compose or 'docker compose' not found"
    echo "   Please install Docker Compose"
    exit 1
fi

echo "🚀 Setting up JSEnergy Dashboard development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Start services
echo "🐳 Starting Docker services..."
$DOCKER_COMPOSE -f docker-compose.dev.yml up -d timescaledb mosquitto

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if database is ready
echo "🔍 Checking database connection..."
until $DOCKER_COMPOSE -f docker-compose.dev.yml exec -T timescaledb pg_isready -U jsenergy > /dev/null 2>&1; do
    echo "   Waiting for database..."
    sleep 2
done

# Wait a bit for Mosquitto to be ready (health check may take time)
echo "⏳ Waiting for MQTT broker..."
sleep 3

# Run migrations
echo "📊 Running database migrations..."
$DOCKER_COMPOSE -f docker-compose.dev.yml run --rm -e PYTHONPATH=/app -w /app/backend backend alembic upgrade head

# Seed test data (optional)
read -p "🌱 Seed test data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding test data..."
    $DOCKER_COMPOSE -f docker-compose.dev.yml run --rm -e PYTHONPATH=/app -w /app backend python scripts/seed_test_data.py
fi

echo "✅ Setup complete!"
echo ""
echo "📝 To start all services:"
echo "   make dev-up"
echo "   # or: docker compose -f docker-compose.dev.yml up"
echo ""
echo "📝 To start in background:"
echo "   make dev-up-d"
echo ""
echo "📝 To view logs:"
echo "   make dev-logs"
echo ""
echo "📝 To stop services:"
echo "   make dev-down"
echo ""
echo "📝 For all available commands:"
echo "   make help"


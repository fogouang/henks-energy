#!/bin/bash
set -e

cd ~/apps/henks-energy

echo "📦 Pulling latest changes..."
git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "🔄 Changes detected, rebuilding..."
    git pull origin main
    docker compose -f docker-compose.production.yml up -d --build
    echo "✅ Deployed with rebuild!"
else
    echo "✅ No changes, ensuring containers are up..."
    docker compose -f docker-compose.production.yml up -d
    echo "✅ Done!"
fi

echo ""
echo "📊 Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}"

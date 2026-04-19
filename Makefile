# Detect docker compose command
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null || echo "docker compose")

# Production registry and image names
REGISTRY := registry.aitech.work
IMAGE_BACKEND := $(REGISTRY)/jsenergy/backend
IMAGE_FRONTEND := $(REGISTRY)/jsenergy/frontend
VERSION ?= latest

# Frontend build args - production defaults (override via env or .env for staging)
# API URL must be origin only; client appends /api/... itself (e.g. /api/auth/login)
NEXT_PUBLIC_API_URL ?= https://app.jsenergypowerhub.nl
NEXT_PUBLIC_WS_URL ?= wss://app.jsenergypowerhub.nl/pusher
NEXT_PUBLIC_SOKETI_KEY ?= jsenergy-app-key
NEXT_PUBLIC_SOKETI_CLUSTER ?= mt1
NEXT_PUBLIC_SOKETI_HOST ?= app.jsenergypowerhub.nl
NEXT_PUBLIC_SOKETI_PORT ?= 443

.PHONY: dev dev-up dev-down dev-logs dev-setup dev-migrate dev-seed help
.PHONY: prod-build prod-build-backend prod-build-frontend prod-push prod-push-backend prod-push-frontend prod-release

help: ## Show this help message
	@echo "JSEnergy Dashboard - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

dev-setup: ## Initial setup (one-time): create .env, start services, run migrations
	@./scripts/dev-setup.sh

dev-up: ## Start all development services
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml up

dev-up-d: ## Start all development services in background
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d

dev-down: ## Stop all development services
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml down

dev-logs: ## View logs from all services
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f

dev-logs-backend: ## View backend logs
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f backend

dev-logs-frontend: ## View frontend logs
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f frontend

dev-migrate: ## Run database migrations
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml run --rm -e PYTHONPATH=/app -w /app/backend backend alembic upgrade head

dev-seed: ## Seed test data
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml run --rm -e PYTHONPATH=/app -w /app backend python scripts/seed_test_data.py

dev-seed-device-37: ## Seed dummy data for device/installation 37
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml run --rm -e PYTHONPATH=/app -w /app backend python scripts/seed_device_37_data.py

dev-seed-all: ## Seed dummy data for ALL installations with edge devices
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml run --rm -e PYTHONPATH=/app -w /app backend python scripts/seed_all_installations.py

dev-shell-backend: ## Open shell in backend container
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec backend /bin/bash

dev-shell-frontend: ## Open shell in frontend container
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec frontend /bin/sh

dev-restart: ## Restart all services
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml restart

dev-clean: ## Stop services and remove volumes (WARNING: deletes data)
	@$(DOCKER_COMPOSE) -f docker-compose.dev.yml down -v

# --- Production build and push (registry.aitech.work) ---

prod-build-backend: ## Build backend image and tag for registry (linux/amd64 for servers)
	docker build --platform linux/amd64 -t $(IMAGE_BACKEND):latest -f backend/Dockerfile .
	@if [ -n "$(VERSION)" ] && [ "$(VERSION)" != "latest" ]; then \
		docker tag $(IMAGE_BACKEND):latest $(IMAGE_BACKEND):$(VERSION); \
	fi

prod-build-frontend: ## Build frontend image and tag for registry (linux/amd64 for servers)
	docker build --platform linux/amd64 -t $(IMAGE_FRONTEND):latest -f frontend/Dockerfile . \
		--build-arg NEXT_PUBLIC_API_URL="$(NEXT_PUBLIC_API_URL)" \
		--build-arg NEXT_PUBLIC_WS_URL="$(NEXT_PUBLIC_WS_URL)" \
		--build-arg NEXT_PUBLIC_SOKETI_KEY="$(NEXT_PUBLIC_SOKETI_KEY)" \
		--build-arg NEXT_PUBLIC_SOKETI_CLUSTER="$(NEXT_PUBLIC_SOKETI_CLUSTER)" \
		--build-arg NEXT_PUBLIC_SOKETI_HOST="$(NEXT_PUBLIC_SOKETI_HOST)" \
		--build-arg NEXT_PUBLIC_SOKETI_PORT="$(NEXT_PUBLIC_SOKETI_PORT)"
	@if [ -n "$(VERSION)" ] && [ "$(VERSION)" != "latest" ]; then \
		docker tag $(IMAGE_FRONTEND):latest $(IMAGE_FRONTEND):$(VERSION); \
	fi

prod-build: prod-build-backend prod-build-frontend ## Build both backend and frontend images

prod-push-backend: ## Push backend image to registry
	docker push $(IMAGE_BACKEND):latest
	@if [ -n "$(VERSION)" ] && [ "$(VERSION)" != "latest" ]; then \
		docker push $(IMAGE_BACKEND):$(VERSION); \
	fi

prod-push-frontend: ## Push frontend image to registry
	docker push $(IMAGE_FRONTEND):latest
	@if [ -n "$(VERSION)" ] && [ "$(VERSION)" != "latest" ]; then \
		docker push $(IMAGE_FRONTEND):$(VERSION); \
	fi

prod-push: prod-push-backend prod-push-frontend ## Push both images to registry

prod-release: prod-build prod-push ## Build and push both images to registry


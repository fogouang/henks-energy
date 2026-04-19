# Frontend Dockerfile - expects build context: repo root (.) so we can copy from docs/
# Example: docker build -f frontend/Dockerfile .

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

# Copy Postman collection and environments from docs/ into public/downloads/ (single source of truth)
RUN mkdir -p public/downloads
COPY docs/JSEnergy_Edge_Device_API.postman_collection.json \
    docs/JSEnergy_Edge_Device_API_Local.postman_environment.json \
    docs/JSEnergy_Edge_Device_API_Production.postman_environment.json \
    public/downloads/

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SOKETI_KEY
ARG NEXT_PUBLIC_SOKETI_CLUSTER
ARG NEXT_PUBLIC_SOKETI_HOST
ARG NEXT_PUBLIC_SOKETI_PORT

# Set environment variables for build time
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_SOKETI_KEY=${NEXT_PUBLIC_SOKETI_KEY}
ENV NEXT_PUBLIC_SOKETI_CLUSTER=${NEXT_PUBLIC_SOKETI_CLUSTER}
ENV NEXT_PUBLIC_SOKETI_HOST=${NEXT_PUBLIC_SOKETI_HOST}
ENV NEXT_PUBLIC_SOKETI_PORT=${NEXT_PUBLIC_SOKETI_PORT}

# Verify that lib directory and required files exist
RUN ls -la lib/ && ls -la lib/api/ && ls -la lib/i18n/ && \
    test -f lib/api/client.ts && test -f lib/i18n/config.ts && \
    echo "✓ All required lib files are present"
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]

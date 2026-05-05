FROM node:20-alpine AS base

# Build stage
FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY frontend/ .
RUN mkdir -p public/downloads
COPY docs/JSEnergy_Edge_Device_API.postman_collection.json \
    docs/JSEnergy_Edge_Device_API_Local.postman_environment.json \
    docs/JSEnergy_Edge_Device_API_Production.postman_environment.json \
    public/downloads/
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SOKETI_KEY
ARG NEXT_PUBLIC_SOKETI_CLUSTER
ARG NEXT_PUBLIC_SOKETI_HOST
ARG NEXT_PUBLIC_SOKETI_PORT
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_SOKETI_KEY=${NEXT_PUBLIC_SOKETI_KEY}
ENV NEXT_PUBLIC_SOKETI_CLUSTER=${NEXT_PUBLIC_SOKETI_CLUSTER}
ENV NEXT_PUBLIC_SOKETI_HOST=${NEXT_PUBLIC_SOKETI_HOST}
ENV NEXT_PUBLIC_SOKETI_PORT=${NEXT_PUBLIC_SOKETI_PORT}
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
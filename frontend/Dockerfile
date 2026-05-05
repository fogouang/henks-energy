FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ .

RUN mkdir -p public/downloads
COPY docs/JSEnergy_Edge_Device_API.postman_collection.json \
    docs/JSEnergy_Edge_Device_API_Local.postman_environment.json \
    docs/JSEnergy_Edge_Device_API_Production.postman_environment.json \
    public/downloads/

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

EXPOSE 3000
ENV PORT=3000
USER node
CMD ["node", "server.js"]
FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG NPM_INSTALL_ATTEMPT_TIMEOUT=300s
ENV NPM_CONFIG_FETCH_RETRIES=8
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$NPM_INSTALL_ATTEMPT_TIMEOUT" \
        npm ci --workspace backend --include-workspace-root && exit 0; \
      status=$?; \
      echo "npm ci attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1

COPY backend backend
RUN npm --workspace backend run prisma:generate
RUN npm run build:backend

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ARG NPM_INSTALL_ATTEMPT_TIMEOUT=300s
ENV NODE_ENV=production
ENV PORT=3000
ENV NPM_CONFIG_FETCH_RETRIES=8
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
COPY backend/scripts backend/scripts
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$NPM_INSTALL_ATTEMPT_TIMEOUT" \
        npm ci --omit=dev --workspace backend --include-workspace-root && break; \
      status=$?; \
      if [ "$attempt" -eq 5 ]; then exit "$status"; fi; \
      echo "npm ci attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done \
  && npm --workspace backend run prisma:generate \
  && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/main.js"]

FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=8
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN for attempt in 1 2 3 4 5; do \
      npm ci --workspace frontend --include-workspace-root && exit 0; \
      echo "npm ci failed on attempt ${attempt}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1

COPY frontend frontend
RUN npm run build:frontend

FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

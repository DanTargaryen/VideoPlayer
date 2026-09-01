FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG NPM_INSTALL_ATTEMPT_TIMEOUT=300s
ENV NPM_CONFIG_FETCH_RETRIES=8 NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 NPM_CONFIG_FETCH_TIMEOUT=300000
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY services services
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$NPM_INSTALL_ATTEMPT_TIMEOUT" \
        npm ci --ignore-scripts --workspace @videoplayer/shared-contracts --workspace @videoplayer/gateway --include-workspace-root && exit 0; \
      status=$?; \
      echo "npm ci attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1
RUN npm --workspace @videoplayer/gateway run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 GATEWAY_ROUTE_MODE=monolith
COPY --from=build /app/services/gateway/dist ./dist
COPY --from=build /app/services/shared-contracts/package.json ./node_modules/@videoplayer/shared-contracts/package.json
COPY --from=build /app/services/shared-contracts/dist ./node_modules/@videoplayer/shared-contracts/dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

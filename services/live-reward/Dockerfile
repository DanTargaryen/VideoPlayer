FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=8 NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 NPM_CONFIG_FETCH_TIMEOUT=300000
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY services services
RUN for attempt in 1 2 3 4 5; do \
      npm ci --ignore-scripts --workspace @videoplayer/shared-contracts --workspace @videoplayer/live-reward --include-workspace-root && exit 0; \
      echo "npm ci failed on attempt ${attempt}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1
RUN npm --workspace @videoplayer/live-reward run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/services/live-reward/dist ./dist
COPY --from=build /app/services/live-reward/generated ./generated
COPY --from=build /app/services/shared-contracts/package.json ./node_modules/@videoplayer/shared-contracts/package.json
COPY --from=build /app/services/shared-contracts/dist ./node_modules/@videoplayer/shared-contracts/dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

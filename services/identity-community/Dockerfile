FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG SERVICE_BUILD_ATTEMPT_TIMEOUT=300s
ENV NPM_CONFIG_FETCH_RETRIES=8 NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 NPM_CONFIG_FETCH_TIMEOUT=300000
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/scripts backend/scripts
COPY frontend/package.json frontend/package.json
COPY services services
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$SERVICE_BUILD_ATTEMPT_TIMEOUT" \
        npm ci --ignore-scripts --workspace @videoplayer/shared-contracts --workspace @videoplayer/identity-community --include-workspace-root && exit 0; \
      status=$?; \
      echo "npm ci attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$SERVICE_BUILD_ATTEMPT_TIMEOUT" \
        npm --workspace @videoplayer/identity-community run build && exit 0; \
      status=$?; \
      echo "identity build attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1

FROM build AS migration
RUN npm prune --omit=dev --workspace @videoplayer/identity-community --include-workspace-root \
    && npm cache clean --force
CMD ["npm", "--workspace", "@videoplayer/identity-community", "run", "db:migrate"]

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/services/identity-community/dist ./dist
COPY --from=build /app/services/identity-community/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/services/identity-community/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/services/shared-contracts/package.json ./node_modules/@videoplayer/shared-contracts/package.json
COPY --from=build /app/services/shared-contracts/dist ./node_modules/@videoplayer/shared-contracts/dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

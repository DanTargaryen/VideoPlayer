FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG SERVICE_BUILD_ATTEMPT_TIMEOUT=300s
ENV NPM_CONFIG_FETCH_RETRIES=8 NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 NPM_CONFIG_FETCH_TIMEOUT=300000
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY services services
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$SERVICE_BUILD_ATTEMPT_TIMEOUT" \
        npm ci --ignore-scripts --workspace @videoplayer/shared-contracts --workspace @videoplayer/content-media --include-workspace-root && exit 0; \
      status=$?; \
      echo "npm ci attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1
RUN for attempt in 1 2 3 4 5; do \
      timeout --signal=TERM --kill-after=30s "$SERVICE_BUILD_ATTEMPT_TIMEOUT" \
        npm --workspace @videoplayer/content-media run build && exit 0; \
      status=$?; \
      echo "content build attempt ${attempt} failed or timed out with exit ${status}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1

FROM build AS migration
RUN npm prune --omit=dev --workspace @videoplayer/content-media --include-workspace-root \
    && npm cache clean --force
CMD ["npm", "--workspace", "@videoplayer/content-media", "run", "db:migrate"]

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN for attempt in 1 2 3 4 5; do \
      apt-get -o Acquire::Retries=5 update \
      && apt-get -o Acquire::Retries=5 install -y --no-install-recommends ffmpeg \
      && rm -rf /var/lib/apt/lists/* \
      && exit 0; \
      echo "ffmpeg install failed on attempt ${attempt}; retrying..."; \
      rm -rf /var/lib/apt/lists/*; \
      sleep $((attempt * 10)); \
    done; \
    exit 1
COPY --from=build /app/services/content-media/dist ./dist
COPY --from=build /app/services/content-media/generated ./generated
COPY --from=build /app/node_modules ./node_modules
RUN rm -f node_modules/@videoplayer/content-media node_modules/@videoplayer/shared-contracts \
  && mkdir -p node_modules/@videoplayer/shared-contracts
COPY --from=build /app/services/shared-contracts/package.json ./node_modules/@videoplayer/shared-contracts/package.json
COPY --from=build /app/services/shared-contracts/dist ./node_modules/@videoplayer/shared-contracts/dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

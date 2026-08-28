FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=8 NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 NPM_CONFIG_FETCH_TIMEOUT=300000
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY services services
RUN for attempt in 1 2 3 4 5; do \
      npm ci --ignore-scripts --workspace @videoplayer/shared-contracts --workspace @videoplayer/content-media --include-workspace-root && exit 0; \
      echo "npm ci failed on attempt ${attempt}; retrying..."; \
      sleep $((attempt * 10)); \
    done; \
    exit 1
RUN npm --workspace @videoplayer/content-media run prisma:generate
RUN npm --workspace @videoplayer/content-media run build

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
COPY --from=build /app/services/shared-contracts/package.json ./node_modules/@videoplayer/shared-contracts/package.json
COPY --from=build /app/services/shared-contracts/dist ./node_modules/@videoplayer/shared-contracts/dist
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

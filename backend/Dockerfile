FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspace backend --include-workspace-root

COPY backend backend
RUN npm --workspace backend run prisma:generate
RUN npm run build:backend

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
RUN npm ci --omit=dev --workspace backend --include-workspace-root \
  && npm --workspace backend run prisma:generate \
  && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/main.js"]

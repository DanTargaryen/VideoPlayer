#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

docker build -f backend/Dockerfile -t "video-player/backend:$IMAGE_TAG" .
docker build -f frontend/Dockerfile -t "video-player/frontend:$IMAGE_TAG" .
for service in identity-community content-media live-reward governance-ai gateway; do
  docker build -f "services/$service/Dockerfile" -t "video-player/$service:$IMAGE_TAG" .
done
docker build --target migration -f services/identity-community/Dockerfile \
  -t "video-player/identity-community-migration:$IMAGE_TAG" .
docker build --target migration -f services/content-media/Dockerfile \
  -t "video-player/content-media-migrate:$IMAGE_TAG" .

{
  docker image inspect "video-player/backend:$IMAGE_TAG" \
    --format 'backend={{.Id}} tag=video-player/backend:'"$IMAGE_TAG"
  docker image inspect "video-player/frontend:$IMAGE_TAG" \
    --format 'frontend={{.Id}} tag=video-player/frontend:'"$IMAGE_TAG"
  for service in identity-community content-media live-reward governance-ai gateway; do
    docker image inspect "video-player/$service:$IMAGE_TAG" \
      --format "$service={{.Id}} tag=video-player/$service:$IMAGE_TAG"
  done
  docker image inspect "video-player/identity-community-migration:$IMAGE_TAG" \
    --format "identity-community-migration={{.Id}} tag=video-player/identity-community-migration:$IMAGE_TAG"
  docker image inspect "video-player/content-media-migrate:$IMAGE_TAG" \
    --format 'content-media-migrate={{.Id}} tag=video-player/content-media-migrate:'"$IMAGE_TAG"
} > "$CI_EVIDENCE_DIR/versioned-images.txt"

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 10-image-build

#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

docker build -f backend/Dockerfile -t "video-player/backend:$IMAGE_TAG" .
docker build -f frontend/Dockerfile -t "video-player/frontend:$IMAGE_TAG" .
for service in identity-community content-media live-reward governance-ai gateway; do
  docker build -f "services/$service/Dockerfile" -t "video-player/$service:$IMAGE_TAG" .
done

{
  docker image inspect "video-player/backend:$IMAGE_TAG" \
    --format 'backend={{.Id}} tag=video-player/backend:'"$IMAGE_TAG"
  docker image inspect "video-player/frontend:$IMAGE_TAG" \
    --format 'frontend={{.Id}} tag=video-player/frontend:'"$IMAGE_TAG"
  for service in identity-community content-media live-reward governance-ai gateway; do
    docker image inspect "video-player/$service:$IMAGE_TAG" \
      --format "$service={{.Id}} tag=video-player/$service:$IMAGE_TAG"
  done
} > "$CI_EVIDENCE_DIR/versioned-images.txt"

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 10-image-build

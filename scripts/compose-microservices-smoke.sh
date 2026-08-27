#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.microservices.yml"
PROJECT_NAME=${MICROSERVICE_COMPOSE_PROJECT_NAME:-video-player-ms00-smoke}
IMAGE_TAG=${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}
GIT_SHA=${GIT_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD)}

for command_name in docker curl git; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if [[ ! "$PROJECT_NAME" =~ ^video-player-ms00-[a-z0-9-]+$ ]]; then
  echo "MICROSERVICE_COMPOSE_PROJECT_NAME must start with video-player-ms00-." >&2
  exit 1
fi

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  else
    docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  fi
}

cleanup() {
  compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

export IMAGE_TAG GIT_SHA
compose config --quiet
if [[ "${MICROSERVICE_COMPOSE_SKIP_BUILD:-false}" == "true" ]]; then
  compose up -d
else
  compose up --build -d
fi

ports=(3100 3101 3102 3103 3104)
for port in "${ports[@]}"; do
  for _attempt in $(seq 1 90); do
    if curl -fsS "http://127.0.0.1:$port/health/ready" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  curl -fsS "http://127.0.0.1:$port/health/live"
  curl -fsS "http://127.0.0.1:$port/health/ready"
  curl -fsS "http://127.0.0.1:$port/version"
done

for service in identity-community content-media live-reward governance-ai gateway; do
  container_id=$(compose ps -q "$service")
  for _attempt in $(seq 1 30); do
    if [[ "$(docker inspect -f '{{.State.Health.Status}}' "$container_id")" == "healthy" ]]; then
      break
    fi
    sleep 1
  done
  test "$(docker inspect -f '{{.State.Health.Status}}' "$container_id")" = "healthy"
done

compose ps
echo "Microservice Compose scaffold smoke passed."

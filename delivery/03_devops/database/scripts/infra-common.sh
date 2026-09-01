#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.dev.yml"
COMPOSE_PROJECT_NAME="video-player-dev"

compose_stack() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
    return 0
  fi

  echo "Docker Compose is required to manage Redis, MinIO, and SRS."
  exit 1
}

tcp_port_ready() {
  local host="$1"
  local port="$2"

  (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1
}

wait_for_tcp_port() {
  local host="$1"
  local port="$2"
  local label="$3"
  local attempt=0

  until tcp_port_ready "$host" "$port"; do
    attempt=$((attempt + 1))

    if (( attempt >= 30 )); then
      echo "$label did not become ready at ${host}:${port}."
      return 1
    fi

    sleep 1
  done
}

minio_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "http://127.0.0.1:9000/minio/health/live" >/dev/null 2>&1
    return $?
  fi

  tcp_port_ready "127.0.0.1" "9000"
}

redis_ready() {
  if command -v redis-cli >/dev/null 2>&1; then
    [[ "$(redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null || true)" == "PONG" ]]
    return $?
  fi

  tcp_port_ready "127.0.0.1" "6379"
}

srs_ready() {
  tcp_port_ready "127.0.0.1" "1935" && tcp_port_ready "127.0.0.1" "8080"
}

ensure_docker_available() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required to start Redis, MinIO, and SRS."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not available. Start Docker first, then rerun the command."
    exit 1
  fi
}

ensure_service_with_compose() {
  local service_name="$1"
  local wait_kind="$2"
  local label="$3"

  case "$wait_kind" in
    redis)
      if redis_ready; then
        echo "$label is ready at 127.0.0.1:6379."
        return 0
      fi
      ;;
    minio)
      if minio_ready; then
        echo "$label is ready at http://127.0.0.1:9000."
        return 0
      fi
      ;;
    srs)
      if srs_ready; then
        echo "$label is ready at rtmp://127.0.0.1/live and http://127.0.0.1:8080."
        return 0
      fi
      ;;
    *)
      echo "Unknown wait kind: $wait_kind"
      exit 1
      ;;
  esac

  echo "$label is not reachable. Starting container '$service_name'..."
  compose_stack up -d "$service_name"

  case "$wait_kind" in
    redis)
      wait_for_tcp_port "127.0.0.1" "6379" "$label"
      ;;
    minio)
      local attempt=0
      until minio_ready; do
        attempt=$((attempt + 1))
        if (( attempt >= 30 )); then
          echo "$label did not become ready at http://127.0.0.1:9000."
          return 1
        fi
        sleep 1
      done
      ;;
    srs)
      wait_for_tcp_port "127.0.0.1" "1935" "$label RTMP"
      wait_for_tcp_port "127.0.0.1" "8080" "$label HTTP"
      ;;
  esac

  echo "$label started successfully."
}

ensure_support_services() {
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Missing compose file: $COMPOSE_FILE"
    exit 1
  fi

  ensure_docker_available
  ensure_service_with_compose "redis" "redis" "Redis"
  ensure_service_with_compose "minio" "minio" "MinIO"
  ensure_service_with_compose "srs" "srs" "SRS"
}

stop_support_services() {
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Missing compose file: $COMPOSE_FILE"
    exit 1
  fi

  compose_stack down --remove-orphans
}

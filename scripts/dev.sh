#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

. "$ROOT_DIR/scripts/mysql-common.sh"
. "$ROOT_DIR/scripts/infra-common.sh"

REQUESTED_PORT="${PORT:-}"

if [[ ! -d node_modules ]] || [[ ! -d backend/node_modules ]] || [[ ! -d frontend/node_modules ]]; then
  echo "Dependencies are missing. Run 'npm install' in the project root first."
  exit 1
fi

load_backend_env

if [[ -n "$REQUESTED_PORT" ]]; then
  export PORT="$REQUESTED_PORT"
fi

if [[ -n "${LAN_HOST:-}" ]]; then
  export SRS_RTMP_BASE="rtmp://${LAN_HOST}/live"
  export SRS_PLAY_BASE="http://${LAN_HOST}:8080/live"
  export SRS_WEBRTC_BASE="webrtc://${LAN_HOST}/live"
  export SRS_CANDIDATE="${SRS_CANDIDATE:-$LAN_HOST}"
fi

load_mysql_config
ensure_mysql_available
ensure_database_exists

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not available. Skipping Redis, MinIO, and SRS containers."
  echo "SRS RTC will be unavailable; live viewing will fall back to the compatibility frame stream."
else
  ensure_support_services
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Warning: ffmpeg is not installed. Video transcoding and auto-cover generation will fail."
fi

backend_pid=""
frontend_pid=""
backend_port="${PORT:-3000}"
export VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-http://127.0.0.1:${backend_port}}"

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi

  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  if [[ -n "$backend_pid" ]]; then
    wait "$backend_pid" 2>/dev/null || true
  fi

  if [[ -n "$frontend_pid" ]]; then
    wait "$frontend_pid" 2>/dev/null || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

wait_for_any_started_process() {
  local pids=()

  if [[ -n "$backend_pid" ]]; then
    pids+=("$backend_pid")
  fi

  if [[ -n "$frontend_pid" ]]; then
    pids+=("$frontend_pid")
  fi

  if (( ${#pids[@]} == 0 )); then
    return 0
  fi

  while true; do
    local pid=""
    for pid in "${pids[@]}"; do
      if ! kill -0 "$pid" 2>/dev/null; then
        wait "$pid" 2>/dev/null || true
        return 0
      fi
    done
    sleep 1
  done
}

backend_health_ready() {
  local port="$1"

  if ! command -v curl >/dev/null 2>&1; then
    return 1
  fi

  curl -fsS "http://127.0.0.1:${port}/api/v1/health" 2>/dev/null | grep -q '"status":"ok"'
}

print_port_owner() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN || true
    return 0
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" || true
    return 0
  fi

  echo "Port owner lookup requires lsof or ss."
}

backend_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  fi

  if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$port" | grep -q ":$port"; then
    return 0
  fi

  tcp_port_ready "127.0.0.1" "$port"
}

if backend_port_in_use "$backend_port"; then
  if backend_health_ready "$backend_port"; then
    echo "Backend is already running at http://127.0.0.1:${backend_port}/api/v1. Reusing it."
  else
    echo "Port ${backend_port} is already in use, but it is not a healthy VideoPlayer backend."
    print_port_owner "$backend_port"
    echo "Stop that process first, or start this project with another port, for example:"
    echo "  PORT=3001 npm run dev:lan"
    exit 1
  fi
else
  echo "Starting backend: http://127.0.0.1:${backend_port}/api/v1"
  npm run dev:backend &
  backend_pid=$!
fi

if [[ "${VITE_DEV_HTTPS:-}" == "true" ]]; then
  echo "Starting frontend: https://${LAN_HOST:-127.0.0.1}:${VITE_DEV_PORT:-5173}"
else
  echo "Starting frontend: http://127.0.0.1:5173"
fi
npm run dev:frontend &
frontend_pid=$!

echo "Everything is starting. Press Ctrl+C to stop the frontend and backend."
echo "If you also want to stop Redis, MinIO, and SRS, run: npm run dev:down"

wait_for_any_started_process
echo "One dev server exited. Stopping the other one..."

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

. "$ROOT_DIR/scripts/mysql-common.sh"
. "$ROOT_DIR/scripts/infra-common.sh"

if [[ ! -d node_modules ]] || [[ ! -d backend/node_modules ]] || [[ ! -d frontend/node_modules ]]; then
  echo "Dependencies are missing. Run 'npm install' in the project root first."
  exit 1
fi

load_backend_env
load_mysql_config
ensure_mysql_available
ensure_database_exists
ensure_support_services

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Warning: ffmpeg is not installed. Video transcoding and auto-cover generation will fail."
fi

backend_pid=""
frontend_pid=""

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

echo "Starting backend: http://127.0.0.1:3000/api/v1"
npm run dev:backend &
backend_pid=$!

echo "Starting frontend: http://127.0.0.1:5173"
npm run dev:frontend &
frontend_pid=$!

echo "Everything is starting. Press Ctrl+C to stop the frontend and backend."
echo "If you also want to stop Redis, MinIO, and SRS, run: npm run dev:down"

wait -n "$backend_pid" "$frontend_pid"
echo "One dev server exited. Stopping the other one..."

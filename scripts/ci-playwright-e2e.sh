#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env
require_command curl

log_dir="$CI_RUN_DIR/logs"
backend_pid_file="$CI_RUN_DIR/backend.pid"
frontend_pid_file="$CI_RUN_DIR/frontend.pid"
mkdir -p "$log_dir" "$LOCAL_STORAGE_DIR" "$ROOT_DIR/test-results" "$ROOT_DIR/playwright-report"

cleanup() {
  kill_pid_file "$frontend_pid_file"
  kill_pid_file "$backend_pid_file"
}
trap cleanup EXIT

export DATABASE_URL
export JWT_SECRET
export ADMIN_SECRET
export STORAGE_BACKEND
export LOCAL_STORAGE_DIR
export VITE_API_PROXY_TARGET
export PLAYWRIGHT_BASE_URL

PORT="$BACKEND_PORT" node backend/dist/main.js > "$log_dir/backend-e2e.log" 2>&1 &
echo $! > "$backend_pid_file"

VITE_DEV_HOST=127.0.0.1 VITE_DEV_PORT="$FRONTEND_PORT" npm run dev:frontend \
  > "$log_dir/frontend-e2e.log" 2>&1 &
echo $! > "$frontend_pid_file"

wait_for_http "http://127.0.0.1:$BACKEND_PORT/api/v1/health" 90
wait_for_http "http://127.0.0.1:$FRONTEND_PORT/api/v1/health" 90

npm run test:e2e
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 09-playwright-e2e

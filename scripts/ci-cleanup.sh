#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"

if [[ ! -f "$CI_RUNTIME_ENV_FILE" ]]; then
  exit 0
fi

load_runtime_env
kill_pid_file "$CI_RUN_DIR/frontend.pid"
kill_pid_file "$CI_RUN_DIR/backend.pid"

docker rm -f "$TEST_DB_CONTAINER" >/dev/null 2>&1 || true
if kind get clusters 2>/dev/null | grep -Fxq "$KIND_CLUSTER_NAME"; then
  kind delete cluster --name "$KIND_CLUSTER_NAME" >/dev/null 2>&1 || true
fi

case "$LOCAL_STORAGE_DIR" in
  "$CI_RUN_DIR"/*) rm -rf "$LOCAL_STORAGE_DIR" ;;
  *) echo "Refusing to remove storage outside CI run directory: $LOCAL_STORAGE_DIR" >&2 ;;
esac

#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

export DATABASE_URL
SEED_GUARD_PASSWORD="$SEED_CONFIRMATION" \
SEED_GUARD_CONFIRM="$SEED_CONFIRMATION" \
  npm --workspace backend run db:seed

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 08-seed-e2e-data

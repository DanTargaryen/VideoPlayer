#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

export DATABASE_URL
export INTEGRATION_DATABASE_URL
export JWT_SECRET
export ADMIN_SECRET
export STORAGE_BACKEND
export LOCAL_STORAGE_DIR

npm run test:api
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 07-api-integration

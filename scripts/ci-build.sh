#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"

npm run build:backend
npm run build:frontend
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 04-build

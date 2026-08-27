#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"

npm run lint:backend
npm run lint:frontend
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 03-lint

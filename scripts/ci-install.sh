#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"

for attempt in 1 2 3 4 5; do
  if npm ci; then
    break
  fi
  if [[ "$attempt" -eq 5 ]]; then
    echo "npm ci failed after $attempt attempts" >&2
    exit 1
  fi
  echo "npm ci failed on attempt $attempt; retrying..." >&2
  sleep $((attempt * 10))
done

npm --workspace backend run prisma:generate
npx playwright install chromium
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 02-install

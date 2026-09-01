#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${SEED_GUARD_CONFIRM:-}" && -t 0 ]]; then
  read -r -s -p "Enter db:seed password: " SEED_GUARD_CONFIRM
  echo
  export SEED_GUARD_CONFIRM
fi

npm --workspace backend run db:seed

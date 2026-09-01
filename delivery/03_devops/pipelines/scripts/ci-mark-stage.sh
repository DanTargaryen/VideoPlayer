#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"

stage_name=${1:?stage name is required}
if [[ ! "$stage_name" =~ ^[0-9]{2}-[a-z0-9-]+$ ]]; then
  echo "Invalid stage marker: $stage_name" >&2
  exit 1
fi

ensure_ci_dirs
printf 'completed_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  > "$CI_EVIDENCE_DIR/stage-markers/$stage_name.properties"

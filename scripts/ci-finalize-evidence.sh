#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
ensure_ci_dirs

{
  printf 'result=%s\n' "${BUILD_RESULT:-UNKNOWN}"
  printf 'build_number=%s\n' "${BUILD_NUMBER:-manual}"
  printf 'completed_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$CI_EVIDENCE_DIR/build-result.properties"

find "$CI_EVIDENCE_DIR/stage-markers" -maxdepth 1 -type f -print \
  | sed 's#.*/##' | sort > "$CI_EVIDENCE_DIR/completed-stages.txt"

git -C "$ROOT_DIR" log -1 --format='commit=%H%ntitle=%s%nauthor=%an <%ae>' \
  > "$CI_EVIDENCE_DIR/git-revision.properties"

if [[ -d "$ROOT_DIR/test-results" ]]; then
  mkdir -p "$CI_EVIDENCE_DIR/test-results"
  cp -R "$ROOT_DIR/test-results/." "$CI_EVIDENCE_DIR/test-results/" 2>/dev/null || true
fi

if [[ -f "$CI_RUN_DIR/logs/backend-e2e.log" ]]; then
  mkdir -p "$CI_EVIDENCE_DIR/runtime-logs"
  cp "$CI_RUN_DIR/logs/backend-e2e.log" "$CI_EVIDENCE_DIR/runtime-logs/"
  cp "$CI_RUN_DIR/logs/frontend-e2e.log" "$CI_EVIDENCE_DIR/runtime-logs/" 2>/dev/null || true
fi

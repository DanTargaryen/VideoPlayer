#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BUILD_NUMBER=${BUILD_NUMBER:-9001}
CI_RUN_SUBDIR=${CI_RUN_SUBDIR:-"local-$BUILD_NUMBER"}
CI_EVIDENCE_SUBDIR=${CI_EVIDENCE_SUBDIR:-"local-build-$BUILD_NUMBER"}
CI_RUN_DIR=${CI_RUN_DIR:-"$ROOT_DIR/.codex-run/$CI_RUN_SUBDIR"}
CI_EVIDENCE_DIR=${CI_EVIDENCE_DIR:-"$ROOT_DIR/ci-evidence/$CI_EVIDENCE_SUBDIR"}
CI_RUNTIME_ENV_FILE=${CI_RUNTIME_ENV_FILE:-"$CI_RUN_DIR/runtime.env"}
KIND_CLUSTER_NAME=${KIND_CLUSTER_NAME:-"video-player-local-ci-$BUILD_NUMBER"}
K8S_NAMESPACE=${K8S_NAMESPACE:-video-player}
TEST_DB_NAME=${TEST_DB_NAME:-video_player_ci_test}
FORCE_TEST_FAILURE_VALUE=${FORCE_TEST_FAILURE_VALUE:-false}
DB_MIGRATION_MODE_VALUE=${DB_MIGRATION_MODE_VALUE:-push}

export BUILD_NUMBER CI_RUN_SUBDIR CI_EVIDENCE_SUBDIR CI_RUN_DIR CI_EVIDENCE_DIR
export CI_RUNTIME_ENV_FILE KIND_CLUSTER_NAME K8S_NAMESPACE TEST_DB_NAME
export FORCE_TEST_FAILURE_VALUE DB_MIGRATION_MODE_VALUE

finish() {
  local exit_code=$?
  trap - EXIT
  if [[ "$exit_code" -eq 0 ]]; then
    BUILD_RESULT=SUCCESS bash "$ROOT_DIR/scripts/ci-finalize-evidence.sh" || true
  else
    BUILD_RESULT=FAILURE bash "$ROOT_DIR/scripts/ci-finalize-evidence.sh" || true
  fi
  bash "$ROOT_DIR/scripts/k8s-collect-evidence.sh" || true
  bash "$ROOT_DIR/scripts/ci-cleanup.sh" || true
  exit "$exit_code"
}
trap finish EXIT

cd "$ROOT_DIR"
bash scripts/ci-bootstrap.sh
bash scripts/ci-install.sh
bash scripts/ci-lint.sh
bash scripts/ci-build.sh
bash scripts/ci-unit.sh
bash scripts/ci-start-isolated-db.sh
bash scripts/ci-db-migrate.sh
bash scripts/ci-api-integration.sh
bash scripts/ci-seed-test-data.sh
bash scripts/ci-playwright-e2e.sh
bash scripts/ci-build-images.sh
bash scripts/ci-k8s-deploy.sh
bash scripts/ci-k8s-health-check.sh

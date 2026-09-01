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

junit_dir="$CI_EVIDENCE_DIR/test-results/junit"
junit_report="$junit_dir/api-integration.xml"
mkdir -p "$junit_dir"

JUNIT_OUTPUT_FILE="$junit_report" \
  npm --workspace backend run test:api -- \
  --reporters=default --reporters="$ROOT_DIR/scripts/jest-junit-reporter.cjs"

if [[ ! -s "$junit_report" ]] || ! grep -q '<testsuite' "$junit_report"; then
  echo "Missing or invalid API JUnit report: $junit_report" >&2
  exit 1
fi

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 07-api-integration

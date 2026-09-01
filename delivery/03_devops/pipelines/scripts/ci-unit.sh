#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

junit_dir="$CI_EVIDENCE_DIR/test-results/junit"
jest_reporter="$ROOT_DIR/scripts/jest-junit-reporter.cjs"
mkdir -p "$junit_dir"

JUNIT_OUTPUT_FILE="$junit_dir/requirements.xml" npm run test:requirements

JUNIT_OUTPUT_FILE="$junit_dir/backend.xml" \
  npm --workspace backend run test -- \
  --reporters=default --reporters="$jest_reporter"

npm --workspace frontend run test -- \
  --reporter=default --reporter=junit \
  --outputFile.junit="$junit_dir/frontend.xml"

npm --workspace @videoplayer/shared-contracts run build

service_reports=(
  '@videoplayer/shared-contracts:service-shared-contracts'
  '@videoplayer/identity-community:service-identity-community'
  '@videoplayer/content-media:service-content-media'
  '@videoplayer/live-reward:service-live-reward'
  '@videoplayer/governance-ai:service-governance-ai'
  '@videoplayer/gateway:service-gateway'
)

for service_report in "${service_reports[@]}"; do
  service_workspace=${service_report%%:*}
  report_name=${service_report#*:}
  npm --workspace "$service_workspace" run test -- \
    --reporter=default --reporter=junit \
    --outputFile.junit="$junit_dir/$report_name.xml"
done

expected_unit_reports=(
  requirements.xml
  backend.xml
  frontend.xml
  service-shared-contracts.xml
  service-identity-community.xml
  service-content-media.xml
  service-live-reward.xml
  service-governance-ai.xml
  service-gateway.xml
)

for report_name in "${expected_unit_reports[@]}"; do
  report_path="$junit_dir/$report_name"
  if [[ ! -s "$report_path" ]] || ! grep -q '<testsuite' "$report_path"; then
    echo "Missing or invalid JUnit report: $report_path" >&2
    exit 1
  fi
done

printf 'unit_junit_reports=%s\n' "${#expected_unit_reports[@]}" \
  > "$CI_EVIDENCE_DIR/junit-summary.properties"

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 05-unit

if [[ "$FORCE_TEST_FAILURE" == "true" ]]; then
  printf 'intentional_failure=true\nfailed_after=05-unit\n' \
    > "$CI_EVIDENCE_DIR/intentional-failure.properties"
  echo "Intentional CI failure requested after unit tests." >&2
  exit 42
fi

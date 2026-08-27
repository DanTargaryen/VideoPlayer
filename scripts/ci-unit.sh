#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

npm run test:requirements
npm test
npm run test:services
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 05-unit

if [[ "$FORCE_TEST_FAILURE" == "true" ]]; then
  printf 'intentional_failure=true\nfailed_after=05-unit\n' \
    > "$CI_EVIDENCE_DIR/intentional-failure.properties"
  echo "Intentional CI failure requested after unit tests." >&2
  exit 42
fi

#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

export K8S_NAMESPACE
export KIND_CLUSTER_NAME
export PRACTICE_ENV_FILE

bash "$ROOT_DIR/scripts/k8s-deploy.sh" "$IMAGE_TAG"
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 11-kind-deploy

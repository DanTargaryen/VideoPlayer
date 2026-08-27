#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

export K8S_NAMESPACE
kubectl config use-context "kind-$KIND_CLUSTER_NAME" >/dev/null
bash "$ROOT_DIR/scripts/k8s-health-check.sh"
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 12-health-check

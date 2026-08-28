#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

export K8S_NAMESPACE
export KIND_CLUSTER_NAME
export PRACTICE_ENV_FILE
export SERVICE_JWT_SECRET
export CONTENT_DB_PASSWORD
export MYSQL_ROOT_PASSWORD

bash "$ROOT_DIR/scripts/k8s-deploy.sh" "$IMAGE_TAG"
bash "$ROOT_DIR/scripts/k8s-deploy-microservices.sh" "$IMAGE_TAG"
bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 11-kind-deploy

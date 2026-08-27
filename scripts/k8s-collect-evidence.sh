#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
ensure_ci_dirs

if [[ ! -f "$CI_RUNTIME_ENV_FILE" ]]; then
  printf 'kubernetes_evidence=unavailable_before_bootstrap\n' \
    > "$CI_EVIDENCE_DIR/kubernetes-status.properties"
  exit 0
fi

load_runtime_env
if ! kind get clusters 2>/dev/null | grep -Fxq "$KIND_CLUSTER_NAME"; then
  printf 'kubernetes_evidence=cluster_not_created\ncluster=%s\n' "$KIND_CLUSTER_NAME" \
    > "$CI_EVIDENCE_DIR/kubernetes-status.properties"
  exit 0
fi

kubectl config use-context "kind-$KIND_CLUSTER_NAME" >/dev/null
kubectl get nodes -o wide > "$CI_EVIDENCE_DIR/kubernetes-nodes.txt"
kubectl -n "$K8S_NAMESPACE" get pods,services,pvc -o wide \
  > "$CI_EVIDENCE_DIR/kubernetes-workloads.txt"
kubectl -n "$K8S_NAMESPACE" get pods \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,IMAGE:.spec.containers[*].image,RESTARTS:.status.containerStatuses[*].restartCount' \
  > "$CI_EVIDENCE_DIR/kubernetes-images.txt"
kubectl -n "$K8S_NAMESPACE" logs job/db-migrate --all-containers=true --tail=200 \
  > "$CI_EVIDENCE_DIR/kubernetes-migration.log" 2>&1 || true
printf 'kubernetes_evidence=collected\ncluster=%s\nnamespace=%s\n' \
  "$KIND_CLUSTER_NAME" "$K8S_NAMESPACE" \
  > "$CI_EVIDENCE_DIR/kubernetes-status.properties"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAMESPACE=${K8S_NAMESPACE:-video-player}
CLUSTER_NAME=${KIND_CLUSTER_NAME:-video-player}
IMAGE_TAG=${1:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}
SERVICE_JWT_SECRET=${SERVICE_JWT_SECRET:-}

for command_name in docker kind kubectl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid image tag: $IMAGE_TAG" >&2
  exit 1
fi
if [[ ${#SERVICE_JWT_SECRET} -lt 32 ]]; then
  echo "SERVICE_JWT_SECRET must contain at least 32 characters." >&2
  exit 1
fi

services=(identity-community content-media live-reward governance-ai gateway)
images=()
for service in "${services[@]}"; do
  image="video-player/$service:$IMAGE_TAG"
  docker image inspect "$image" >/dev/null
  images+=("$image")
done

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  echo "Kind cluster $CLUSTER_NAME does not exist; deploy the monolith baseline first." >&2
  exit 1
fi

kubectl config use-context "kind-$CLUSTER_NAME" >/dev/null
kind load docker-image "${images[@]}" --name "$CLUSTER_NAME"

kubectl apply -f "$ROOT_DIR/deploy/k8s/microservices/namespace.yaml"
kubectl -n "$NAMESPACE" create secret generic videoplayer-microservice-secrets \
  --from-literal=service-jwt-secret="$SERVICE_JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k "$ROOT_DIR/deploy/k8s/microservices"
kubectl -n "$NAMESPACE" patch configmap videoplayer-microservice-config \
  --type merge \
  -p "{\"data\":{\"GIT_SHA\":\"$IMAGE_TAG\"}}"

for service in "${services[@]}"; do
  kubectl -n "$NAMESPACE" set image "deployment/$service" "$service=video-player/$service:$IMAGE_TAG"
  kubectl -n "$NAMESPACE" rollout status "deployment/$service" --timeout=180s
done

echo "Microservice scaffold deployed with image tag $IMAGE_TAG."
kubectl -n "$NAMESPACE" get deployments,services -l app.kubernetes.io/part-of=video-player-microservices

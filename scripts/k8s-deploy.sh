#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAMESPACE=${K8S_NAMESPACE:-video-player}
CLUSTER_NAME=${KIND_CLUSTER_NAME:-video-player}
ENV_FILE=${PRACTICE_ENV_FILE:-"$ROOT_DIR/.env.practice"}
IMAGE_TAG=${1:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}

if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid image tag: $IMAGE_TAG" >&2
  exit 1
fi

for command in docker kind kubectl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE; copy deploy/practice.env.example and replace its placeholders." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for variable in MYSQL_ROOT_PASSWORD JWT_SECRET ADMIN_SECRET; do
  if [[ -z "${!variable:-}" || "${!variable}" == replace-with-* ]]; then
    echo "Set a non-placeholder $variable in $ENV_FILE." >&2
    exit 1
  fi
done

BACKEND_IMAGE="video-player/backend:$IMAGE_TAG"
FRONTEND_IMAGE="video-player/frontend:$IMAGE_TAG"
MYSQL_IMAGE="mysql:8.0"

docker image inspect "$BACKEND_IMAGE" >/dev/null
docker image inspect "$FRONTEND_IMAGE" >/dev/null
docker image inspect "$MYSQL_IMAGE" >/dev/null

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  kind create cluster --name "$CLUSTER_NAME" --wait 180s
fi

kubectl config use-context "kind-$CLUSTER_NAME" >/dev/null
kind load docker-image "$BACKEND_IMAGE" "$FRONTEND_IMAGE" --name "$CLUSTER_NAME"

# `kind load` can fail for the Docker Engine multi-platform metadata attached to
# the official MySQL image. Importing the single local platform archive avoids
# any registry access from the Kind node and is deterministic on offline hosts.
MYSQL_ARCHIVE=$(mktemp "${TMPDIR:-/tmp}/videoplayer-mysql.XXXXXX.tar")
trap 'rm -f "$MYSQL_ARCHIVE"' EXIT
docker save -o "$MYSQL_ARCHIVE" "$MYSQL_IMAGE"
docker exec --privileged -i "$CLUSTER_NAME-control-plane" \
  ctr --namespace=k8s.io images import --snapshotter=overlayfs - < "$MYSQL_ARCHIVE"
rm -f "$MYSQL_ARCHIVE"
trap - EXIT

kubectl apply -f "$ROOT_DIR/deploy/k8s/namespace.yaml"
kubectl -n "$NAMESPACE" create secret generic videoplayer-secrets \
  --from-literal=mysql-root-password="$MYSQL_ROOT_PASSWORD" \
  --from-literal=database-url="mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/video_player" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=admin-secret="$ADMIN_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f "$ROOT_DIR/deploy/k8s/configmap.yaml"
kubectl apply -f "$ROOT_DIR/deploy/k8s/mysql-service.yaml"
kubectl apply -f "$ROOT_DIR/deploy/k8s/mysql-statefulset.yaml"
kubectl -n "$NAMESPACE" rollout status statefulset/mysql --timeout=240s

kubectl -n "$NAMESPACE" delete job db-migrate --ignore-not-found
sed "s|video-player/backend:local|$BACKEND_IMAGE|g" \
  "$ROOT_DIR/deploy/k8s/db-migrate-job.yaml" | kubectl apply -f -
if ! kubectl -n "$NAMESPACE" wait --for=condition=complete job/db-migrate --timeout=240s; then
  kubectl -n "$NAMESPACE" logs job/db-migrate --all-containers=true --tail=200 || true
  exit 1
fi

kubectl apply -f "$ROOT_DIR/deploy/k8s/backend-service.yaml"
sed "s|video-player/backend:local|$BACKEND_IMAGE|g" \
  "$ROOT_DIR/deploy/k8s/backend-deployment.yaml" | kubectl apply -f -
kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=240s

kubectl apply -f "$ROOT_DIR/deploy/k8s/frontend-service.yaml"
sed "s|video-player/frontend:local|$FRONTEND_IMAGE|g" \
  "$ROOT_DIR/deploy/k8s/frontend-deployment.yaml" | kubectl apply -f -
kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout=180s

echo "Kubernetes deployment completed with image tag $IMAGE_TAG."
kubectl -n "$NAMESPACE" get pods,services,pvc

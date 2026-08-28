#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAMESPACE=${K8S_NAMESPACE:-video-player}
CLUSTER_NAME=${KIND_CLUSTER_NAME:-video-player}
IMAGE_TAG=${1:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}
SERVICE_JWT_SECRET=${SERVICE_JWT_SECRET:-}
IDENTITY_DATABASE_NAME=${IDENTITY_DATABASE_NAME:-}
IDENTITY_DATABASE_USER=${IDENTITY_DATABASE_USER:-}
IDENTITY_DATABASE_PASSWORD=${IDENTITY_DATABASE_PASSWORD:-}
IDENTITY_DATABASE_URL=${IDENTITY_DATABASE_URL:-}
IDENTITY_ADMIN_SECRET=${IDENTITY_ADMIN_SECRET:-}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-}
CONTENT_DB_PASSWORD=${CONTENT_DB_PASSWORD:-}

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
if [[ ${#IDENTITY_ADMIN_SECRET} -lt 32 ]]; then
  echo "IDENTITY_ADMIN_SECRET must contain at least 32 characters." >&2
  exit 1
fi
if [[ ! "$IDENTITY_DATABASE_NAME" =~ ^[A-Za-z0-9_]+test[A-Za-z0-9_]*$ ]]; then
  echo "IDENTITY_DATABASE_NAME must be a test database with a safe identifier." >&2
  exit 1
fi
if [[ ! "$IDENTITY_DATABASE_USER" =~ ^[A-Za-z0-9_]+$ || -z "$IDENTITY_DATABASE_PASSWORD" ]]; then
  echo "Set a safe IDENTITY_DATABASE_USER and non-empty IDENTITY_DATABASE_PASSWORD." >&2
  exit 1
fi
if [[ -z "$IDENTITY_DATABASE_URL" || -z "$MYSQL_ROOT_PASSWORD" ]]; then
  echo "IDENTITY_DATABASE_URL and MYSQL_ROOT_PASSWORD are required." >&2
  exit 1
fi
if [[ ${#CONTENT_DB_PASSWORD} -lt 24 || ! "$CONTENT_DB_PASSWORD" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "CONTENT_DB_PASSWORD must contain at least 24 alphanumeric characters." >&2
  exit 1
fi

services=(identity-community content-media live-reward governance-ai gateway)
images=()
for service in "${services[@]}"; do
  image="video-player/$service:$IMAGE_TAG"
  docker image inspect "$image" >/dev/null
  images+=("$image")
done
identity_migration_image="video-player/identity-community-migration:$IMAGE_TAG"
content_migration_image="video-player/content-media-migrate:$IMAGE_TAG"
docker image inspect "$identity_migration_image" >/dev/null
docker image inspect "$content_migration_image" >/dev/null
images+=("$identity_migration_image" "$content_migration_image")

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  echo "Kind cluster $CLUSTER_NAME does not exist; deploy the monolith baseline first." >&2
  exit 1
fi

kubectl config use-context "kind-$CLUSTER_NAME" >/dev/null
kind load docker-image "${images[@]}" --name "$CLUSTER_NAME"

kubectl apply -f "$ROOT_DIR/deploy/k8s/microservices/namespace.yaml"
kubectl -n "$NAMESPACE" rollout status statefulset/mysql --timeout=240s
kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
  env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e \
  "CREATE DATABASE IF NOT EXISTS \`$IDENTITY_DATABASE_NAME\`; CREATE USER IF NOT EXISTS '$IDENTITY_DATABASE_USER'@'%' IDENTIFIED BY '$IDENTITY_DATABASE_PASSWORD'; ALTER USER '$IDENTITY_DATABASE_USER'@'%' IDENTIFIED BY '$IDENTITY_DATABASE_PASSWORD'; GRANT ALL PRIVILEGES ON \`$IDENTITY_DATABASE_NAME\`.* TO '$IDENTITY_DATABASE_USER'@'%'; FLUSH PRIVILEGES;"
kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
  env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e \
  "CREATE DATABASE IF NOT EXISTS content_media CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'content_media'@'%' IDENTIFIED BY '${CONTENT_DB_PASSWORD}'; ALTER USER 'content_media'@'%' IDENTIFIED BY '${CONTENT_DB_PASSWORD}'; GRANT ALL PRIVILEGES ON content_media.* TO 'content_media'@'%'; FLUSH PRIVILEGES;"
kubectl -n "$NAMESPACE" create secret generic videoplayer-microservice-secrets \
  --from-literal=service-jwt-secret="$SERVICE_JWT_SECRET" \
  --from-literal=identity-database-url="$IDENTITY_DATABASE_URL" \
  --from-literal=identity-admin-secret="$IDENTITY_ADMIN_SECRET" \
  --from-literal=content-database-url="mysql://content_media:${CONTENT_DB_PASSWORD}@mysql:3306/content_media" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$NAMESPACE" delete job identity-migrate --ignore-not-found
sed "s|video-player/identity-community-migration:local|$identity_migration_image|g" \
  "$ROOT_DIR/deploy/k8s/microservices/identity-migrate-job.yaml" | kubectl apply -f -
if ! kubectl -n "$NAMESPACE" wait --for=condition=complete job/identity-migrate --timeout=240s; then
  kubectl -n "$NAMESPACE" logs job/identity-migrate --all-containers=true --tail=200 || true
  exit 1
fi
identity_database_list=$(kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
  env MYSQL_PWD="$IDENTITY_DATABASE_PASSWORD" mysql -N -u"$IDENTITY_DATABASE_USER" -e 'SHOW DATABASES')
grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$identity_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$identity_database_list" >/dev/null; then
  echo "identity database account can access the monolith schema" >&2
  exit 1
fi

kubectl -n "$NAMESPACE" delete job content-migrate --ignore-not-found
sed "s|video-player/content-media-migrate:local|$content_migration_image|g" \
  "$ROOT_DIR/deploy/k8s/microservices/content-migrate-job.yaml" | kubectl apply -f -
if ! kubectl -n "$NAMESPACE" wait --for=condition=complete job/content-migrate --timeout=240s; then
  kubectl -n "$NAMESPACE" logs job/content-migrate --all-containers=true --tail=200 || true
  exit 1
fi
content_database_list=$(kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
  env MYSQL_PWD="$CONTENT_DB_PASSWORD" mysql -N -ucontent_media -e 'SHOW DATABASES')
grep -Fx 'content_media' <<<"$content_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$content_database_list" >/dev/null || grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$content_database_list" >/dev/null; then
  echo "content database account can access another service schema" >&2
  exit 1
fi

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

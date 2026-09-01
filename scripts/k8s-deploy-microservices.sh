#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAMESPACE=${K8S_NAMESPACE:-video-player}
CLUSTER_NAME=${KIND_CLUSTER_NAME:-video-player}
IMAGE_TAG=${1:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}
RELEASE_LOCAL_IMAGES=${KIND_RELEASE_LOCAL_IMAGES_AFTER_IMPORT:-false}
SERVICE_JWT_SECRET=${SERVICE_JWT_SECRET:-}
IDENTITY_DATABASE_NAME=${IDENTITY_DATABASE_NAME:-}
IDENTITY_DATABASE_USER=${IDENTITY_DATABASE_USER:-}
IDENTITY_DATABASE_PASSWORD=${IDENTITY_DATABASE_PASSWORD:-}
IDENTITY_DATABASE_URL=${IDENTITY_DATABASE_URL:-}
IDENTITY_ADMIN_SECRET=${IDENTITY_ADMIN_SECRET:-}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-}
CONTENT_DB_PASSWORD=${CONTENT_DB_PASSWORD:-}
CONTENT_MINIO_ACCESS_KEY=${CONTENT_MINIO_ACCESS_KEY:-}
CONTENT_MINIO_SECRET_KEY=${CONTENT_MINIO_SECRET_KEY:-}
LIVE_REWARD_DATABASE_NAME=${LIVE_REWARD_DATABASE_NAME:-}
LIVE_REWARD_DATABASE_USER=${LIVE_REWARD_DATABASE_USER:-}
LIVE_REWARD_DATABASE_PASSWORD=${LIVE_REWARD_DATABASE_PASSWORD:-}
LIVE_REWARD_DATABASE_URL=${LIVE_REWARD_DATABASE_URL:-}
GOVERNANCE_DATABASE_NAME=${GOVERNANCE_DATABASE_NAME:-}
GOVERNANCE_DATABASE_USER=${GOVERNANCE_DATABASE_USER:-}
GOVERNANCE_DATABASE_PASSWORD=${GOVERNANCE_DATABASE_PASSWORD:-}
GOVERNANCE_DATABASE_URL=${GOVERNANCE_DATABASE_URL:-}

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
if [[ -z "$CONTENT_MINIO_ACCESS_KEY" || ${#CONTENT_MINIO_SECRET_KEY} -lt 24 ]]; then
  echo "CONTENT_MINIO_ACCESS_KEY and a secret with at least 24 characters are required." >&2
  exit 1
fi
if [[ ! "$LIVE_REWARD_DATABASE_NAME" =~ ^[A-Za-z0-9_]+test[A-Za-z0-9_]*$ ]]; then
  echo "LIVE_REWARD_DATABASE_NAME must be a test database with a safe identifier." >&2
  exit 1
fi
if [[ ! "$LIVE_REWARD_DATABASE_USER" =~ ^[A-Za-z0-9_]+$ || ${#LIVE_REWARD_DATABASE_PASSWORD} -lt 24 ]]; then
  echo "Set a safe LIVE_REWARD_DATABASE_USER and a password with at least 24 characters." >&2
  exit 1
fi
if [[ -z "$LIVE_REWARD_DATABASE_URL" ]]; then
  echo "LIVE_REWARD_DATABASE_URL is required." >&2
  exit 1
fi
if [[ ! "$GOVERNANCE_DATABASE_NAME" =~ ^[A-Za-z0-9_]+test[A-Za-z0-9_]*$ ]]; then
  echo "GOVERNANCE_DATABASE_NAME must be a test database with a safe identifier." >&2
  exit 1
fi
if [[ ! "$GOVERNANCE_DATABASE_USER" =~ ^[A-Za-z0-9_]+$ || ${#GOVERNANCE_DATABASE_PASSWORD} -lt 24 ]]; then
  echo "Set a safe GOVERNANCE_DATABASE_USER and a password with at least 24 characters." >&2
  exit 1
fi
if [[ -z "$GOVERNANCE_DATABASE_URL" ]]; then
  echo "GOVERNANCE_DATABASE_URL is required." >&2
  exit 1
fi

services=(identity-community content-media live-reward governance-ai gateway)
runtime_images=()
for service in "${services[@]}"; do
  image="video-player/$service:$IMAGE_TAG"
  docker image inspect "$image" >/dev/null
  runtime_images+=("$image")
done
identity_migration_image="video-player/identity-community-migration:$IMAGE_TAG"
content_migration_image="video-player/content-media-migrate:$IMAGE_TAG"
live_migration_image="video-player/live-reward-migration:$IMAGE_TAG"
governance_migration_image="video-player/governance-ai-migration:$IMAGE_TAG"
docker image inspect "$identity_migration_image" >/dev/null
docker image inspect "$content_migration_image" >/dev/null
docker image inspect "$live_migration_image" >/dev/null
docker image inspect "$governance_migration_image" >/dev/null
content_minio_image="minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e"
docker image inspect "$content_minio_image" >/dev/null || docker pull "$content_minio_image"
content_minio_local_image="video-player/content-minio:$IMAGE_TAG"
docker tag "$content_minio_image" "$content_minio_local_image"
runtime_images+=("$content_minio_local_image")

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  echo "Kind cluster $CLUSTER_NAME does not exist; deploy the monolith baseline first." >&2
  exit 1
fi

kubectl config use-context "kind-$CLUSTER_NAME" >/dev/null
kind_node="$CLUSTER_NAME-control-plane"
migration_evidence_dir="${CI_EVIDENCE_DIR:-$ROOT_DIR/.codex-run/k8s-migration-evidence}/k8s-migrations"
mkdir -p "$migration_evidence_dir"

load_kind_image() {
  local image=$1
  local image_archive
  image_archive=$(mktemp "${TMPDIR:-/tmp}/videoplayer-microservice-image.XXXXXX.tar")
  docker save -o "$image_archive" "$image"
  docker exec --privileged -i "$kind_node" \
    ctr --namespace=k8s.io images import --snapshotter=overlayfs - < "$image_archive"
  rm -f "$image_archive"
  if [[ "$RELEASE_LOCAL_IMAGES" == "true" ]]; then
    docker image rm "$image" >/dev/null
  fi
}

archive_and_release_migration() {
  local job_name=$1
  local image=$2
  kubectl -n "$NAMESPACE" logs "job/$job_name" --all-containers=true \
    > "$migration_evidence_dir/$job_name.log"
  kubectl -n "$NAMESPACE" get job "$job_name" -o yaml \
    > "$migration_evidence_dir/$job_name.yaml"
  kubectl -n "$NAMESPACE" delete job "$job_name" --wait=true
  docker exec --privileged "$kind_node" crictl rmi "$image" >/dev/null 2>&1 \
    || docker exec --privileged "$kind_node" ctr --namespace=k8s.io images rm "$image" >/dev/null 2>&1 \
    || true
  docker exec --privileged "$kind_node" ctr --namespace=k8s.io content prune references >/dev/null 2>&1 || true
}

kubectl apply -f "$ROOT_DIR/deploy/k8s/microservices/namespace.yaml"
kubectl -n "$NAMESPACE" rollout status statefulset/mysql --timeout=240s
mysql_root_exec() {
  local statement=$1
  for attempt in $(seq 1 30); do
    if kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
      env MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h 127.0.0.1 -uroot -e "$statement"; then
      return 0
    fi
    if [[ "$attempt" -lt 30 ]]; then sleep 2; fi
  done
  echo "MySQL did not accept the idempotent microservice schema bootstrap." >&2
  return 1
}

mysql_root_exec \
  "CREATE DATABASE IF NOT EXISTS \`$IDENTITY_DATABASE_NAME\`; CREATE USER IF NOT EXISTS '$IDENTITY_DATABASE_USER'@'%' IDENTIFIED BY '$IDENTITY_DATABASE_PASSWORD'; ALTER USER '$IDENTITY_DATABASE_USER'@'%' IDENTIFIED BY '$IDENTITY_DATABASE_PASSWORD'; GRANT ALL PRIVILEGES ON \`$IDENTITY_DATABASE_NAME\`.* TO '$IDENTITY_DATABASE_USER'@'%'; FLUSH PRIVILEGES;"
mysql_root_exec \
  "CREATE DATABASE IF NOT EXISTS content_media CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'content_media'@'%' IDENTIFIED BY '${CONTENT_DB_PASSWORD}'; ALTER USER 'content_media'@'%' IDENTIFIED BY '${CONTENT_DB_PASSWORD}'; GRANT ALL PRIVILEGES ON content_media.* TO 'content_media'@'%'; FLUSH PRIVILEGES;"
mysql_root_exec \
  "CREATE DATABASE IF NOT EXISTS \`$LIVE_REWARD_DATABASE_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '$LIVE_REWARD_DATABASE_USER'@'%' IDENTIFIED BY '${LIVE_REWARD_DATABASE_PASSWORD}'; ALTER USER '$LIVE_REWARD_DATABASE_USER'@'%' IDENTIFIED BY '${LIVE_REWARD_DATABASE_PASSWORD}'; GRANT ALL PRIVILEGES ON \`$LIVE_REWARD_DATABASE_NAME\`.* TO '$LIVE_REWARD_DATABASE_USER'@'%'; FLUSH PRIVILEGES;"
mysql_root_exec \
  "CREATE DATABASE IF NOT EXISTS \`$GOVERNANCE_DATABASE_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '$GOVERNANCE_DATABASE_USER'@'%' IDENTIFIED BY '${GOVERNANCE_DATABASE_PASSWORD}'; ALTER USER '$GOVERNANCE_DATABASE_USER'@'%' IDENTIFIED BY '${GOVERNANCE_DATABASE_PASSWORD}'; GRANT ALL PRIVILEGES ON \`$GOVERNANCE_DATABASE_NAME\`.* TO '$GOVERNANCE_DATABASE_USER'@'%'; FLUSH PRIVILEGES;"
kubectl -n "$NAMESPACE" create secret generic videoplayer-microservice-secrets \
  --from-literal=service-jwt-secret="$SERVICE_JWT_SECRET" \
  --from-literal=identity-database-url="$IDENTITY_DATABASE_URL" \
  --from-literal=identity-admin-secret="$IDENTITY_ADMIN_SECRET" \
  --from-literal=content-database-url="mysql://content_media:${CONTENT_DB_PASSWORD}@mysql:3306/content_media" \
  --from-literal=live-reward-database-url="$LIVE_REWARD_DATABASE_URL" \
  --from-literal=governance-database-url="$GOVERNANCE_DATABASE_URL" \
  --from-literal=minio-access-key="$CONTENT_MINIO_ACCESS_KEY" \
  --from-literal=minio-secret-key="$CONTENT_MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
load_kind_image "$identity_migration_image"
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
archive_and_release_migration identity-migrate "$identity_migration_image"

load_kind_image "$content_migration_image"
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
archive_and_release_migration content-migrate "$content_migration_image"

load_kind_image "$live_migration_image"
kubectl -n "$NAMESPACE" delete job live-reward-migrate --ignore-not-found
sed "s|video-player/live-reward-migration:local|$live_migration_image|g; s|mysql:3306/video_player_live_reward_ci_test|mysql:3306/$LIVE_REWARD_DATABASE_NAME|g" \
  "$ROOT_DIR/deploy/k8s/microservices/live-reward-migrate-job.yaml" | kubectl apply -f -
if ! kubectl -n "$NAMESPACE" wait --for=condition=complete job/live-reward-migrate --timeout=240s; then
  kubectl -n "$NAMESPACE" logs job/live-reward-migrate --all-containers=true --tail=200 || true
  exit 1
fi
live_database_list=$(kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
  env MYSQL_PWD="$LIVE_REWARD_DATABASE_PASSWORD" mysql -N -u"$LIVE_REWARD_DATABASE_USER" -e 'SHOW DATABASES')
grep -Fx "$LIVE_REWARD_DATABASE_NAME" <<<"$live_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$live_database_list" >/dev/null || grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$live_database_list" >/dev/null || grep -Fx 'content_media' <<<"$live_database_list" >/dev/null; then
  echo "live-reward database account can access another service schema" >&2
  exit 1
fi
archive_and_release_migration live-reward-migrate "$live_migration_image"

load_kind_image "$governance_migration_image"
kubectl -n "$NAMESPACE" delete job governance-migrate --ignore-not-found
sed "s|video-player/governance-ai-migration:local|$governance_migration_image|g" \
  "$ROOT_DIR/deploy/k8s/microservices/governance-migrate-job.yaml" | kubectl apply -f -
if ! kubectl -n "$NAMESPACE" wait --for=condition=complete job/governance-migrate --timeout=240s; then
  kubectl -n "$NAMESPACE" logs job/governance-migrate --all-containers=true --tail=200 || true
  exit 1
fi
governance_database_list=$(kubectl -n "$NAMESPACE" exec statefulset/mysql -- \
  env MYSQL_PWD="$GOVERNANCE_DATABASE_PASSWORD" mysql -N -u"$GOVERNANCE_DATABASE_USER" -e 'SHOW DATABASES')
grep -Fx "$GOVERNANCE_DATABASE_NAME" <<<"$governance_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$governance_database_list" >/dev/null || grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$governance_database_list" >/dev/null || grep -Fx 'content_media' <<<"$governance_database_list" >/dev/null || grep -Fx "$LIVE_REWARD_DATABASE_NAME" <<<"$governance_database_list" >/dev/null; then
  echo "governance database account can access another service schema" >&2
  exit 1
fi
archive_and_release_migration governance-migrate "$governance_migration_image"

for image in "${runtime_images[@]}"; do
  load_kind_image "$image"
done

kubectl apply -k "$ROOT_DIR/deploy/k8s/microservices"
kubectl -n "$NAMESPACE" patch configmap videoplayer-microservice-config \
  --type merge \
  -p "{\"data\":{\"GIT_SHA\":\"$IMAGE_TAG\"}}"

for service in "${services[@]}"; do
  kubectl -n "$NAMESPACE" set image "deployment/$service" "$service=video-player/$service:$IMAGE_TAG"
done
kubectl -n "$NAMESPACE" set image statefulset/content-minio "minio=$content_minio_local_image"
kubectl -n "$NAMESPACE" delete pod content-minio-0 --ignore-not-found --wait=true
kubectl -n "$NAMESPACE" rollout status statefulset/content-minio --timeout=180s
for service in "${services[@]}"; do
  kubectl -n "$NAMESPACE" rollout restart "deployment/$service"
  kubectl -n "$NAMESPACE" rollout status "deployment/$service" --timeout=180s
done

echo "Microservice scaffold deployed with image tag $IMAGE_TAG."
kubectl -n "$NAMESPACE" get deployments,services -l app.kubernetes.io/part-of=video-player-microservices

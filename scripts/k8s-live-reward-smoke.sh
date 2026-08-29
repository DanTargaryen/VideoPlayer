#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAMESPACE=video-player-live-reward
CLUSTER_NAME=${KIND_CLUSTER_NAME:-video-player-live-reward}
KIND_BIN=${KIND_BIN:-kind}
KUBECTL_BIN=${KUBECTL_BIN:-kubectl}
IMAGE_TAG=${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}
SERVICE_JWT_SECRET=${SERVICE_JWT_SECRET:-}
MYSQL_ROOT_PASSWORD=live_reward_kind_root_fixture
MYSQL_PASSWORD=live_reward_kind_fixture
DATABASE_URL="mysql://live_reward:${MYSQL_PASSWORD}@live-reward-mysql:3306/live_reward"
CREATED_CLUSTER=false

for command_name in docker sed; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done
if ! command -v "$KIND_BIN" >/dev/null 2>&1 && [[ ! -x "$KIND_BIN" ]]; then
  echo "Missing required command: $KIND_BIN" >&2
  exit 1
fi
if ! command -v "$KUBECTL_BIN" >/dev/null 2>&1 && [[ ! -x "$KUBECTL_BIN" ]]; then
  echo "Missing required command: $KUBECTL_BIN" >&2
  exit 1
fi

if [[ ${#SERVICE_JWT_SECRET} -lt 32 ]]; then
  echo "SERVICE_JWT_SECRET must contain at least 32 characters." >&2
  exit 1
fi
if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid image tag: $IMAGE_TAG" >&2
  exit 1
fi

cleanup() {
  if [[ "${KEEP_LIVE_REWARD_NAMESPACE:-false}" != "true" ]]; then
    "$KUBECTL_BIN" --context "kind-$CLUSTER_NAME" delete namespace "$NAMESPACE" --ignore-not-found --wait=true >/dev/null 2>&1 || true
  fi
  if [[ "$CREATED_CLUSTER" == "true" && "${KEEP_LIVE_REWARD_CLUSTER:-false}" != "true" ]]; then
    "$KIND_BIN" delete cluster --name "$CLUSTER_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! "$KIND_BIN" get clusters | grep -Fxq "$CLUSTER_NAME"; then
  "$KIND_BIN" create cluster --name "$CLUSTER_NAME"
  CREATED_CLUSTER=true
fi
"$KUBECTL_BIN" config use-context "kind-$CLUSTER_NAME" >/dev/null

runtime_image="video-player/live-reward:$IMAGE_TAG"
migration_image="video-player/live-reward-migrate:$IMAGE_TAG"
mysql_image="video-player/mysql:8.0-local"
docker_platform=$(docker info --format '{{.OSType}}/{{.Architecture}}')
docker_build_args=(build --platform "$docker_platform")
if docker build --help 2>&1 | grep -q -- '--provenance'; then
  docker_build_args+=(--provenance=false)
fi
docker "${docker_build_args[@]}" -f "$ROOT_DIR/services/live-reward/Dockerfile" -t "$runtime_image" "$ROOT_DIR"
docker "${docker_build_args[@]}" --target migration -f "$ROOT_DIR/services/live-reward/Dockerfile" -t "$migration_image" "$ROOT_DIR"
docker "${docker_build_args[@]}" -f "$ROOT_DIR/deploy/k8s/live-reward/Dockerfile.mysql" -t "$mysql_image" "$ROOT_DIR/deploy/k8s/live-reward"
"$KIND_BIN" load docker-image "$runtime_image" "$migration_image" --name "$CLUSTER_NAME"
mysql_archive=$(mktemp "${TMPDIR:-/tmp}/live-reward-mysql.XXXXXX.tar")
trap 'rm -f "$mysql_archive"; cleanup' EXIT
docker save -o "$mysql_archive" "$mysql_image"
docker exec --privileged -i "$CLUSTER_NAME-control-plane" \
  ctr --namespace=k8s.io images import --snapshotter=overlayfs - < "$mysql_archive"
rm -f "$mysql_archive"
trap cleanup EXIT

"$KUBECTL_BIN" apply -f "$ROOT_DIR/deploy/k8s/live-reward/namespace.yaml"
"$KUBECTL_BIN" -n "$NAMESPACE" create secret generic live-reward-secrets \
  --from-literal=mysql-root-password="$MYSQL_ROOT_PASSWORD" \
  --from-literal=mysql-password="$MYSQL_PASSWORD" \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=service-jwt-secret="$SERVICE_JWT_SECRET" \
  --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -
"$KUBECTL_BIN" -n "$NAMESPACE" create configmap live-reward-config \
  --from-literal=GIT_SHA="$IMAGE_TAG" \
  --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -

sed "s|mysql:8.0|$mysql_image|" "$ROOT_DIR/deploy/k8s/live-reward/mysql.yaml" | "$KUBECTL_BIN" apply -f -
"$KUBECTL_BIN" -n "$NAMESPACE" rollout status deployment/live-reward-mysql --timeout=240s

"$KUBECTL_BIN" -n "$NAMESPACE" delete job live-reward-migration --ignore-not-found --wait=true
sed "s|video-player/live-reward-migrate:local|$migration_image|" "$ROOT_DIR/deploy/k8s/live-reward/migration-job.yaml" | "$KUBECTL_BIN" apply -f -
"$KUBECTL_BIN" -n "$NAMESPACE" wait --for=condition=complete job/live-reward-migration --timeout=180s

sed "s|video-player/live-reward:local|$runtime_image|" "$ROOT_DIR/deploy/k8s/live-reward/service.yaml" | "$KUBECTL_BIN" apply -f -
"$KUBECTL_BIN" -n "$NAMESPACE" rollout status deployment/live-reward --timeout=180s

"$KUBECTL_BIN" -n "$NAMESPACE" exec deployment/live-reward -- node --input-type=module -e \
  "import {issueServiceToken} from '@videoplayer/shared-contracts'; const requestId='kind-user-$IMAGE_TAG'; const token=issueServiceToken({caller:'gateway',audience:'live-reward',scopes:['live.user.forward'],secret:process.env.SERVICE_JWT_SECRET,requestId}); const headers={'x-user-id':'7','x-user-nickname':'kind-anchor','x-request-id':requestId,'x-gateway-authorization':'Bearer '+token,'content-type':'application/json'}; const post=(path,body={})=>fetch('http://127.0.0.1:3000'+path,{method:'POST',headers,body:JSON.stringify(body)}).then(async response=>{if(!response.ok)throw new Error(path+' '+response.status+' '+await response.text());return response.json()}); (async()=>{const title='kind-persistence-$IMAGE_TAG';const room=(await post('/api/v1/lives/rooms',{title})).data;const started=(await post('/api/v1/lives/rooms/'+room.id+'/start')).data;await post('/api/v1/lives/rooms/'+room.id+'/viewers',{viewerId:'kind-viewer'});await post('/api/v1/lives/rooms/'+room.id+'/messages',{content:'kind-message'});await post('/api/v1/gift-coins/daily-claim');console.log(JSON.stringify({title,roomId:room.id,sessionId:started.sessionId}));})().catch(error=>{console.error(error);process.exit(1)})"

pod_name=$("$KUBECTL_BIN" -n "$NAMESPACE" get pod -l app.kubernetes.io/name=live-reward -o jsonpath='{.items[0].metadata.name}')
"$KUBECTL_BIN" -n "$NAMESPACE" delete pod "$pod_name" --wait=true
"$KUBECTL_BIN" -n "$NAMESPACE" rollout status deployment/live-reward --timeout=180s

"$KUBECTL_BIN" -n "$NAMESPACE" exec deployment/live-reward -- node --input-type=module -e \
  "import {issueServiceToken} from '@videoplayer/shared-contracts'; const requestId='kind-user-read-$IMAGE_TAG'; const token=issueServiceToken({caller:'gateway',audience:'live-reward',scopes:['live.user.forward'],secret:process.env.SERVICE_JWT_SECRET,requestId}); const userHeaders={'x-user-id':'7','x-user-nickname':'kind-anchor','x-request-id':requestId,'x-gateway-authorization':'Bearer '+token}; Promise.all(['/health/live','/health/ready','/version'].map(path=>fetch('http://127.0.0.1:3000'+path).then(async response=>{if(!response.ok)throw new Error(path+' '+response.status);return [path,(await response.json()).data]}))).then(async health=>{const rooms=(await (await fetch('http://127.0.0.1:3000/api/v1/lives/rooms?keyword=kind-persistence-$IMAGE_TAG')).json()).data;const wallet=(await (await fetch('http://127.0.0.1:3000/api/v1/gift-coins/wallet',{headers:userHeaders})).json()).data;if(rooms.length!==1||rooms[0].viewerCount!==1||wallet.balance!==12)throw new Error('persistent state mismatch');console.log(JSON.stringify({health,room:rooms[0],wallet}));}).catch(error=>{console.error(error);process.exit(1)})"

"$KUBECTL_BIN" -n "$NAMESPACE" get pods,jobs,services,pvc
echo "live-reward isolated Kind smoke passed for image $IMAGE_TAG."

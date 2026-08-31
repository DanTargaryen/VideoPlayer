#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NAMESPACE=${K8S_NAMESPACE:-video-player}
CLUSTER_NAME=${KIND_CLUSTER_NAME:-video-player}
IMAGE_TAG=${IMAGE_TAG:-41fc8a11d2bb}
METRICS_SERVER_VERSION=${METRICS_SERVER_VERSION:-v0.9.0}
METRICS_SERVER_SHA256=${METRICS_SERVER_SHA256:-1cec29a5267809306a2c6ec74a3e449abbb705b4a8beed0c8a1963910f72c79b}
METRICS_SERVER_URL="https://github.com/kubernetes-sigs/metrics-server/releases/download/${METRICS_SERVER_VERSION}/components.yaml"
METRICS_SERVER_IMAGE="video-player/metrics-server:${METRICS_SERVER_VERSION}"
LOAD_SECONDS=${HPA_LOAD_SECONDS:-120}
LOAD_WORKERS=${HPA_LOAD_WORKERS:-64}
SCALE_UP_TIMEOUT=${HPA_SCALE_UP_TIMEOUT:-150}
SCALE_DOWN_TIMEOUT=${HPA_SCALE_DOWN_TIMEOUT:-210}
installed_metrics=false

for command_name in curl kind kubectl sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  echo "Kind cluster $CLUSTER_NAME does not exist." >&2
  exit 1
fi
kubectl config use-context "kind-$CLUSTER_NAME" >/dev/null
kubectl -n "$NAMESPACE" get deployment gateway >/dev/null

metrics_manifest=$(mktemp -t metrics-server.XXXXXX.yaml)
metrics_binary_dir=$(mktemp -d -t metrics-server-binary.XXXXXX)
cleanup() {
  cleanup_status=$?
  kubectl -n "$NAMESPACE" delete pod exp-hpa-load --ignore-not-found --wait=false >/dev/null 2>&1 || true
  kubectl -n "$NAMESPACE" delete hpa gateway --ignore-not-found >/dev/null 2>&1 || true
  kubectl -n "$NAMESPACE" scale deployment gateway --replicas=1 >/dev/null 2>&1 || true
  if [[ "$installed_metrics" == "true" ]]; then
    kubectl delete -f "$metrics_manifest" --ignore-not-found >/dev/null 2>&1 || true
  fi
  rm -f "$metrics_manifest"
  rm -rf "$metrics_binary_dir"
  return "$cleanup_status"
}
trap cleanup EXIT

curl --fail --location --silent --show-error --retry 5 --retry-all-errors --connect-timeout 30 "$METRICS_SERVER_URL" -o "$metrics_manifest"
metrics_manifest_sha=$(sha256sum "$metrics_manifest" | awk '{print $1}')
if [[ "$metrics_manifest_sha" != "$METRICS_SERVER_SHA256" ]]; then
  echo "metrics-server manifest checksum mismatch: $metrics_manifest_sha" >&2
  exit 1
fi
docker_arch=$(docker info --format '{{.Architecture}}')
case "$docker_arch" in
  arm64|aarch64)
    metrics_binary_name='metrics-server-linux-arm64'
    metrics_binary_sha='fdc7e8a27b3f509609def95e341ab03fcd2205dc70d12141326459b90b759010'
    metrics_binary_size='77377200'
    docker_platform='linux/arm64'
    ;;
  amd64|x86_64)
    metrics_binary_name='metrics-server-linux-amd64'
    metrics_binary_sha='43ee266a0cf8f5c76c5995d2a6487c4a865472860729a64324c0271a9651d7ab'
    metrics_binary_size='82064859'
    docker_platform='linux/amd64'
    ;;
  *)
    echo "Unsupported Docker architecture for metrics-server: $docker_arch" >&2
    exit 1
    ;;
esac
metrics_binary_url="https://github.com/kubernetes-sigs/metrics-server/releases/download/${METRICS_SERVER_VERSION}/${metrics_binary_name}"
if ! docker image inspect "$METRICS_SERVER_IMAGE" >/dev/null 2>&1; then
  node "$ROOT_DIR/scripts/download-release-asset.mjs" "$metrics_binary_url" "$metrics_binary_dir/metrics-server" "$metrics_binary_size" "$metrics_binary_sha" 16
  actual_binary_sha=$(sha256sum "$metrics_binary_dir/metrics-server" | awk '{print $1}')
  if [[ "$actual_binary_sha" != "$metrics_binary_sha" ]]; then
    echo "metrics-server binary checksum mismatch: $actual_binary_sha" >&2
    exit 1
  fi
  chmod 0755 "$metrics_binary_dir/metrics-server"
  docker build --platform "$docker_platform" -f "$ROOT_DIR/deploy/k8s/microservices/Dockerfile.metrics-server" -t "$METRICS_SERVER_IMAGE" "$metrics_binary_dir" >/dev/null
fi
metrics_image_archive=$(mktemp "${TMPDIR:-/tmp}/metrics-server-image.XXXXXX.tar")
docker save -o "$metrics_image_archive" "$METRICS_SERVER_IMAGE"
docker exec --privileged -i "$CLUSTER_NAME-control-plane" ctr --namespace=k8s.io images import --snapshotter=overlayfs - < "$metrics_image_archive" >/dev/null
rm -f "$metrics_image_archive"
if ! kubectl -n kube-system get deployment metrics-server >/dev/null 2>&1; then
  kubectl apply -f "$metrics_manifest" >/dev/null
  installed_metrics=true
fi
kubectl -n kube-system set image deployment/metrics-server "metrics-server=$METRICS_SERVER_IMAGE" >/dev/null
kubectl -n kube-system patch deployment metrics-server --type=strategic -p='{"spec":{"template":{"spec":{"containers":[{"name":"metrics-server","imagePullPolicy":"IfNotPresent"}]}}}}' >/dev/null
if ! kubectl -n kube-system get deployment metrics-server -o jsonpath='{.spec.template.spec.containers[0].args}' | grep -Fq -- '--kubelet-insecure-tls'; then
  kubectl -n kube-system patch deployment metrics-server --type=json \
    -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]' >/dev/null
fi
kubectl -n kube-system rollout status deployment/metrics-server --timeout=180s >/dev/null
for _attempt in $(seq 1 60); do
  if kubectl top node >/dev/null 2>&1; then break; fi
  sleep 2
done
kubectl top node

kubectl -n "$NAMESPACE" scale deployment gateway --replicas=1 >/dev/null
kubectl -n "$NAMESPACE" rollout status deployment/gateway --timeout=120s >/dev/null
kubectl apply -f "$ROOT_DIR/deploy/k8s/microservices/hpa.yaml" >/dev/null
kubectl -n "$NAMESPACE" wait --for=condition=AbleToScale hpa/gateway --timeout=120s >/dev/null

echo "HPA_TIMELINE phase=baseline timestamp=$(date -u +%FT%TZ) replicas=$(kubectl -n "$NAMESPACE" get deployment gateway -o jsonpath='{.status.readyReplicas}')"
kubectl -n "$NAMESPACE" get hpa gateway
kubectl -n "$NAMESPACE" top pod -l app.kubernetes.io/name=gateway || true

load_script="const end=Date.now()+${LOAD_SECONDS}000;const workers=Array.from({length:${LOAD_WORKERS}},async()=>{while(Date.now()<end){try{await fetch('http://gateway:3000/health/ready',{cache:'no-store'})}catch{}}});Promise.all(workers).then(()=>process.exit(0));"
kubectl -n "$NAMESPACE" run exp-hpa-load \
  --image="video-player/gateway:${IMAGE_TAG}" \
  --image-pull-policy=IfNotPresent \
  --restart=Never \
  --command -- node -e "$load_script" >/dev/null

scaled_up=false
for _attempt in $(seq 1 "$SCALE_UP_TIMEOUT"); do
  replicas=$(kubectl -n "$NAMESPACE" get deployment gateway -o jsonpath='{.status.readyReplicas}')
  desired=$(kubectl -n "$NAMESPACE" get hpa gateway -o jsonpath='{.status.desiredReplicas}')
  current_cpu=$(kubectl -n "$NAMESPACE" get hpa gateway -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null || true)
  echo "HPA_TIMELINE phase=load timestamp=$(date -u +%FT%TZ) ready=${replicas:-0} desired=${desired:-0} cpu=${current_cpu:-unknown}"
  if [[ "${replicas:-0}" -ge 2 ]]; then scaled_up=true; break; fi
  sleep 1
done
if [[ "$scaled_up" != "true" ]]; then
  kubectl -n "$NAMESPACE" describe hpa gateway >&2
  kubectl -n "$NAMESPACE" top pod -l app.kubernetes.io/name=gateway >&2 || true
  exit 1
fi
kubectl -n "$NAMESPACE" top pod -l app.kubernetes.io/name=gateway
kubectl -n "$NAMESPACE" delete pod exp-hpa-load --ignore-not-found --wait=false >/dev/null

scaled_down=false
for _attempt in $(seq 1 "$SCALE_DOWN_TIMEOUT"); do
  replicas=$(kubectl -n "$NAMESPACE" get deployment gateway -o jsonpath='{.status.readyReplicas}')
  desired=$(kubectl -n "$NAMESPACE" get hpa gateway -o jsonpath='{.status.desiredReplicas}')
  current_cpu=$(kubectl -n "$NAMESPACE" get hpa gateway -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null || true)
  echo "HPA_TIMELINE phase=recovery timestamp=$(date -u +%FT%TZ) ready=${replicas:-0} desired=${desired:-0} cpu=${current_cpu:-unknown}"
  if [[ "${replicas:-0}" -eq 1 && "${desired:-0}" -eq 1 ]]; then scaled_down=true; break; fi
  sleep 1
done
if [[ "$scaled_down" != "true" ]]; then
  kubectl -n "$NAMESPACE" describe hpa gateway >&2
  exit 1
fi

echo "HPA experiment passed: gateway scaled from 1 to >=2 and returned to 1."

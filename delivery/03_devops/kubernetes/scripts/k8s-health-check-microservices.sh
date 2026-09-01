#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${K8S_NAMESPACE:-video-player}
services=(identity-community content-media live-reward governance-ai gateway)

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Missing required command: kubectl" >&2
  exit 1
fi

for service in "${services[@]}"; do
  kubectl -n "$NAMESPACE" rollout status "deployment/$service" --timeout=180s
  kubectl -n "$NAMESPACE" exec "deployment/$service" -- node -e \
    "Promise.all(['/health/live','/health/ready','/version'].map(path => fetch('http://127.0.0.1:3000'+path).then(async response => { console.log('$service', path, response.status, await response.text()); if (!response.ok) process.exitCode = 1; }))).catch(() => process.exit(1))"
done

echo "Microservice scaffold health checks passed."
kubectl -n "$NAMESPACE" get pods -l app.kubernetes.io/part-of=video-player-microservices \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,IMAGE:.spec.containers[*].image,RESTARTS:.status.containerStatuses[*].restartCount'

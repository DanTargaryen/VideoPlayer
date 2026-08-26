#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${K8S_NAMESPACE:-video-player}

kubectl -n "$NAMESPACE" rollout status statefulset/mysql --timeout=180s
kubectl -n "$NAMESPACE" wait --for=condition=complete job/db-migrate --timeout=180s
kubectl -n "$NAMESPACE" rollout status deployment/backend --timeout=180s
kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout=180s

kubectl -n "$NAMESPACE" exec statefulset/mysql -- sh -lc \
  'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent'
kubectl -n "$NAMESPACE" exec deployment/backend -- node -e \
  "fetch('http://127.0.0.1:3000/api/v1/health').then(async response => { console.log(response.status, await response.text()); if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"
kubectl -n "$NAMESPACE" exec deployment/frontend -- wget -qO- http://127.0.0.1/ >/dev/null
kubectl -n "$NAMESPACE" exec deployment/frontend -- wget -qO- http://127.0.0.1/api/v1/health

echo
echo "Kubernetes health checks passed."
kubectl -n "$NAMESPACE" get pods -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,IMAGE:.spec.containers[*].image,RESTARTS:.status.containerStatuses[*].restartCount'

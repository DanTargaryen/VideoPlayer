# live-reward isolated Kind deployment

This overlay validates the MS-03 service with its own MySQL database, migration
job, Secret boundary, probes, resource limits, and persistent state across an
application Pod replacement. It does not deploy content-media, MinIO, or SRS and
therefore does not claim the replay/browser integration gates.

The write probe simulates the trusted Gateway boundary by signing the injected
user ID with the namespace `SERVICE_JWT_SECRET` and `live.user.forward` scope;
unsigned client `x-user-id` headers are rejected by the service.

From the repository root, run:

```bash
KIND_CLUSTER_NAME=<existing-kind-cluster> \
KIND_BIN=<kind-command-or-path> \
KUBECTL_BIN=<kubectl-command-or-path> \
SERVICE_JWT_SECRET=<at-least-32-characters> \
bash scripts/k8s-live-reward-smoke.sh
```

The script uses the dedicated `video-player-live-reward` namespace and removes
that namespace after a successful or failed run. Set
`KEEP_LIVE_REWARD_NAMESPACE=true` to retain it for inspection.

For reproducible Kind loading, the smoke script builds single-platform images
without provenance attestations, including a local wrapper around `mysql:8.0`.
This avoids incomplete multi-platform image indexes in local Docker caches; the
deployed database remains MySQL 8.0.

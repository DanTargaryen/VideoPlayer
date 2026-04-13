#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

. "$ROOT_DIR/scripts/infra-common.sh"

echo "Stopping Redis, MinIO, and SRS containers..."
stop_support_services
echo "Development infrastructure stopped."

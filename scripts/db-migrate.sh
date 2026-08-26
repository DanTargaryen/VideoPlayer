#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Generating Prisma client..."
npm --workspace backend run prisma:generate

echo "Applying Prisma migrations..."
npm --workspace backend exec prisma migrate deploy

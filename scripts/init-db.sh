#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${SEED_GUARD_CONFIRM:-}" && -t 0 ]]; then
  read -r -s -p "Enter db:init password: " SEED_GUARD_CONFIRM
  echo
  export SEED_GUARD_CONFIRM
fi

node backend/scripts/seed-guard.js

. "$ROOT_DIR/scripts/mysql-common.sh"

load_backend_env
load_mysql_config
ensure_mysql_available

echo "Installing workspace dependencies..."
npm install

echo "Initializing database..."
ensure_database_exists

echo "Generating Prisma client..."
npm --workspace backend run prisma:generate

echo "Applying Prisma migrations..."
npm --workspace backend exec prisma migrate deploy

echo "Seeding demo data..."
npm --workspace backend run db:seed

echo "Database initialization completed."

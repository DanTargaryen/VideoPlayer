#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

echo "Pushing schema to MySQL..."
npm --workspace backend run db:push

echo "Seeding demo data..."
npm --workspace backend run db:seed

echo "Database initialization completed."

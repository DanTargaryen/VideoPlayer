#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env

export DATABASE_URL

case "$DB_MIGRATION_MODE" in
  migrate)
    if ! node -e "const scripts=require('./package.json').scripts||{}; process.exit(scripts['db:migrate'] ? 0 : 1)"; then
      echo "DB_MIGRATION_MODE=migrate requires the DB-01 db:migrate script." >&2
      exit 1
    fi
    npm run db:migrate
    ;;
  *)
    echo "Unsupported DB_MIGRATION_MODE: $DB_MIGRATION_MODE; CI requires migrate." >&2
    exit 1
    ;;
esac

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 06-db-migration

#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"
load_runtime_env
require_command docker

if [[ "$TEST_DB_NAME" != *test* ]]; then
  echo "Refusing to start a CI database whose name does not contain test: $TEST_DB_NAME" >&2
  exit 1
fi

docker rm -f "$TEST_DB_CONTAINER" >/dev/null 2>&1 || true
docker run -d --rm \
  --name "$TEST_DB_CONTAINER" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -e MYSQL_DATABASE="$TEST_DB_NAME" \
  -p 127.0.0.1::3306 \
  mysql:8.0 >/dev/null

test_db_port=$(docker port "$TEST_DB_CONTAINER" 3306/tcp | tail -n 1 | sed 's/.*://')
database_url="mysql://root:${MYSQL_ROOT_PASSWORD}@127.0.0.1:${test_db_port}/${TEST_DB_NAME}"

for attempt in $(seq 1 60); do
  if docker exec "$TEST_DB_CONTAINER" \
    mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent \
    >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "Isolated MySQL did not become ready." >&2
    exit 1
  fi
  sleep 2
done

append_runtime_value TEST_DB_PORT "$test_db_port"
append_runtime_value DATABASE_URL "$database_url"
append_runtime_value INTEGRATION_DATABASE_URL "$database_url"

{
  printf 'database_container=%s\n' "$TEST_DB_CONTAINER"
  printf 'database_port=%s\n' "$test_db_port"
  printf 'database_name=%s\n' "$TEST_DB_NAME"
} > "$CI_EVIDENCE_DIR/isolated-database.properties"

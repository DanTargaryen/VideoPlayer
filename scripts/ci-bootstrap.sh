#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ci-common.sh"

for command_name in git node npm docker kind kubectl curl; do
  require_command "$command_name"
done

safe_reset_dir "$CI_RUN_DIR"
safe_reset_dir "$CI_EVIDENCE_DIR"
ensure_ci_dirs

build_number=${BUILD_NUMBER:-0}
if [[ ! "$build_number" =~ ^[0-9]+$ ]]; then
  build_number=0
fi

git_sha=$(git -C "$ROOT_DIR" rev-parse HEAD)
port_offset=$((build_number % 1000 * 2))
backend_port=$((13000 + port_offset))
frontend_port=$((backend_port + 1))
test_db_container="videoplayer-ci-${build_number}-mysql"
test_db_name=${TEST_DB_NAME:-video_player_ci_test}
kind_cluster_name=${KIND_CLUSTER_NAME:-"video-player-ci-${build_number}"}
mysql_root_password=$(node -e "process.stdout.write(require('node:crypto').randomBytes(18).toString('hex'))")
jwt_secret=$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")
admin_secret=$(node -e "process.stdout.write(require('node:crypto').randomBytes(18).toString('hex'))")
seed_confirmation=$(node -e "process.stdout.write(require('node:crypto').randomBytes(18).toString('hex'))")
local_storage_dir="$CI_RUN_DIR/storage"
practice_env_file="$CI_RUN_DIR/practice.env"

mkdir -p "$local_storage_dir"

{
  printf 'GIT_SHA=%q\n' "$git_sha"
  printf 'IMAGE_TAG=%q\n' "$git_sha"
  printf 'BUILD_NUMBER_VALUE=%q\n' "$build_number"
  printf 'BACKEND_PORT=%q\n' "$backend_port"
  printf 'FRONTEND_PORT=%q\n' "$frontend_port"
  printf 'TEST_DB_CONTAINER=%q\n' "$test_db_container"
  printf 'TEST_DB_NAME=%q\n' "$test_db_name"
  printf 'MYSQL_ROOT_PASSWORD=%q\n' "$mysql_root_password"
  printf 'JWT_SECRET=%q\n' "$jwt_secret"
  printf 'ADMIN_SECRET=%q\n' "$admin_secret"
  printf 'SEED_CONFIRMATION=%q\n' "$seed_confirmation"
  printf 'STORAGE_BACKEND=%q\n' local
  printf 'LOCAL_STORAGE_DIR=%q\n' "$local_storage_dir"
  printf 'VITE_API_PROXY_TARGET=%q\n' "http://127.0.0.1:$backend_port"
  printf 'PLAYWRIGHT_BASE_URL=%q\n' "http://127.0.0.1:$frontend_port"
  printf 'K8S_NAMESPACE=%q\n' "${K8S_NAMESPACE:-video-player}"
  printf 'KIND_CLUSTER_NAME=%q\n' "$kind_cluster_name"
  printf 'DB_MIGRATION_MODE=%q\n' "${DB_MIGRATION_MODE_VALUE:-${DB_MIGRATION_MODE:-push}}"
  printf 'FORCE_TEST_FAILURE=%q\n' "${FORCE_TEST_FAILURE_VALUE:-${FORCE_TEST_FAILURE:-false}}"
  printf 'PRACTICE_ENV_FILE=%q\n' "$practice_env_file"
} > "$CI_RUNTIME_ENV_FILE"

{
  printf 'MYSQL_ROOT_PASSWORD=%s\n' "$mysql_root_password"
  printf 'MINIO_ROOT_USER=%s\n' videoplayer-ci
  printf 'MINIO_ROOT_PASSWORD=%s\n' "$(node -e "process.stdout.write(require('node:crypto').randomBytes(18).toString('hex'))")"
  printf 'JWT_SECRET=%s\n' "$jwt_secret"
  printf 'ADMIN_SECRET=%s\n' "$admin_secret"
} > "$practice_env_file"
chmod 600 "$CI_RUNTIME_ENV_FILE" "$practice_env_file"

{
  printf 'build_number=%s\n' "$build_number"
  printf 'git_sha=%s\n' "$git_sha"
  printf 'image_tag=%s\n' "$git_sha"
  printf 'test_database=%s\n' "$test_db_name"
  printf 'test_db_container=%s\n' "$test_db_container"
  printf 'backend_port=%s\n' "$backend_port"
  printf 'frontend_port=%s\n' "$frontend_port"
  printf 'kind_cluster=%s\n' "$kind_cluster_name"
  printf 'migration_mode=%s\n' "${DB_MIGRATION_MODE_VALUE:-${DB_MIGRATION_MODE:-push}}"
  printf 'forced_failure=%s\n' "${FORCE_TEST_FAILURE_VALUE:-${FORCE_TEST_FAILURE:-false}}"
} > "$CI_EVIDENCE_DIR/build-metadata.properties"

bash "$ROOT_DIR/scripts/ci-mark-stage.sh" 01-checkout

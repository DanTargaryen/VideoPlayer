#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CI_RUN_SUBDIR=${CI_RUN_SUBDIR:-manual}
CI_EVIDENCE_SUBDIR=${CI_EVIDENCE_SUBDIR:-manual}
CI_RUN_DIR=${CI_RUN_DIR:-"$ROOT_DIR/.codex-run/$CI_RUN_SUBDIR"}
CI_EVIDENCE_DIR=${CI_EVIDENCE_DIR:-"$ROOT_DIR/ci-evidence/$CI_EVIDENCE_SUBDIR"}
CI_RUNTIME_ENV_FILE=${CI_RUNTIME_ENV_FILE:-"$CI_RUN_DIR/runtime.env"}

require_command() {
  local command_name=$1
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

ensure_ci_dirs() {
  mkdir -p "$CI_RUN_DIR" "$CI_EVIDENCE_DIR" "$CI_EVIDENCE_DIR/stage-markers"
}

safe_reset_dir() {
  local target_dir=$1
  case "$target_dir" in
    "$ROOT_DIR"/.codex-run/*|"$ROOT_DIR"/ci-evidence/*) ;;
    *)
      echo "Refusing to reset directory outside an approved CI path: $target_dir" >&2
      exit 1
      ;;
  esac

  rm -rf "$target_dir"
  mkdir -p "$target_dir"
}

load_runtime_env() {
  if [[ ! -f "$CI_RUNTIME_ENV_FILE" ]]; then
    echo "Missing CI runtime environment: $CI_RUNTIME_ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$CI_RUNTIME_ENV_FILE"
  set +a
}

append_runtime_value() {
  local variable_name=$1
  local variable_value=$2
  printf '%s=%q\n' "$variable_name" "$variable_value" >> "$CI_RUNTIME_ENV_FILE"
}

kill_pid_file() {
  local pid_file=$1
  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local process_id
  process_id=$(cat "$pid_file")
  if [[ "$process_id" =~ ^[0-9]+$ ]] && kill -0 "$process_id" >/dev/null 2>&1; then
    kill "$process_id" >/dev/null 2>&1 || true
    wait "$process_id" 2>/dev/null || true
  fi
  rm -f "$pid_file"
}

wait_for_http() {
  local url=$1
  local attempts=${2:-90}

  for attempt in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for $url" >&2
  return 1
}

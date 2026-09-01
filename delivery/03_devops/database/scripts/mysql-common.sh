#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_DATABASE_URL="mysql://root:proot@127.0.0.1:3306/video_player"
MYSQL_SERVICE_NAME=""

load_backend_env() {
  local env_file=""

  if [[ -f "$ROOT_DIR/backend/.env" ]]; then
    env_file="$ROOT_DIR/backend/.env"
  elif [[ -f "$ROOT_DIR/.env" ]]; then
    env_file="$ROOT_DIR/.env"
  fi

  if [[ -n "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

load_mysql_config() {
  local database_url="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"

  DB_PROTOCOL="$(node -e "const url = new URL(process.argv[1]); console.log(url.protocol.replace(/:$/, ''));" "$database_url")"
  DB_HOST="$(node -e "const url = new URL(process.argv[1]); console.log(url.hostname || '127.0.0.1');" "$database_url")"
  DB_PORT="$(node -e "const url = new URL(process.argv[1]); console.log(url.port || '3306');" "$database_url")"
  DB_USER="$(node -e "const url = new URL(process.argv[1]); console.log(decodeURIComponent(url.username || 'root'));" "$database_url")"
  DB_PASSWORD="$(node -e "const url = new URL(process.argv[1]); console.log(decodeURIComponent(url.password || '')); " "$database_url")"
  DB_NAME="$(node -e "const url = new URL(process.argv[1]); console.log(url.pathname.replace(/^\\//, '') || 'video_player');" "$database_url")"

  if [[ "$DB_PROTOCOL" != "mysql" ]]; then
    echo "Unsupported database protocol: $DB_PROTOCOL. This project expects MySQL."
    exit 1
  fi
}

mysql_ping() {
  MYSQL_PWD="$DB_PASSWORD" mysqladmin --connect-timeout=5 ping -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" >/dev/null 2>&1
}

mysql_exec_file() {
  local sql_file="$1"
  MYSQL_PWD="$DB_PASSWORD" mysql --connect-timeout=5 -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" < "$sql_file"
}

mysql_database_exists() {
  MYSQL_PWD="$DB_PASSWORD" mysql --connect-timeout=5 -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -Nse \
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${DB_NAME}'" |
    grep -qx "$DB_NAME"
}

detect_mysql_service_name() {
  local candidate=""

  for candidate in mysql mysqld mariadb; do
    if command -v systemctl >/dev/null 2>&1; then
      if systemctl status "$candidate" >/dev/null 2>&1; then
        MYSQL_SERVICE_NAME="$candidate"
        return 0
      fi
      if systemctl list-unit-files "${candidate}.service" >/dev/null 2>&1; then
        MYSQL_SERVICE_NAME="$candidate"
        return 0
      fi
    fi

    if command -v service >/dev/null 2>&1 && service "$candidate" status >/dev/null 2>&1; then
      MYSQL_SERVICE_NAME="$candidate"
      return 0
    fi
  done

  MYSQL_SERVICE_NAME=""
  return 1
}

start_mysql_service() {
  if [[ -z "$MYSQL_SERVICE_NAME" ]]; then
    return 1
  fi

  echo "MySQL is not reachable. Trying to start service '$MYSQL_SERVICE_NAME'..."

  if command -v systemctl >/dev/null 2>&1; then
    if [[ "$(id -u)" -eq 0 ]]; then
      systemctl start "$MYSQL_SERVICE_NAME"
    elif command -v sudo >/dev/null 2>&1; then
      sudo systemctl start "$MYSQL_SERVICE_NAME"
    else
      return 1
    fi
    return 0
  fi

  if command -v service >/dev/null 2>&1; then
    if [[ "$(id -u)" -eq 0 ]]; then
      service "$MYSQL_SERVICE_NAME" start
    elif command -v sudo >/dev/null 2>&1; then
      sudo service "$MYSQL_SERVICE_NAME" start
    else
      return 1
    fi
    return 0
  fi

  return 1
}

wait_for_mysql() {
  local attempt=0

  until mysql_ping; do
    attempt=$((attempt + 1))

    if (( attempt >= 20 )); then
      echo "MySQL did not become ready in time."
      return 1
    fi

    sleep 1
  done
}

ensure_mysql_available() {
  if ! command -v mysql >/dev/null 2>&1; then
    echo "MySQL client is missing. Install 'mysql' first, then rerun this script."
    exit 1
  fi

  if mysql_ping; then
    echo "MySQL is ready at ${DB_HOST}:${DB_PORT}."
    return 0
  fi

  detect_mysql_service_name || true

  if ! start_mysql_service; then
    echo "MySQL is not reachable at ${DB_HOST}:${DB_PORT}."
    if [[ -n "$MYSQL_SERVICE_NAME" ]]; then
      echo "Please start it manually: sudo systemctl start $MYSQL_SERVICE_NAME"
    else
      echo "Please start your MySQL service manually, then rerun the command."
    fi
    exit 1
  fi

  wait_for_mysql
  echo "MySQL started successfully at ${DB_HOST}:${DB_PORT}."
}

ensure_database_exists() {
  echo "Ensuring database '$DB_NAME' exists..."
  if mysql_database_exists; then
    echo "Database '$DB_NAME' already exists."
    return 0
  fi

  mysql_exec_file "$ROOT_DIR/deploy/mysql/init.sql"
}

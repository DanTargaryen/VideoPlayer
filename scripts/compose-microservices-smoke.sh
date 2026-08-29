#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.microservices.yml"
PROJECT_NAME=${MICROSERVICE_COMPOSE_PROJECT_NAME:-video-player-ms00-smoke}
IMAGE_TAG=${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}
GIT_SHA=${GIT_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD)}
CONTENT_DB_PASSWORD=${CONTENT_DB_PASSWORD:-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(18).toString("hex"))')}
CONTENT_DB_ROOT_PASSWORD=${CONTENT_DB_ROOT_PASSWORD:-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(18).toString("hex"))')}
LIVE_REWARD_DATABASE_NAME=${LIVE_REWARD_DATABASE_NAME:-video_player_live_reward_test}
LIVE_REWARD_DATABASE_USER=${LIVE_REWARD_DATABASE_USER:-live_reward}
LIVE_REWARD_DATABASE_PASSWORD=${LIVE_REWARD_DATABASE_PASSWORD:-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')}
LIVE_REWARD_MYSQL_ROOT_PASSWORD=${LIVE_REWARD_MYSQL_ROOT_PASSWORD:-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')}
GATEWAY_ROUTE_MODE=${GATEWAY_ROUTE_MODE:-services}

for command_name in docker curl git node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

IDENTITY_DATABASE_NAME=${IDENTITY_DATABASE_NAME:-video_player_identity_test}
IDENTITY_DATABASE_USER=${IDENTITY_DATABASE_USER:-identity_app}
IDENTITY_DATABASE_PASSWORD=${IDENTITY_DATABASE_PASSWORD:-$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")}
IDENTITY_MYSQL_ROOT_PASSWORD=${IDENTITY_MYSQL_ROOT_PASSWORD:-$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")}
IDENTITY_ADMIN_SECRET=${IDENTITY_ADMIN_SECRET:-$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")}
SERVICE_JWT_SECRET=${SERVICE_JWT_SECRET:-$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")}

if [[ ! "$PROJECT_NAME" =~ ^video-player-ms00-[a-z0-9-]+$ ]]; then
  echo "MICROSERVICE_COMPOSE_PROJECT_NAME must start with video-player-ms00-." >&2
  exit 1
fi

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  else
    docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
  fi
}

cleanup() {
  compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

export IMAGE_TAG GIT_SHA IDENTITY_DATABASE_NAME IDENTITY_DATABASE_USER IDENTITY_DATABASE_PASSWORD
export IDENTITY_MYSQL_ROOT_PASSWORD IDENTITY_ADMIN_SECRET SERVICE_JWT_SECRET
export IMAGE_TAG GIT_SHA CONTENT_DB_PASSWORD CONTENT_DB_ROOT_PASSWORD
export LIVE_REWARD_DATABASE_NAME LIVE_REWARD_DATABASE_USER LIVE_REWARD_DATABASE_PASSWORD LIVE_REWARD_MYSQL_ROOT_PASSWORD
export GATEWAY_ROUTE_MODE
compose config --quiet
if [[ "${MICROSERVICE_COMPOSE_SKIP_BUILD:-false}" == "true" ]]; then
  compose up -d
else
  compose up --build -d
fi

ports=(3100 3101 3102 3103 3104)
for port in "${ports[@]}"; do
  for _attempt in $(seq 1 90); do
    if curl -fsS "http://127.0.0.1:$port/health/ready" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  curl -fsS "http://127.0.0.1:$port/health/live"
  curl -fsS "http://127.0.0.1:$port/health/ready"
  curl -fsS "http://127.0.0.1:$port/version"
done

curl -fsS -X POST 'http://127.0.0.1:3101/api/v1/auth/register' \
  -H 'content-type: application/json' \
  --data '{"username":"compose_identity_user","password":"ComposeIdentity123!","email":"compose-identity@example.com"}' \
  >/dev/null
identity_login=$(curl -fsS -X POST 'http://127.0.0.1:3101/api/v1/auth/login' \
  -H 'content-type: application/json' \
  --data '{"account":"compose_identity_user","password":"ComposeIdentity123!"}')
identity_token=$(node -e "const payload=JSON.parse(process.argv[1]); if(!payload.data?.token)process.exit(1); process.stdout.write(payload.data.token)" "$identity_login")

live_room_response=$(curl -fsS -X POST 'http://127.0.0.1:3100/api/v1/lives/rooms' \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $identity_token" \
  -H 'x-user-id: 999' \
  --data '{"title":"compose-live-persistence"}')
live_room_id=$(node -e "const payload=JSON.parse(process.argv[1]); if(!payload.data?.id)process.exit(1); process.stdout.write(String(payload.data.id))" "$live_room_response")
compose restart live-reward >/dev/null
for _attempt in $(seq 1 60); do
  if curl -fsS 'http://127.0.0.1:3103/health/ready' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:3100/api/v1/lives/rooms/$live_room_id" \
  | node -e "let text='';process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{const payload=JSON.parse(text);if(payload.data?.title!=='compose-live-persistence'||payload.data?.broadcaster?.id!==1)process.exit(1)})"
compose restart identity-community >/dev/null
for _attempt in $(seq 1 60); do
  if curl -fsS 'http://127.0.0.1:3101/health/ready' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS -X POST 'http://127.0.0.1:3101/api/v1/auth/login' \
  -H 'content-type: application/json' \
  --data '{"account":"compose_identity_user","password":"ComposeIdentity123!"}' \
  >/dev/null

identity_database_list=$(compose exec -T identity-mysql \
  mysql -N -u"$IDENTITY_DATABASE_USER" -p"$IDENTITY_DATABASE_PASSWORD" -e 'SHOW DATABASES')
grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$identity_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$identity_database_list" >/dev/null; then
  echo "identity database account can access the monolith video_player schema" >&2
  exit 1
fi
compose exec -T identity-mysql \
  mysql -N -u"$IDENTITY_DATABASE_USER" -p"$IDENTITY_DATABASE_PASSWORD" "$IDENTITY_DATABASE_NAME" \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$IDENTITY_DATABASE_NAME'" \
  | grep -Fx '12' >/dev/null

content_database_list=$(compose exec -T content-mysql \
  mysql -N -ucontent_media -p"$CONTENT_DB_PASSWORD" -e 'SHOW DATABASES')
grep -Fx 'content_media' <<<"$content_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$content_database_list" >/dev/null || grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$content_database_list" >/dev/null; then
  echo "content database account can access another service schema" >&2
  exit 1
fi
compose exec -T content-mysql \
  mysql -N -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'content_media'" \
  | grep -Fx '14' >/dev/null

live_database_list=$(compose exec -T live-mysql \
  mysql -N -u"$LIVE_REWARD_DATABASE_USER" -p"$LIVE_REWARD_DATABASE_PASSWORD" -e 'SHOW DATABASES')
grep -Fx "$LIVE_REWARD_DATABASE_NAME" <<<"$live_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$live_database_list" >/dev/null || grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$live_database_list" >/dev/null || grep -Fx 'content_media' <<<"$live_database_list" >/dev/null; then
  echo "live-reward database account can access another service schema" >&2
  exit 1
fi
compose exec -T live-mysql \
  mysql -N -u"$LIVE_REWARD_DATABASE_USER" -p"$LIVE_REWARD_DATABASE_PASSWORD" "$LIVE_REWARD_DATABASE_NAME" \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$LIVE_REWARD_DATABASE_NAME'" \
  | grep -Fx '11' >/dev/null

for service in identity-community content-media live-reward governance-ai gateway; do
  container_id=$(compose ps -q "$service")
  for _attempt in $(seq 1 30); do
    if [[ "$(docker inspect -f '{{.State.Health.Status}}' "$container_id")" == "healthy" ]]; then
      break
    fi
    sleep 1
  done
  test "$(docker inspect -f '{{.State.Health.Status}}' "$container_id")" = "healthy"
done

compose ps
echo "Microservice Compose scaffold smoke passed."

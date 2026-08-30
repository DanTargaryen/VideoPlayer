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
GOVERNANCE_DATABASE_NAME=${GOVERNANCE_DATABASE_NAME:-video_player_governance_test}
GOVERNANCE_DATABASE_USER=${GOVERNANCE_DATABASE_USER:-governance_app}
GOVERNANCE_DATABASE_PASSWORD=${GOVERNANCE_DATABASE_PASSWORD:-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')}
GOVERNANCE_MYSQL_ROOT_PASSWORD=${GOVERNANCE_MYSQL_ROOT_PASSWORD:-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')}
GATEWAY_ROUTE_MODE=${GATEWAY_ROUTE_MODE:-services}
GATEWAY_READ_CUTOVER=${GATEWAY_READ_CUTOVER:-all}
GATEWAY_WRITE_CUTOVER=${GATEWAY_WRITE_CUTOVER:-all}

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
  if [[ -n "${monolith_mock_pid:-}" ]]; then
    kill "$monolith_mock_pid" >/dev/null 2>&1 || true
    wait "$monolith_mock_pid" >/dev/null 2>&1 || true
  fi
  if [[ -n "${monolith_mock_log:-}" ]]; then
    rm -f "$monolith_mock_log"
  fi
  if [[ -n "${frontend_pid:-}" ]]; then
    kill "$frontend_pid" >/dev/null 2>&1 || true
    wait "$frontend_pid" >/dev/null 2>&1 || true
  fi
  if [[ -n "${frontend_log:-}" ]]; then
    rm -f "$frontend_log"
  fi
  compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

export IMAGE_TAG GIT_SHA IDENTITY_DATABASE_NAME IDENTITY_DATABASE_USER IDENTITY_DATABASE_PASSWORD
export IDENTITY_MYSQL_ROOT_PASSWORD IDENTITY_ADMIN_SECRET SERVICE_JWT_SECRET
export IMAGE_TAG GIT_SHA CONTENT_DB_PASSWORD CONTENT_DB_ROOT_PASSWORD
export LIVE_REWARD_DATABASE_NAME LIVE_REWARD_DATABASE_USER LIVE_REWARD_DATABASE_PASSWORD LIVE_REWARD_MYSQL_ROOT_PASSWORD
export GOVERNANCE_DATABASE_NAME GOVERNANCE_DATABASE_USER GOVERNANCE_DATABASE_PASSWORD GOVERNANCE_MYSQL_ROOT_PASSWORD
export GATEWAY_ROUTE_MODE GATEWAY_READ_CUTOVER GATEWAY_WRITE_CUTOVER
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

# Load content owned by the isolated Compose database for the governance UC06 path.
compose exec -T content-mysql \
  mysql -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  < "$ROOT_DIR/services/content-media/prisma/fixture.sql"
compose exec -T content-mysql \
  mysql -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  -e "INSERT INTO Comment (id, videoId, userId, body, status, createdAt, updatedAt) VALUES ('comment-001', '1', '1', 'clear walkthrough', 'VISIBLE', NOW(3), NOW(3)) ON DUPLICATE KEY UPDATE videoId = VALUES(videoId), userId = VALUES(userId), body = VALUES(body), status = VALUES(status), updatedAt = NOW(3)"

curl -fsS -X POST 'http://127.0.0.1:3101/api/v1/auth/register' \
  -H 'content-type: application/json' \
  --data '{"username":"compose_identity_user","password":"ComposeIdentity123!","email":"compose-identity@example.com","nickname":"中文用户"}' \
  >/dev/null
identity_login=$(curl -fsS -X POST 'http://127.0.0.1:3101/api/v1/auth/login' \
  -H 'content-type: application/json' \
  --data '{"account":"compose_identity_user","password":"ComposeIdentity123!"}')
identity_token=$(node -e "const payload=JSON.parse(process.argv[1]); if(!payload.data?.token)process.exit(1); process.stdout.write(payload.data.token)" "$identity_login")

curl -fsS -X POST 'http://127.0.0.1:3101/api/v1/auth/register' \
  -H 'content-type: application/json' \
  --data '{"username":"compose_governance_admin","password":"ComposeAdmin123!","email":"compose-admin@example.com"}' \
  >/dev/null
compose exec -T identity-mysql \
  mysql -u"$IDENTITY_DATABASE_USER" -p"$IDENTITY_DATABASE_PASSWORD" "$IDENTITY_DATABASE_NAME" \
  -e "UPDATE User SET role = 'ADMIN' WHERE username = 'compose_governance_admin'"
admin_login=$(curl -sS -X POST 'http://127.0.0.1:3101/api/v1/auth/login' \
  -H 'content-type: application/json' \
  --data "{\"account\":\"compose_governance_admin\",\"password\":\"ComposeAdmin123!\",\"adminSecret\":\"$IDENTITY_ADMIN_SECRET\"}")
admin_token=$(node -e "const payload=JSON.parse(process.argv[1]); if(!payload.data?.token){console.error(JSON.stringify(payload));process.exit(1)} process.stdout.write(payload.data.token)" "$admin_login")

# Seed governance-owned queue records, then exercise the real Vue dashboard
# through Vite -> Gateway(services) -> governance/content service boundaries.
compose exec -T governance-mysql \
  mysql -u"$GOVERNANCE_DATABASE_USER" -p"$GOVERNANCE_DATABASE_PASSWORD" "$GOVERNANCE_DATABASE_NAME" \
  -e "INSERT INTO ModerationDecision (decisionId, requestId, targetType, targetId, videoId, applyStatus, attempts, createdAt, updatedAt) VALUES ('compose-ui-video', 'compose-ui-video-request', 'VIDEO', '1', '1', 'PENDING', 0, NOW(3), NOW(3)), ('compose-ui-comment', 'compose-ui-comment-request', 'COMMENT', 'comment-001', '1', 'PENDING', 0, NOW(3), NOW(3))"
frontend_log=$(mktemp -t videoplayer-services-frontend.XXXXXX.log)
VITE_API_PROXY_TARGET='http://127.0.0.1:3100' VITE_DEV_HOST='127.0.0.1' VITE_DEV_PORT='5175' npm run dev:frontend >"$frontend_log" 2>&1 &
frontend_pid=$!
for _attempt in $(seq 1 60); do
  if curl -fsS 'http://127.0.0.1:5175/' >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! curl -fsS 'http://127.0.0.1:5175/' >/dev/null 2>&1; then
  cat "$frontend_log" >&2
  exit 1
fi
PLAYWRIGHT_BASE_URL='http://127.0.0.1:5175' SERVICES_MODE_ADMIN_TOKEN="$admin_token" SERVICES_MODE_CREATOR_TOKEN="$identity_token" \
  npm exec playwright test tests/e2e/admin-services-mode.spec.ts

report_response=$(curl -sS -X POST 'http://127.0.0.1:3100/api/v1/reports' \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $identity_token" \
  -H 'x-user-id: 999' \
  -H 'x-user-role: ADMIN' \
  --data '{"targetType":"VIDEO","targetId":"1","reason":"UC06 compose governance smoke"}')
report_id=$(node -e "const payload=JSON.parse(process.argv[1]); if(!payload.data?.id||payload.data?.status!=='PENDING'){console.error(JSON.stringify(payload));process.exit(1)} process.stdout.write(String(payload.data.id))" "$report_response")

forged_status=$(curl -sS -o /dev/null -w '%{http_code}' 'http://127.0.0.1:3100/api/v1/admin/reports' \
  -H "authorization: Bearer $identity_token" \
  -H 'x-user-role: ADMIN')
test "$forged_status" = '403'

curl -fsS 'http://127.0.0.1:3100/api/v1/admin/reports' \
  -H "authorization: Bearer $admin_token" \
  | node -e "let text='';process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{const payload=JSON.parse(text);if(!payload.data?.some(item=>String(item.id)===process.argv[1]&&item.status==='PENDING'&&item.video?.title==='Spring Architecture Notes'))process.exit(1)})" "$report_id"

handled_response=$(curl -fsS -X POST "http://127.0.0.1:3100/api/v1/admin/reports/$report_id" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $admin_token" \
  --data '{"action":"DELETE","reason":"UC06 confirmed violation"}')
node -e "const payload=JSON.parse(process.argv[1]); if(payload.data?.report?.status!=='PROCESSED'||payload.data?.decision?.applyStatus!=='APPLIED')process.exit(1)" "$handled_response"

# KEEP closes the report but must not alter a hidden/draft target's visibility.
compose exec -T content-mysql \
  mysql -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  -e "UPDATE Video SET status = 'HIDDEN' WHERE id = '2'"
keep_report_response=$(curl -fsS -X POST 'http://127.0.0.1:3100/api/v1/reports' \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $identity_token" \
  --data '{"targetType":"VIDEO","targetId":"2","reason":"KEEP no-op smoke"}')
keep_report_id=$(node -e "const payload=JSON.parse(process.argv[1]); if(!payload.data?.id)process.exit(1); process.stdout.write(String(payload.data.id))" "$keep_report_response")
curl -fsS -X POST "http://127.0.0.1:3100/api/v1/admin/reports/$keep_report_id" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $admin_token" \
  --data '{"action":"KEEP"}' \
  | node -e "let text='';process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{const payload=JSON.parse(text);if(payload.data?.report?.status!=='REJECTED'||payload.data?.decision?.applyStatus!=='APPLIED')process.exit(1)})"
compose exec -T content-mysql \
  mysql -N -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  -e "SELECT status FROM Video WHERE id = '2'" \
  | grep -Fx 'HIDDEN' >/dev/null

duplicate_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:3100/api/v1/admin/reports/$report_id" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $admin_token" \
  --data '{"action":"DELETE"}')
test "$duplicate_status" = '409'

compose exec -T content-mysql \
  mysql -N -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  -e "SELECT status FROM Video WHERE id = '1'" \
  | grep -Fx 'HIDDEN' >/dev/null
curl -fsS 'http://127.0.0.1:3100/api/v1/notifications' \
  -H "authorization: Bearer $identity_token" \
  | node -e "let text='';process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{const payload=JSON.parse(text);if(!payload.data?.some(item=>item.type==='REPORT'&&item.relatedType==='REPORT'&&String(item.relatedId)===process.argv[1]))process.exit(1)})" "$report_id"

compose restart governance-ai >/dev/null
for _attempt in $(seq 1 60); do
  if curl -fsS 'http://127.0.0.1:3104/health/ready' >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS 'http://127.0.0.1:3100/api/v1/admin/reports' \
  -H "authorization: Bearer $admin_token" \
  | node -e "let text='';process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{const payload=JSON.parse(text);if(!payload.data?.some(item=>String(item.id)===process.argv[1]&&item.status==='PROCESSED'))process.exit(1)})" "$report_id"

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
  | grep -Fx '16' >/dev/null

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

governance_database_list=$(compose exec -T governance-mysql \
  mysql -N -u"$GOVERNANCE_DATABASE_USER" -p"$GOVERNANCE_DATABASE_PASSWORD" -e 'SHOW DATABASES')
grep -Fx "$GOVERNANCE_DATABASE_NAME" <<<"$governance_database_list" >/dev/null
if grep -Fx 'video_player' <<<"$governance_database_list" >/dev/null || grep -Fx "$IDENTITY_DATABASE_NAME" <<<"$governance_database_list" >/dev/null || grep -Fx 'content_media' <<<"$governance_database_list" >/dev/null || grep -Fx "$LIVE_REWARD_DATABASE_NAME" <<<"$governance_database_list" >/dev/null; then
  echo "governance database account can access another service schema" >&2
  exit 1
fi
compose exec -T governance-mysql \
  mysql -N -u"$GOVERNANCE_DATABASE_USER" -p"$GOVERNANCE_DATABASE_PASSWORD" "$GOVERNANCE_DATABASE_NAME" \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$GOVERNANCE_DATABASE_NAME'" \
  | grep -Fx '5' >/dev/null

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

# Exercise the documented first cutover stage against real identity/content
# services while an explicit monolith upstream handles unsupported paths and
# every write. Then prove that the Gateway can be recreated in monolith mode.
compose exec -T content-mysql \
  mysql -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
  -e "UPDATE Video SET status = 'PUBLISHED' WHERE id = '1'"
monolith_mock_log=$(mktemp -t videoplayer-cutover-monolith.XXXXXX.log)
node "$ROOT_DIR/scripts/read-cutover-monolith.mjs" >"$monolith_mock_log" 2>&1 &
monolith_mock_pid=$!
for _attempt in $(seq 1 30); do
  if curl -fsS 'http://127.0.0.1:3000/health' >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! curl -fsS 'http://127.0.0.1:3000/health' >/dev/null 2>&1; then
  cat "$monolith_mock_log" >&2
  exit 1
fi

GATEWAY_ROUTE_MODE=services \
GATEWAY_READ_CUTOVER=identity-community,content-media \
GATEWAY_WRITE_CUTOVER=none \
  compose up -d --force-recreate --no-deps gateway
for _attempt in $(seq 1 30); do
  if curl -fsS 'http://127.0.0.1:3100/health/ready' >/dev/null 2>&1; then break; fi
  sleep 1
done
node "$ROOT_DIR/scripts/read-cutover-probe.mjs" read http://127.0.0.1:3100

GATEWAY_ROUTE_MODE=services \
GATEWAY_READ_CUTOVER=identity-community,content-media \
GATEWAY_WRITE_CUTOVER=identity-community \
  compose up -d --force-recreate --no-deps gateway
for _attempt in $(seq 1 30); do
  if curl -fsS 'http://127.0.0.1:3100/health/ready' >/dev/null 2>&1; then break; fi
  sleep 1
done
node "$ROOT_DIR/scripts/read-cutover-probe.mjs" identity-write http://127.0.0.1:3100

GATEWAY_ROUTE_MODE=services \
GATEWAY_READ_CUTOVER=identity-community,content-media \
GATEWAY_WRITE_CUTOVER=identity-community,content-media \
  compose up -d --force-recreate --no-deps gateway
for _attempt in $(seq 1 30); do
  if curl -fsS 'http://127.0.0.1:3100/health/ready' >/dev/null 2>&1; then break; fi
  sleep 1
done
CONTENT_BASE_URL='http://127.0.0.1:3100' \
CONTENT_USER_TOKEN="$admin_token" \
CONTENT_INTERACTION_RUN_ID='compose-content-interactions' \
SERVICE_JWT_SECRET="$SERVICE_JWT_SECRET" \
  node "$ROOT_DIR/scripts/content-interaction-smoke.mjs"

for _attempt in $(seq 1 20); do
  notification_count=$(compose exec -T identity-mysql \
    mysql -N -u"$IDENTITY_DATABASE_USER" -p"$IDENTITY_DATABASE_PASSWORD" "$IDENTITY_DATABASE_NAME" \
    -e "SELECT COUNT(*) FROM Notification WHERE requestId LIKE 'content-smoke-compose-content-interactions-%:notification'")
  delivered_count=$(compose exec -T content-mysql \
    mysql -N -ucontent_media -p"$CONTENT_DB_PASSWORD" content_media \
    -e "SELECT COUNT(*) FROM NotificationOutbox WHERE requestId LIKE 'content-smoke-compose-content-interactions-%:notification' AND status = 'DELIVERED'")
  if [[ "$notification_count" == "3" && "$delivered_count" == "3" ]]; then break; fi
  sleep 1
done
test "$notification_count" = "3"
test "$delivered_count" = "3"

GATEWAY_ROUTE_MODE=monolith \
GATEWAY_READ_CUTOVER=identity-community,content-media \
GATEWAY_WRITE_CUTOVER=none \
  compose up -d --force-recreate --no-deps gateway
for _attempt in $(seq 1 30); do
  if curl -fsS 'http://127.0.0.1:3100/health/ready' >/dev/null 2>&1; then break; fi
  sleep 1
done
node "$ROOT_DIR/scripts/read-cutover-probe.mjs" rollback http://127.0.0.1:3100

compose ps
echo "Microservice Compose, UC06 governance, read/identity/content-interaction write cutover, and rollback smoke passed."

#!/usr/bin/env bash
#
# Deploy. Pull, build, migrate, restart, health check, and roll back on failure.
# The rollback is the point — a deploy that leaves the site down is worse than
# no deploy. DPR §14.1
#
# Usage:  ./deploy.sh
#
set -Eeuo pipefail

cd "$(dirname "$0")"

APP=app
HEALTH_URL="http://127.0.0.1:3000/api/health"
HEALTH_TRIES=20
PREVIOUS_IMAGE=""

log()  { printf '\n\033[1m→ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; }

rollback() {
  fail "Deploy failed."
  if [[ -n "$PREVIOUS_IMAGE" ]]; then
    log "Rolling back to $PREVIOUS_IMAGE"
    docker tag "$PREVIOUS_IMAGE" "$(docker compose config --images "$APP" | head -1)"
    docker compose up -d "$APP"
    if wait_for_health; then
      fail "Rolled back. The site is up on the previous build. Investigate before retrying."
    else
      fail "ROLLBACK ALSO UNHEALTHY. The site may be down — check 'docker compose logs app'."
    fi
  else
    fail "No previous image to roll back to. Check 'docker compose logs app'."
  fi
  exit 1
}

wait_for_health() {
  for _ in $(seq 1 "$HEALTH_TRIES"); do
    if docker compose exec -T "$APP" node -e \
      "fetch('$HEALTH_URL').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
      return 0
    fi
    sleep 3
  done
  return 1
}

trap rollback ERR

log "Checking the working tree is clean"
if [[ -n "$(git status --porcelain)" ]]; then
  fail "Uncommitted changes on the server. Commit or stash them first."
  exit 1
fi

log "Tagging the current image so we can roll back"
CURRENT_ID="$(docker compose images -q "$APP" 2>/dev/null || true)"
if [[ -n "$CURRENT_ID" ]]; then
  PREVIOUS_IMAGE="staysutra-app:rollback-$(date +%Y%m%d-%H%M%S)"
  docker tag "$CURRENT_ID" "$PREVIOUS_IMAGE"
  echo "  $PREVIOUS_IMAGE"
fi

log "Pulling"
git pull --ff-only

log "Building"
docker compose build "$APP"

log "Starting"
docker compose up -d "$APP"

log "Applying migrations"
# migrate deploy only applies committed migrations. It never resets, and never
# drops data — unlike `migrate dev`, which must not touch production.
docker compose exec -T "$APP" npx prisma migrate deploy

log "Waiting for health"
if ! wait_for_health; then
  false   # hands control to the ERR trap, which rolls back
fi

trap - ERR

log "Cleaning up old rollback tags (keeping the last 3)"
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep '^staysutra-app:rollback-' \
  | sort -r | tail -n +4 \
  | xargs -r docker rmi 2>/dev/null || true

printf '\n\033[32m✓ Deployed. %s\033[0m\n\n' "$(git rev-parse --short HEAD)"

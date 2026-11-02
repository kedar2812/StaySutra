#!/usr/bin/env bash
#
# Deploy whatever is new on origin/main. Run every two minutes by the
# staysutra-autodeploy systemd timer (scripts/systemd/), as the deploy user.
#
# Does nothing when the server is already at origin/main. When it is not,
# hands over to deploy.sh, which pulls, builds, migrates, health-checks and
# rolls back on failure. A failed deploy is not retried: deploy.sh has already
# pulled, so the next run sees nothing new. Push a fix, and that deploys.
#
#   journalctl -u staysutra-autodeploy -f      follow it
#   systemctl list-timers staysutra-autodeploy when it runs next
#
set -Eeuo pipefail

cd "$(dirname "$0")/.."

# One deploy at a time, including a manual ./deploy.sh started meanwhile.
exec 9>/tmp/staysutra-deploy.lock
flock -n 9 || { echo "deploy already running, skipping"; exit 0; }

git fetch --quiet origin main

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
[[ "$LOCAL" == "$REMOTE" ]] && exit 0

echo "[$(date -Is)] new commits: ${LOCAL:0:7} → ${REMOTE:0:7}"
git log --oneline "$LOCAL..$REMOTE"

./deploy.sh

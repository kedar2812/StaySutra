#!/usr/bin/env bash
#
# Nightly backup: pg_dump + an uploads tarball, 14-day rotation on disk.
# Run from cron:
#   0 3 * * * /opt/staysutra/scripts/backup.sh >> /var/log/staysutra-backup.log 2>&1
#
# The weekly copy to the client's Google Drive is configured separately with
# rclone; see docs/HANDOVER.md §7.
#
# DPR §3.1, §14.1
#
set -Eeuo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR=/var/staysutra/backups
UPLOAD_DIR=/var/staysutra/uploads
RETAIN_DAYS=14
STAMP="$(date +%Y-%m-%d)"

# shellcheck disable=SC1091
set -a; [[ -f .env ]] && source .env; set +a

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] backup start"

# --- Database ---------------------------------------------------------------
DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
docker compose exec -T db pg_dump \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --no-owner --no-privileges --clean --if-exists \
  | gzip -9 > "$DB_FILE.partial"
mv "$DB_FILE.partial" "$DB_FILE"
echo "  db      $(du -h "$DB_FILE" | cut -f1)  $DB_FILE"

# --- Uploads ----------------------------------------------------------------
UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
tar -czf "$UP_FILE.partial" -C / "${UPLOAD_DIR#/}"
mv "$UP_FILE.partial" "$UP_FILE"
echo "  uploads $(du -h "$UP_FILE" | cut -f1)  $UP_FILE"

# --- Verify -----------------------------------------------------------------
# A dump that will not gunzip is not a backup. Catch it tonight, not in a crisis.
gzip -t "$DB_FILE"
tar -tzf "$UP_FILE" > /dev/null
echo "  verified"

# --- Rotate -----------------------------------------------------------------
find "$BACKUP_DIR" -name 'db-*.sql.gz'      -mtime "+$RETAIN_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime "+$RETAIN_DAYS" -delete
find "$BACKUP_DIR" -name '*.partial'        -mtime +1 -delete

echo "[$(date -Is)] backup ok — $(find "$BACKUP_DIR" -name 'db-*.sql.gz' | wc -l) dumps retained"

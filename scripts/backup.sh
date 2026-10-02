#!/bin/sh
set -eu
export PGUSER="$(cat /run/secrets/postgres_user)" PGPASSWORD="$(cat /run/secrets/postgres_password)" PGDATABASE="$(cat /run/secrets/postgres_db)"
mkdir -p /backups/daily /backups/weekly
while true; do
  stamp="$(date -u +%Y-%m-%d)"
  pg_dump -Fc > "/backups/daily/$stamp.dump.tmp"
  mv "/backups/daily/$stamp.dump.tmp" "/backups/daily/$stamp.dump"
  if [ "$(date -u +%u)" = 7 ]; then cp "/backups/daily/$stamp.dump" "/backups/weekly/$stamp.dump"; fi
  find /backups/daily -name '*.dump' -mtime +6 -delete
  find /backups/weekly -name '*.dump' -mtime +27 -delete
  sleep 86400
done

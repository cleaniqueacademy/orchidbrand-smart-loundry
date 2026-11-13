#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
: "${BACKUP_ROOT:?Set absolute backup directory}"
: "${POSTGRES_USER:?Set database user}"
: "${POSTGRES_DB:?Set database name}"
[[ "$BACKUP_ROOT" = /* ]] || { echo 'BACKUP_ROOT must be absolute' >&2; exit 1; }
mkdir -p -- "$BACKUP_ROOT"
backup_dir=$(mktemp -d "$BACKUP_ROOT/pending.XXXXXXXX")
trap 'echo "Backup failed; incomplete data remains at $backup_dir" >&2' ERR
docker exec "${BACKUP_DB_CONTAINER:-cleanique_postgres}" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > "$backup_dir/database.dump"
docker exec "${BACKUP_APP_CONTAINER:-cleanique_backend}" tar -czf - -C /app/backend data/uploads data/wa_sessions > "$backup_dir/files.tar.gz"
(cd "$backup_dir" && sha256sum database.dump files.tar.gz) > "$backup_dir/SHA256SUMS"
printf '%s\n' "$(date -u +%FT%TZ)" > "$backup_dir/local_completed_at"
echo "Local backup completed: $backup_dir"
if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  rsync -a -e 'ssh -o BatchMode=yes' -- "$backup_dir/" "$BACKUP_REMOTE/$(basename "$backup_dir")/"
  date -u +%FT%TZ > "$backup_dir/external_copy_completed_at"
  echo 'External copy completed'
else
  echo 'External copy pending: copy directory and verify SHA256SUMS outside this VPS before release'
fi

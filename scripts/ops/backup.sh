#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
: "${BACKUP_ROOT:?Set absolute backup directory}"
: "${BACKUP_REMOTE:?Set SSH rsync destination outside VPS}"
: "${POSTGRES_USER:?Set database user}"
: "${POSTGRES_DB:?Set database name}"
[[ "$BACKUP_ROOT" = /* ]] || { echo 'BACKUP_ROOT must be absolute' >&2; exit 1; }
mkdir -p -- "$BACKUP_ROOT"
backup_dir=$(mktemp -d "$BACKUP_ROOT/pending.XXXXXXXX")
trap 'echo "Backup failed; incomplete data remains at $backup_dir" >&2' ERR
docker exec cleanique_postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > "$backup_dir/database.dump"
docker exec cleanique_backend tar -czf - -C /app/backend data/uploads auth_info_baileys > "$backup_dir/files.tar.gz"
(cd "$backup_dir" && sha256sum database.dump files.tar.gz) > "$backup_dir/SHA256SUMS"
printf '%s\n' "$(date -u +%FT%TZ)" > "$backup_dir/completed_at"
rsync -a -e 'ssh -o BatchMode=yes' -- "$backup_dir/" "$BACKUP_REMOTE/$(basename "$backup_dir")/"
echo "Backup completed and copied outside VPS: $backup_dir"

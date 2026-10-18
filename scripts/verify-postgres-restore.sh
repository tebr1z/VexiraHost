#!/usr/bin/env bash
set -euo pipefail

dump_path="${1:?Usage: verify-postgres-restore.sh <dump-file>}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL must point to a new, empty verification database}"

if [[ ! -f "$dump_path" ]]; then
  echo "Backup file does not exist: $dump_path" >&2
  exit 2
fi
if [[ -f "$dump_path.sha256" ]]; then
  (cd "$(dirname "$dump_path")" && sha256sum --check "$(basename "$dump_path").sha256")
fi

pg_restore --exit-on-error --no-owner --no-privileges --dbname="$RESTORE_DATABASE_URL" "$dump_path"
table_count="$(psql "$RESTORE_DATABASE_URL" -Atqc "select count(*) from information_schema.tables where table_schema='public'")"
if [[ "${table_count:-0}" -lt 1 ]]; then
  echo "Restore verification failed: no public tables restored" >&2
  exit 3
fi

printf 'Restore verified: %s public tables\n' "$table_count"

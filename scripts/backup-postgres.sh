#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the database being backed up}"

backup_dir="${1:-./backups/postgres}"
case "$backup_dir" in
  ""|"/") echo "Unsafe backup directory" >&2; exit 2 ;;
esac

mkdir -p -- "$backup_dir"
umask 077
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_path="$backup_dir/vexira-$timestamp.dump"

pg_dump --dbname="$DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges --file="$dump_path"
(cd "$(dirname "$dump_path")" && sha256sum "$(basename "$dump_path")" > "$(basename "$dump_path").sha256")
pg_restore --list "$dump_path" >/dev/null

printf '%s\n' "$dump_path"

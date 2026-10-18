# PostgreSQL backup and restore verification

Production backups must be stored outside the application server (S3 or R2 is supported by the application storage layer). The scripts use PostgreSQL custom-format dumps, a SHA-256 checksum, and a restore test against a new empty database.

```bash
DATABASE_URL='postgresql://...' ./scripts/backup-postgres.sh /srv/vexira-backups
createdb vexira_restore_check
RESTORE_DATABASE_URL='postgresql://.../vexira_restore_check' \
  ./scripts/verify-postgres-restore.sh /srv/vexira-backups/vexira-YYYYMMDDTHHMMSSZ.dump
dropdb vexira_restore_check
```

Never restore over the live database. Encrypt the backup volume, restrict file permissions, copy the dump and checksum to a separate account/bucket, and run a restore verification after every schema release. CI runs the same backup-and-restore path against an isolated PostgreSQL service.

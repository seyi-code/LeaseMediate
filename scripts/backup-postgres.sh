#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
URL="${DATABASE_URL:-postgresql://leasemediate:leasemediate_dev@localhost:5432/leasemediate}"
FILE="$OUT_DIR/leasemediate-$STAMP.sql.gz"
echo "Backing up to $FILE"
pg_dump "$URL" | gzip > "$FILE"
find "$OUT_DIR" -name 'leasemediate-*.sql.gz' -mtime +14 -delete 2>/dev/null || true
echo "Done: $FILE"

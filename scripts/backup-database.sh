#!/bin/bash

# Database Backup Script
# Creates timestamped backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-db.xtqsvwhwzxcutwdbxzyn.supabase.co}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE_GZ"

# Perform backup
if [ -z "$PGPASSWORD" ]; then
    echo "Error: PGPASSWORD environment variable not set"
    exit 1
fi

pg_dump -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        -f "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
echo "Backup completed successfully!"
echo "Backup size: $BACKUP_SIZE"

# Remove old backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List recent backups
echo "Recent backups:"
ls -lht "$BACKUP_DIR" | head -n 6

# Create a 'latest' symlink
ln -sf "$BACKUP_FILE_GZ" "$BACKUP_DIR/latest.sql.gz"

echo "Backup process completed!"

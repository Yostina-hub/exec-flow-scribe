#!/bin/bash

# Database Restore Script
# Restores database from a backup file

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-meeting_management}"
DB_USER="${DB_USER:-postgres}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 ./backups/backup_20250118_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "==================================="
echo "Database Restore"
echo "==================================="
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "==================================="

# Warning prompt
read -p "This will OVERWRITE the current database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
    echo "Error: PGPASSWORD environment variable not set"
    exit 1
fi

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
TEMP_SQL="$TEMP_DIR/restore.sql"

echo "Extracting backup file..."
gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"

echo "Dropping existing database connections..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

echo "Restoring database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$TEMP_SQL"

# Cleanup
rm -rf "$TEMP_DIR"

echo "Database restored successfully!"
echo "Restore completed at: $(date)"

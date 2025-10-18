#!/bin/bash

# Database Import Script
# Imports database from exported SQL file

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-meeting_management}"
DB_USER="${DB_USER:-postgres}"

# Check if import file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <export_file.sql.gz>"
    echo "Example: $0 ./exports/full_export_20250118_120000.sql.gz"
    exit 1
fi

IMPORT_FILE="$1"

# Check if file exists
if [ ! -f "$IMPORT_FILE" ]; then
    echo "Error: Import file not found: $IMPORT_FILE"
    exit 1
fi

echo "==================================="
echo "Database Import"
echo "==================================="
echo "Import file: $IMPORT_FILE"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "==================================="

# Warning
read -p "This will REPLACE the current database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Import cancelled."
    exit 0
fi

# Check PGPASSWORD
if [ -z "$PGPASSWORD" ]; then
    echo "Error: PGPASSWORD environment variable not set"
    exit 1
fi

# Drop and recreate database
echo "Dropping existing database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating new database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Import data
echo "Importing database..."
gunzip -c "$IMPORT_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

echo "Database imported successfully!"
echo "Import completed at: $(date)"

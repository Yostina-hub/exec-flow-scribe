#!/bin/bash

# Database Export Script
# Exports complete database including schema and data

set -e

# Configuration
EXPORT_DIR="${EXPORT_DIR:-./exports}"
DB_HOST="${DB_HOST:-db.xtqsvwhwzxcutwdbxzyn.supabase.co}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"

# Create export directory
mkdir -p "$EXPORT_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "==================================="
echo "Database Export"
echo "==================================="
echo "Export directory: $EXPORT_DIR"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "==================================="

# Check PGPASSWORD
if [ -z "$PGPASSWORD" ]; then
    echo "Error: PGPASSWORD environment variable not set"
    echo "Set it using: export PGPASSWORD='your_password'"
    exit 1
fi

# Export full database
echo "Exporting full database..."
FULL_EXPORT="$EXPORT_DIR/full_export_${TIMESTAMP}.sql"
pg_dump -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        -f "$FULL_EXPORT"

# Compress
gzip "$FULL_EXPORT"
FULL_EXPORT_GZ="${FULL_EXPORT}.gz"
echo "Full export: $FULL_EXPORT_GZ ($(du -h "$FULL_EXPORT_GZ" | cut -f1))"

# Export schema only
echo "Exporting schema only..."
SCHEMA_EXPORT="$EXPORT_DIR/schema_${TIMESTAMP}.sql"
pg_dump -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        --schema-only \
        -f "$SCHEMA_EXPORT"

gzip "$SCHEMA_EXPORT"
SCHEMA_EXPORT_GZ="${SCHEMA_EXPORT}.gz"
echo "Schema export: $SCHEMA_EXPORT_GZ ($(du -h "$SCHEMA_EXPORT_GZ" | cut -f1))"

# Export data only
echo "Exporting data only..."
DATA_EXPORT="$EXPORT_DIR/data_${TIMESTAMP}.sql"
pg_dump -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        --data-only \
        -f "$DATA_EXPORT"

gzip "$DATA_EXPORT"
DATA_EXPORT_GZ="${DATA_EXPORT}.gz"
echo "Data export: $DATA_EXPORT_GZ ($(du -h "$DATA_EXPORT_GZ" | cut -f1))"

# Create symlinks to latest
ln -sf "$FULL_EXPORT_GZ" "$EXPORT_DIR/latest_full.sql.gz"
ln -sf "$SCHEMA_EXPORT_GZ" "$EXPORT_DIR/latest_schema.sql.gz"
ln -sf "$DATA_EXPORT_GZ" "$EXPORT_DIR/latest_data.sql.gz"

# Create export manifest
MANIFEST="$EXPORT_DIR/manifest_${TIMESTAMP}.txt"
cat > "$MANIFEST" << EOF
Database Export Manifest
========================
Date: $(date)
Database: $DB_NAME
Host: $DB_HOST

Files:
- Full Export: $(basename "$FULL_EXPORT_GZ")
- Schema Export: $(basename "$SCHEMA_EXPORT_GZ")
- Data Export: $(basename "$DATA_EXPORT_GZ")

Sizes:
- Full: $(du -h "$FULL_EXPORT_GZ" | cut -f1)
- Schema: $(du -h "$SCHEMA_EXPORT_GZ" | cut -f1)
- Data: $(du -h "$DATA_EXPORT_GZ" | cut -f1)

To restore:
  gunzip -c $FULL_EXPORT_GZ | psql -h HOST -U USER -d DATABASE
EOF

cat "$MANIFEST"

echo ""
echo "==================================="
echo "Export completed successfully!"
echo "==================================="
echo "Files created in: $EXPORT_DIR"
echo ""
echo "To import on another server:"
echo "  gunzip -c $FULL_EXPORT_GZ | psql -h HOST -U USER -d DATABASE"

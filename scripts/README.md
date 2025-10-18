# Database Management Scripts

## Overview
These scripts help you manage database backups, exports, and imports.

## Prerequisites
- PostgreSQL client tools (`psql`, `pg_dump`)
- Bash shell
- Database credentials set as environment variables

## Environment Variables
```bash
export PGPASSWORD='your_database_password'
export DB_HOST='db.xtqsvwhwzxcutwdbxzyn.supabase.co'
export DB_USER='postgres'
export DB_NAME='postgres'
export DB_PORT='5432'
```

## Scripts

### 1. Export Database (`export-database.sh`)
Exports the complete database with schema and data.

```bash
# Make executable
chmod +x scripts/export-database.sh

# Run export
./scripts/export-database.sh
```

**Output:**
- `exports/full_export_TIMESTAMP.sql.gz` - Complete database
- `exports/schema_TIMESTAMP.sql.gz` - Schema only
- `exports/data_TIMESTAMP.sql.gz` - Data only
- `exports/latest_full.sql.gz` - Symlink to latest full export

### 2. Import Database (`import-database.sh`)
Imports a database from an exported file.

```bash
# Import to local database
./scripts/import-database.sh exports/full_export_20250118_120000.sql.gz
```

**Warning:** This will replace the target database!

### 3. Backup Database (`backup-database.sh`)
Creates timestamped backups with automatic retention.

```bash
# Run backup
./scripts/backup-database.sh
```

**Features:**
- Automatic compression
- Retention policy (default 7 days)
- Symlink to latest backup

### 4. Restore Database (`restore-database.sh`)
Restores from a backup file.

```bash
# Restore from backup
./scripts/restore-database.sh backups/backup_20250118_120000.sql.gz
```

## Quick Start Guide

### Export Current Supabase Database

1. Set your Supabase credentials:
```bash
export PGPASSWORD='your_supabase_postgres_password'
export DB_HOST='db.xtqsvwhwzxcutwdbxzyn.supabase.co'
```

2. Run export:
```bash
./scripts/export-database.sh
```

3. Find your export in `exports/` directory

### Import to Local Docker Database

1. Start Docker containers:
```bash
docker-compose up -d db
```

2. Set local database credentials:
```bash
export PGPASSWORD='change_me_in_production'
export DB_HOST='localhost'
export DB_NAME='meeting_management'
```

3. Import:
```bash
./scripts/import-database.sh exports/latest_full.sql.gz
```

### Set Up Automated Backups

Add to crontab:
```bash
crontab -e

# Add line for daily 2 AM backup
0 2 * * * cd /path/to/project && PGPASSWORD=your_password ./scripts/backup-database.sh
```

## Troubleshooting

### Permission Denied
```bash
chmod +x scripts/*.sh
```

### Connection Refused
- Check database host and port
- Verify firewall rules
- Test connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`

### Authentication Failed
- Verify PGPASSWORD is set correctly
- Check user permissions
- Confirm database exists

## NPM Scripts

You can also use npm scripts:

```bash
# Export database
npm run export:database

# Import database
npm run import:database exports/latest_full.sql.gz

# Backup database
npm run backup:database

# Restore from backup
npm run restore:database backups/latest.sql.gz
```

## Best Practices

1. **Regular Backups**: Set up automated daily backups
2. **Test Restores**: Regularly test your backup files
3. **Multiple Locations**: Store backups in multiple locations
4. **Secure Credentials**: Never commit passwords to git
5. **Monitor Size**: Watch backup sizes and disk space
6. **Version Control**: Keep track of schema changes

## Storage Recommendations

- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 1 month  
- **Monthly backups**: Keep for 1 year
- **Off-site storage**: Use cloud storage (S3, Google Cloud Storage)

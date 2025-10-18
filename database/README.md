# Database Files

This directory contains the complete database schema for the Meeting Management System.

## Files

### `complete_schema.sql`
Complete database schema including:
- All custom types (enums)
- All tables with constraints
- Row Level Security (RLS) policies
- Functions and triggers
- Indexes for performance
- Default roles and permissions

## Quick Import

### Option 1: Import to Local PostgreSQL
```bash
# Import to local database
psql -U postgres -d meeting_management < database/complete_schema.sql
```

### Option 2: Import to Docker Database
```bash
# Start Docker database
docker-compose up -d db

# Import schema
docker-compose exec -T db psql -U postgres -d meeting_management < database/complete_schema.sql
```

### Option 3: Import to Supabase
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Copy contents of `complete_schema.sql`
4. Run the SQL

## Database Structure

### Core Tables
- **profiles** - User profiles and information
- **roles** - System roles (admin, moderator, user)
- **user_roles** - User-role assignments
- **permissions** - System permissions
- **role_permissions** - Role-permission mappings
- **meetings** - Meeting information
- **meeting_attendees** - Meeting participants
- **agenda_items** - Meeting agenda items
- **action_items** - Action items and tasks
- **decisions** - Meeting decisions
- **transcriptions** - Meeting transcriptions
- **meeting_minutes** - Generated meeting minutes

### Additional Tables
- **event_categories** - Meeting categories
- **action_status_updates** - Action item status history
- **ai_provider_preferences** - User AI provider settings
- **meeting_media** - Audio/video recordings

## Default Data

The schema includes:
- 3 default roles: admin, moderator, user
- All necessary permissions
- Permission assignments for roles

## Security

All tables have Row Level Security (RLS) enabled with appropriate policies:
- Users can only view their own data
- Admins have full access via permission checks
- Meeting participants can access meeting data
- Action assignees can update their tasks

## Functions

### `handle_new_user()`
Automatically creates a profile when a user signs up.

### `handle_updated_at()`
Updates the `updated_at` timestamp on record changes.

### `has_permission(user_id, resource, action)`
Security definer function to check user permissions.

### `has_any_role(user_id)`
Checks if user has any role assigned.

### `get_users_with_role_name(role_name)`
Returns all users with a specific role.

## Indexes

Performance indexes are created on:
- Meeting start times
- Meeting creators
- Meeting status
- Action item assignments
- Action item status and due dates
- Transcription meeting associations

## Connecting Your Application

After importing the schema, update your application's `.env.local`:

```env
VITE_SUPABASE_URL=your_database_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## Backup and Restore

### Create Backup
```bash
pg_dump -U postgres -d meeting_management > backup_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
psql -U postgres -d meeting_management < backup_20250118.sql
```

## Troubleshooting

### Permission Denied
Ensure you're running as a superuser or database owner:
```bash
psql -U postgres -d meeting_management
```

### Extension Not Found
Install required PostgreSQL extensions:
```bash
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### RLS Policy Errors
If you get RLS policy errors, ensure:
1. Auth is properly configured
2. Users are authenticated before accessing data
3. User IDs match between auth.users and profiles table

## Migration from Existing Database

If you have an existing database, you can:

1. **Export your data:**
```bash
pg_dump -U postgres -d old_database --data-only > data.sql
```

2. **Import the new schema:**
```bash
psql -U postgres -d new_database < database/complete_schema.sql
```

3. **Import your data:**
```bash
psql -U postgres -d new_database < data.sql
```

## Database Diagram

```
auth.users (Supabase managed)
    ↓
profiles
    ├─→ user_roles → roles → role_permissions → permissions
    ├─→ meetings
    │      ├─→ meeting_attendees
    │      ├─→ agenda_items
    │      ├─→ action_items
    │      ├─→ decisions
    │      ├─→ transcriptions
    │      ├─→ meeting_minutes
    │      └─→ meeting_media
    └─→ ai_provider_preferences
```

## Support

For issues or questions:
1. Check PostgreSQL logs
2. Verify Supabase connection
3. Review RLS policies
4. Check user authentication

## Version

- Schema Version: 1.0.0
- Last Updated: 2025-10-18
- Compatible with: PostgreSQL 15+

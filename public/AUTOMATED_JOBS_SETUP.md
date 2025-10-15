# Automated Follow-ups & Scheduled Jobs Setup

This system provides automated action item management with nudges, escalations, and progress reports.

## Features Implemented

### 1. Action Owner Nudges
- **Frequency**: Daily (recommended: 9 AM)
- **Function**: `send-action-nudges`
- **Triggers for**: Actions due within 3 days, not completed, not nudged in last 24 hours
- **Includes**: Quick-reply status chips (On Track / Blocked / Done)

### 2. Escalation Ladders
- **Frequency**: Daily (recommended: 10 AM)
- **Function**: `check-escalations`
- **Level 1**: Blocked actions OR due within 1 day → Chief of Staff
- **Level 2**: Overdue actions already at Level 1 → CEO

### 3. Weekly Progress Rollup
- **Frequency**: Weekly (recommended: Monday 8 AM)
- **Function**: `weekly-progress-rollup`
- **Sends to**: CEO
- **Includes**:
  - Actions closed this week
  - Overdue actions
  - At-risk actions
  - Recent decisions
  - Upcoming meetings
  - Completion rate trends

### 4. Quick-Reply Status Updates
- **Function**: `update-action-status`
- **Method**: URL-based (included in nudge emails)
- **Updates**: Status detail, ETA, completion status
- **Resets**: Escalations when status improves

## Setup Instructions

### Step 1: Configure Escalation Recipients

1. Go to **Settings** → **Escalation** tab
2. Select the **Chief of Staff** (receives Level 1 escalations)
3. Select the **CEO** (receives Level 2 escalations and weekly reports)
4. Click **Save Escalation Settings**

### Step 2: Configure SMTP (if not already done)

1. Go to **Settings** → **Email (SMTP)** tab
2. Enter your SMTP server details
3. Test the connection
4. Save settings

### Step 3: Set Up Cron Jobs

You need to enable `pg_cron` extension and create scheduled jobs. Execute the following SQL in your backend database:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily action nudges (9 AM every day)
SELECT cron.schedule(
  'send-action-nudges-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/send-action-nudges',
    headers:='{"Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);

-- Daily escalation checks (10 AM every day)
SELECT cron.schedule(
  'check-escalations-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/check-escalations',
    headers:='{"Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);

-- Weekly progress rollup (Monday 8 AM)
SELECT cron.schedule(
  'weekly-progress-rollup',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/weekly-progress-rollup',
    headers:='{"Content-Type": "application/json"}'::jsonb
  ) as request_id;
  $$
);
```

### Step 4: Verify Setup

You can manually trigger the functions to test them:

```sql
-- Test action nudges
SELECT net.http_post(
  url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/send-action-nudges',
  headers:='{"Content-Type": "application/json"}'::jsonb
) as request_id;

-- Test escalations
SELECT net.http_post(
  url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/check-escalations',
  headers:='{"Content-Type": "application/json"}'::jsonb
) as request_id;

-- Test weekly rollup
SELECT net.http_post(
  url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/weekly-progress-rollup',
  headers:='{"Content-Type": "application/json"}'::jsonb
) as request_id;
```

### Step 5: Monitor Notifications

View sent notifications in the backend:

```sql
SELECT * FROM notification_log 
ORDER BY sent_at DESC 
LIMIT 50;
```

## Database Schema Updates

The following tables were added/updated:

### Updated: `action_items`
- `status_detail` - on_track | blocked | done
- `eta` - Expected completion date
- `last_nudge_sent` - Timestamp of last nudge
- `escalation_level` - 0, 1 (COS), or 2 (CEO)
- `escalated_to` - User ID who received escalation
- `escalated_at` - Escalation timestamp
- `blocked_reason` - Why action is blocked

### New: `action_status_updates`
- Tracks all status changes
- Captures old/new status and comments
- Linked to action and user

### New: `notification_log`
- Audit trail of all sent notifications
- Tracks type, recipient, and metadata
- Linked to actions and meetings

### New: `escalation_config`
- Stores Chief of Staff and CEO user IDs
- Used by escalation logic

## Customization

### Adjust Nudge Timing
Edit the cron schedule in the SQL above. Format: `minute hour day month weekday`

Examples:
- `0 9 * * *` - Daily at 9 AM
- `0 9,15 * * *` - Daily at 9 AM and 3 PM
- `0 9 * * 1-5` - Weekdays at 9 AM

### Adjust Escalation Thresholds
Edit `supabase/functions/check-escalations/index.ts`:
- Change `twoDaysFromNow` to adjust when escalations start
- Modify escalation logic for different criteria

### Adjust Nudge Criteria
Edit `supabase/functions/send-action-nudges/index.ts`:
- Change `threeDaysFromNow` to adjust nudge window
- Modify `oneDayAgo` to change nudge frequency

## Troubleshooting

### Emails Not Sending
1. Check SMTP settings in Settings → Email (SMTP)
2. Test SMTP connection
3. Check notification_log for errors
4. Verify edge function logs in backend

### Escalations Not Working
1. Verify Chief of Staff and CEO are configured
2. Check that actions have proper due dates
3. Review action status_detail values
4. Check edge function logs

### Cron Jobs Not Running
1. Verify pg_cron extension is enabled
2. Check cron job status: `SELECT * FROM cron.job;`
3. Check cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`

## Future Enhancements

Potential additions for future development:
- PM tool integration (Jira, Asana, etc.)
- Slack/Teams notifications
- Custom nudge templates
- Escalation path customization
- Team-based escalations
- Action dependency tracking

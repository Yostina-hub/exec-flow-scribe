# SMTP Auto-Email Cron Job Setup

This document explains how to set up automatic email distribution using your configured SMTP settings and cron jobs.

## Features

- **Automatic Distribution**: Sends meeting minutes automatically when meetings reach "signed_off" stage
- **SMTP-Based**: Uses your configured SMTP settings from the GUI
- **Scheduled Checking**: Runs periodically to check for meetings ready for distribution
- **Error Handling**: Continues processing even if individual emails fail

## Prerequisites

1. **SMTP Configuration**: Configure your SMTP settings in Settings > Email Configuration
2. **Database Extensions**: Enable `pg_cron` and `pg_net` extensions

## Setup Instructions

### 1. Enable Required Extensions

Run this SQL in your database (via Lovable Cloud backend):

```sql
-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Create Cron Job for Email Distribution

Run this SQL to schedule automatic email distribution every hour:

```sql
-- Schedule email distribution to run every hour
SELECT cron.schedule(
  'auto-distribute-minutes-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/scheduled-email-distribution',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cXN2d2h3enhjdXR3ZGJ4enluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgxMTEsImV4cCI6MjA3NTk2NDExMX0.LKeKvr-JzlFCz_LE6vd-FD-8-UAUoj3m_AD_LelxS7o"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### 3. Verify Cron Job Setup

Check that the cron job is scheduled:

```sql
SELECT * FROM cron.job;
```

### 4. Manual Test

You can manually trigger the distribution function to test:

```sql
SELECT
  net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/scheduled-email-distribution',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cXN2d2h3enhjdXR3ZGJ4enluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgxMTEsImV4cCI6MjA3NTk2NDExMX0.LKeKvr-JzlFCz_LE6vd-FD-8-UAUoj3m_AD_LelxS7o"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
```

## How It Works

1. **Cron Trigger**: The cron job runs every hour
2. **Meeting Check**: Function queries for meetings with status='completed', workflow_stage='signed_off', and distributed_at=null
3. **SMTP Lookup**: For each meeting, fetches the creator's active SMTP settings
4. **Email Distribution**: Sends minutes to all attendees using SMTP
5. **Logging**: Records distribution in `email_distributions` table
6. **Update Status**: Marks meeting as distributed

## Monitoring

### View Email Distribution Log

```sql
SELECT * FROM email_distributions
ORDER BY sent_at DESC
LIMIT 20;
```

### View Cron Job Execution History

```sql
SELECT * FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'auto-distribute-minutes-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

## Customization

### Change Schedule Frequency

To run every 30 minutes instead:

```sql
SELECT cron.unschedule('auto-distribute-minutes-hourly');

SELECT cron.schedule(
  'auto-distribute-minutes-30min',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
      url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/scheduled-email-distribution',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cXN2d2h3enhjdXR3ZGJ4enluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgxMTEsImV4cCI6MjA3NTk2NDExMX0.LKeKvr-JzlFCz_LE6vd-FD-8-UAUoj3m_AD_LelxS7o"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### Disable Auto-Distribution

```sql
SELECT cron.unschedule('auto-distribute-minutes-hourly');
```

## Troubleshooting

1. **No emails being sent**: Check that SMTP settings are configured and active
2. **Cron job not running**: Verify `pg_cron` extension is enabled
3. **Partial failures**: Check `email_distributions` table for error details
4. **Meeting not distributed**: Ensure meeting has status='completed' and workflow_stage='signed_off'

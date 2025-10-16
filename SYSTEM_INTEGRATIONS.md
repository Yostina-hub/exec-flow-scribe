# System Integrations Documentation

## Overview
This document describes the comprehensive integration layer connecting all systems in the Executive Meeting Management Platform.

## Integration Architecture

### Core Integration Hooks

#### 1. `useSystemIntegration`
Central integration hub that orchestrates all system interactions.

**Triggers:**
- **Meeting Created** → Auto-generates context capsules for attendees + Creates event notifications
- **Meeting Completed** → Triggers full AI processing pipeline (minutes, sentiment, briefs, hints)
- **Action Updated** → Checks for escalations + Updates meeting progress
- **Transcription Progress** → Monitors for completion triggers

**Real-time Listeners:**
- Meetings table (INSERT, UPDATE)
- Action items table (UPDATE)
- Transcription segments table (INSERT)

#### 2. `useCalendarActionSync`
Syncs action items with calendar automatically.

**Features:**
- Creates calendar reminders for action due dates
- Respects user calendar sync preferences
- Auto-creates 30-minute calendar blocks
- Updates when actions are completed

**Trigger:** Any change to action_items table for assigned user

#### 3. `useNotificationDispatcher`
Central notification handler respecting user preferences.

**Features:**
- Meeting reminders based on user-configured timing
- Executive coach hints as toast notifications
- Respects notification_preferences from profiles
- Real-time notification delivery

**Trigger:** New event_notifications or executive_coach_hints

---

## Automated Workflows

### 1. Meeting Lifecycle Integration

```
Meeting Created
    ↓
├─→ Generate Context Capsules (for all attendees)
├─→ Create Event Notifications (based on preferences)
└─→ Schedule Calendar Reminders
```

```
Meeting Status: scheduled → completed
    ↓
AI Processing Pipeline:
    ├─→ 1. Generate Minutes (AI)
    ├─→ 2. Analyze Sentiment
    ├─→ 3. Generate Executive Briefs
    ├─→ 4. Generate Coach Hints
    └─→ 5. Notify Attendees (Minutes Ready)
```

### 2. Action Item Workflow

```
Action Updated
    ↓
├─→ Status: pending → blocked? → Trigger Escalation
├─→ Due Date < Today? → Trigger Escalation
├─→ Status: * → completed? → Update Meeting Progress
└─→ Calendar Sync (if enabled)
```

```
Action Escalation Triggers:
    ├─→ Status becomes 'blocked'
    ├─→ Due date passes (overdue)
    └─→ Invokes: check-escalations edge function
        ↓
    Escalation Routing:
        ├─→ Level 1: Chief of Staff (blocked or due within 1 day)
        └─→ Level 2: CEO (overdue)
```

### 3. AI Processing Pipeline

```
Transcription Complete
    ↓
Meeting Completed
    ↓
Sequential AI Processing:
    ├─→ generate-minutes (Lovable AI)
    ├─→ analyze-meeting-sentiment
    ├─→ generate-executive-brief (per attendee)
    ├─→ generate-coach-hints
    └─→ Notification: Minutes Ready
```

### 4. Notification System

**Types:**
- Meeting Reminders (configurable timing)
- Action Item Updates
- Minutes Ready Alerts
- Daily Digest (if enabled)
- Executive Coach Hints

**Delivery:**
- Real-time toast notifications
- Email (via SMTP settings)
- Respects user notification_preferences

### 5. Calendar Integration

**Synced Events:**
- Meetings (from meetings table)
- Action Due Dates (from action_items)
- Recurring Events (with exceptions)

**Features:**
- Auto-notification creation
- Category color coding
- Event exceptions handling

---

## Database Integration Layer

### Real-time Enabled Tables
```sql
-- Enabled for real-time updates
- meetings
- action_items
- event_notifications
- executive_coach_hints
```

### Performance Indexes
```sql
-- Optimized for integration queries
- idx_meetings_created_by
- idx_meetings_status
- idx_action_items_assigned_to
- idx_action_items_meeting_id
- idx_action_items_due_date
- idx_action_items_status
- idx_event_notifications_user_id
- idx_meeting_attendees_user_id
```

---

## Edge Function Integration

### Automated Jobs (via Automation Settings)
1. **send-action-nudges** (Daily 9:00 AM)
   - Sends reminders to action owners
   - Includes quick-reply status updates

2. **check-escalations** (Every 6 hours)
   - Monitors at-risk actions
   - Routes to Chief of Staff or CEO

3. **weekly-progress-rollup** (Monday 8:00 AM)
   - CEO digest of all progress
   - Meeting and action summaries

### AI Functions
- `generate-minutes` - Full meeting transcription to minutes
- `analyze-meeting-sentiment` - Sentiment analysis
- `generate-executive-brief` - Per-user meeting summaries
- `generate-coach-hints` - Contextual productivity suggestions
- `generate-context-capsule` - Pre-meeting context for attendees

---

## User Preference Integration

### Notification Preferences
```typescript
{
  meeting_reminders: boolean,
  action_item_updates: boolean,
  minutes_ready: boolean,
  daily_digest: boolean,
  reminder_timing: 5 | 15 | 30 | 60 // minutes
}
```

### Meeting Preferences
```typescript
{
  default_duration: number,
  default_location: string,
  calendar_sync: 'google' | 'outlook' | 'apple',
  auto_schedule_followup: boolean,
  enable_virtual_links: boolean
}
```

### Security Preferences
```typescript
{
  data_retention_period: string,
  two_factor_enabled: boolean,
  encrypt_recordings: boolean,
  activity_logging: boolean
}
```

---

## Integration Flow Examples

### Example 1: User Creates Meeting
```
1. User creates meeting via UI
2. useSystemIntegration detects INSERT on meetings table
3. Fetches all attendees from meeting_attendees
4. For each attendee:
   a. Generates context capsule (via edge function)
   b. Checks notification_preferences
   c. Creates event_notifications record
5. Calendar sync creates calendar event
6. Real-time notification sent to attendees
```

### Example 2: Action Becomes Overdue
```
1. Automated job: check-escalations runs every 6 hours
2. Detects action with due_date < now() and status = 'pending'
3. Checks escalation_config for routing
4. Sends email to Chief of Staff (Level 1)
5. If still not resolved after 24h → escalates to CEO (Level 2)
6. useNotificationDispatcher shows real-time alert
7. Dashboard updates with escalation badge
```

### Example 3: Meeting Completes
```
1. User marks meeting status = 'completed'
2. useSystemIntegration detects UPDATE
3. Triggers AI processing pipeline:
   a. generate-minutes (5-10 min)
   b. analyze-meeting-sentiment (1-2 min)
   c. generate-executive-brief per attendee (2-3 min each)
   d. generate-coach-hints (1 min)
4. For each attendee with minutes_ready = true:
   a. Creates notification
   b. Sends email via SMTP
5. Updates meeting progress percentage
6. Marks meeting as "Minutes Ready"
```

---

## Testing Integration

### Manual Testing
1. Create a meeting → Check for context capsule and notifications
2. Complete a meeting → Verify AI processing pipeline runs
3. Update action to blocked → Verify escalation triggers
4. Set action due date in past → Verify escalation
5. Check calendar for synced action reminders

### Real-time Verification
- Open browser console
- Watch for integration logs:
  - "New meeting created, triggering integrations"
  - "Meeting completed, triggering AI processing pipeline"
  - "Action requires escalation"
  - "Minutes ready notification for user"

### Edge Function Logs
Check Supabase Edge Function logs for:
- Function invocation success/failure
- AI API responses
- Email delivery status
- Escalation routing decisions

---

## Performance Considerations

### Optimizations
- Indexes on all foreign keys and frequently queried fields
- Real-time channels subscription cleanup on unmount
- Batch processing for multiple attendees
- Parallel AI function calls where possible

### Resource Usage
- Real-time channels: 3 per user session
- Edge function invocations: Triggered by events (pay per use)
- Database queries: Optimized with indexes
- AI API calls: Sequential pipeline (10-20 mins per meeting)

---

## Troubleshooting

### Integration Not Triggering
1. Check browser console for errors
2. Verify real-time subscription status
3. Check RLS policies allow updates
4. Verify edge functions are deployed

### Notifications Not Appearing
1. Check user notification_preferences
2. Verify SMTP settings configured
3. Check event_notifications table for records
4. Verify real-time channel subscription

### AI Pipeline Stuck
1. Check edge function logs
2. Verify LOVABLE_API_KEY is set
3. Check for API rate limits
4. Verify meeting has transcription data

---

## Future Enhancements

### Planned Integrations
- [ ] Slack/Teams notification channels
- [ ] External calendar sync (Google Calendar API)
- [ ] Automated follow-up meeting scheduling
- [ ] Action item dependencies tracking
- [ ] Meeting quality scoring
- [ ] Automated meeting note templates
- [ ] Voice command integration
- [ ] Mobile push notifications

### Enhancement Ideas
- Predictive action due date suggestions
- Meeting effectiveness analytics
- Automated agenda generation from action items
- Cross-meeting decision tracking
- Meeting cost calculator
- Participant engagement scoring
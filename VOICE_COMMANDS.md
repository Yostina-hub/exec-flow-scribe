# 🎙️ Voice Commands Guide

## Overview

Control your meetings hands-free using voice commands in **Amharic (አማርኛ)** and **English**. Perfect for when you need to manage meetings while presenting, taking notes, or when your hands are busy.

---

## 🚀 Getting Started

### 1. Enable Voice Commands

1. Navigate to a meeting's **Transcription** tab
2. Find the **Voice Commands** card
3. Click **"Start Voice Commands"**
4. Allow microphone access when prompted

### 2. Speak Commands

Simply say any of the supported commands naturally. The system will:
- Recognize your command
- Display what it understood
- Execute the action
- Provide audio/visual feedback

### 3. Toggle Audio Feedback

- Click the 🔊 icon to mute/unmute voice feedback
- Visual feedback will still work when muted

---

## 📋 Complete Command Reference

### 🎥 Recording Controls

| Command (English) | Command (Amharic) | What It Does |
|------------------|-------------------|--------------|
| "Start recording" | "ጀምር መቅረጽ" | Begins meeting audio recording |
| "Begin recording" | "መቅረጽ ጀምር" | Alternative start command |
| "Record now" | "ቅዳ ጀምር" | Quick start recording |
| | | |
| "Stop recording" | "አቁም መቅረጽ" | Stops active recording |
| "End recording" | "መቅረጽ አቁም" | Alternative stop command |
| "Stop capture" | "ቅዳ አቁም" | Quick stop recording |
| | | |
| "Pause recording" | "ቆም መቅረጽ" | Pauses current recording |
| "Hold recording" | "ለአፍታ ቁም" | Temporary pause |
| | | |
| "Resume recording" | "ቀጥል መቅረጽ" | Resumes paused recording |
| "Continue recording" | "እንደገና ጀምር" | Continue after pause |

### 📝 Task & Decision Management

| Command (English) | Command (Amharic) | What It Does |
|------------------|-------------------|--------------|
| "Add action" | "ተግባር ጨምር" | Navigate to Actions tab |
| "Create action" | "አዲስ ተግባር" | Open action creation |
| "New action" | "ስራ ጨምር" | Add new task |
| "Add task" | "ታስክ ጨምር" | Create task item |
| | | |
| "Add decision" | "ውሳኔ ጨምር" | Navigate to Decisions tab |
| "Record decision" | "አዲስ ውሳኔ" | Record new decision |
| "New decision" | "ውሳኔ መዝግብ" | Log decision |
| "Save decision" | "ውሳኔ ፃፍ" | Alternative save command |

### ✨ Voice Dictation (NEW!)

Create action items and decisions instantly by dictating the full details:

#### Action Item Dictation

Say the complete action with optional details, and the system will automatically create it:

**Examples:**

| What You Say | What Gets Created |
|-------------|-------------------|
| "Add action: Follow up with marketing team by Friday" | Action: "Follow up with marketing team"<br>Due: This Friday<br>Priority: Medium |
| "Create task: Review Q4 budget by tomorrow" | Action: "Review Q4 budget"<br>Due: Tomorrow<br>Priority: Medium |
| "Action item: Call vendor about pricing priority high" | Action: "Call vendor about pricing"<br>Due: 7 days from now<br>Priority: High |
| "New action: Schedule team meeting by Monday" | Action: "Schedule team meeting"<br>Due: Next Monday<br>Priority: Medium |

**Supported Date Formats:**
- "by tomorrow" / "due tomorrow"
- "by Friday" / "due Monday" (any day of week)
- "by 12/25" / "due 3/15" (MM/DD format)

**Priority Levels:**
- Add "priority high" for urgent tasks
- Add "priority low" for non-urgent tasks
- Default is "priority medium"

#### Decision Dictation

Record decisions with context instantly:

**Examples:**

| What You Say | What Gets Recorded |
|-------------|-------------------|
| "Add decision: Approved Q4 marketing budget" | Decision: "Approved Q4 marketing budget"<br>Status: Approved |
| "Record decision: Postponed server upgrade to Q1" | Decision: "Postponed server upgrade to Q1"<br>Status: Approved |
| "Decision: Hired three new engineers by CEO" | Decision: "Hired three new engineers"<br>Context: "by CEO" |
| "New decision: Changed vendor to CompanyX" | Decision: "Changed vendor to CompanyX"<br>Status: Approved |

**Note:** Dictated decisions are automatically approved since they're being recorded during the meeting.

---

## 👥 Voice Task Assignment (NEW!)

Assign tasks to team members using voice commands. After creating an action item, simply say who should do it!

### How It Works

1. **Create an action first** (using any method: voice dictation, UI, etc.)
2. **Say assignment command** within a few seconds
3. **System assigns automatically** and notifies the team member

### Assignment Commands

| What You Say | What Happens |
|-------------|--------------|
| "Assign this to John" | Assigns most recent action to user named John |
| "Give this task to Sarah" | Assigns most recent action to Sarah |
| "Reassign to Michael" | Changes assignment to Michael |
| "Make David the assignee" | Sets David as the assignee |
| "Change assignee to Lisa" | Switches assignment to Lisa |

### Smart Name Matching

The system intelligently finds team members:
- ✅ **Partial names**: "Assign to John" finds "John Smith" or "John Doe"
- ✅ **Full names**: "Give this to Sarah Johnson" 
- ✅ **Email addresses**: "Assign to john@company.com"
- ✅ **Case insensitive**: "JOHN", "john", or "John" all work

### Complete Workflow Example

```
You say: "Add action: Review marketing proposal priority high"
System: ✓ Creates action item

You say: "Assign this to Sarah"
System: ✓ Finds Sarah in team directory
        ✓ Assigns task to Sarah
        ✓ Sends notification to Sarah
        ✓ Confirms "Task assigned to Sarah Johnson"
```

### Permissions

- **Action creator** can always reassign their own tasks
- **Admins/Managers** can reassign any task
- **Others** cannot reassign tasks they didn't create

### Troubleshooting

**Problem**: "No user found matching..."
- ✓ Check the name spelling
- ✓ Try using email address instead
- ✓ Use their display name from the system

**Problem**: "No recent action"
- ✓ Create an action first
- ✓ Assignment must follow within 30 seconds
- ✓ Only works with tasks you just created

**Problem**: "You do not have permission..."
- ✓ Only creator or admin can reassign
- ✓ Create your own task first

---

## ⚡ Voice Priority Control (NEW!)

Change task priority using voice commands. After creating an action item, adjust its priority level instantly!

### How It Works

1. **Create an action first** (using voice dictation or UI)
2. **Say priority command** within a few seconds
3. **System updates priority** and notifies if needed

### Priority Commands

| What You Say | Priority Set |
|-------------|-------------|
| "Make this high priority" | Sets priority to HIGH |
| "Change priority to urgent" | Sets priority to HIGH |
| "Mark this as critical" | Sets priority to HIGH |
| "Set priority to important" | Sets priority to HIGH |
| | |
| "Make this medium priority" | Sets priority to MEDIUM |
| "Change priority to normal" | Sets priority to MEDIUM |
| "Set priority to moderate" | Sets priority to MEDIUM |
| | |
| "Make this low priority" | Sets priority to LOW |
| "Change priority to minor" | Sets priority to LOW |
| "Mark as not urgent" | Sets priority to LOW |
| | |
| "Increase the priority" | Increases to HIGH |
| "Raise priority" | Increases to HIGH |
| "Lower the priority" | Decreases to LOW |
| "Decrease priority" | Decreases to LOW |

### Smart Priority Mapping

The system intelligently maps keywords to priority levels:

**High Priority Keywords:**
- urgent, important, critical, high, top

**Medium Priority Keywords:**
- medium, normal, moderate, regular

**Low Priority Keywords:**
- low, minor, not urgent

### Complete Workflow Example

```
You say: "Add action: Review security audit"
System: ✓ Creates action (default priority: medium)

You say: "Make this urgent"
System: ✓ Changes priority to HIGH
        ✓ Notifies assignee if applicable
        ✓ Confirms "Priority set to high"
```

### Notifications

- **High Priority Changes**: Assignee receives notification when priority is raised to high
- **Automatic Updates**: Priority changes trigger timestamp updates
- **Audit Trail**: All changes are logged for tracking

### Permissions

- **Task Creator** can always change priority
- **Task Assignee** can change their own task priority
- **Admins/Managers** can change any task priority

### Troubleshooting

**Problem**: "No recent action"
- ✓ Create an action first
- ✓ Priority change must follow within 30 seconds
- ✓ Only works with tasks you just created

**Problem**: "You do not have permission..."
- ✓ Only creator, assignee, or admin can change priority
- ✓ Must be your task or you must have admin role

**Problem**: "Invalid priority"
- ✓ Use recognized keywords (urgent, high, medium, low)
- ✓ Speak clearly for accurate recognition

---

## 🗓️ Voice Due Date Control (NEW!)

Set task deadlines using natural language with voice commands. Just say when you need something done!

### How It Works

1. **Create an action first** (using voice dictation or UI)
2. **Say due date command** with natural language
3. **System parses and sets deadline** automatically

### Due Date Commands

| What You Say | Date Set |
|-------------|----------|
| "Make this due tomorrow" | Tomorrow's date |
| "Set deadline to Friday" | This coming Friday |
| "Due by next Monday" | Next week Monday |
| "Change due date to in 3 days" | 3 days from now |
| "Deadline next week" | 7 days from now |
| "Make this due today" | Today |

### Supported Date Formats

**Relative Dates:**
- "tomorrow" - Next day
- "today" - Current day
- "yesterday" - Previous day

**Day Names:**
- "Monday", "Tuesday", "Wednesday", etc.
- "next Monday" - Next week's Monday
- "Friday" - This coming Friday

**Relative Periods:**
- "next week" - 7 days from now
- "in 3 days" - 3 days from now
- "in 2 weeks" - 14 days from now
- "2 weeks from now" - 14 days from now

**Specific Dates:**
- "January 15" - Specific date
- "Dec 25" - Short month format

### Smart Date Parsing

The system intelligently understands:
- **"Friday"** = This coming Friday (or next Friday if today is Friday)
- **"next Friday"** = Friday of next week
- **"in 3 days"** = Exactly 3 days from today
- **"next week"** = Same day next week

### Complete Workflow Example

```
You say: "Add action: Submit proposal"
System: ✓ Creates action

You say: "Make this due Friday"
System: ✓ Parses "Friday" as 2025-11-14
        ✓ Sets due date
        ✓ Notifies if assignee exists
        ✓ Confirms "Due date set to 2025-11-14"
```

### Notifications

- **Assignee Notifications**: If task has an assignee (other than you), they get notified of deadline
- **Automatic Updates**: Due date changes trigger timestamp updates
- **Audit Trail**: All changes are logged

### Permissions

- **Task Creator** can always set/change due date
- **Task Assignee** can change their own task due date
- **Meeting Host** can change any meeting task due date
- **Admins** can change any task due date

### Troubleshooting

**Problem**: "Could not understand the date"
- ✓ Try simpler phrases: "tomorrow", "Friday", "in 3 days"
- ✓ Use recognized date formats
- ✓ Speak clearly for accurate recognition

**Problem**: "No recent action"
- ✓ Create an action first
- ✓ Due date command must follow within 30 seconds
- ✓ Only works with tasks you just created

**Problem**: "You do not have permission..."
- ✓ Only creator, assignee, meeting host, or admin can change
- ✓ Must be your task or you must have proper permissions

### Combining Commands

Create powerful workflows by chaining commands:

```
"Add action: Review security audit priority high"
→ Creates high priority task

"Assign this to John"
→ Assigns to John

"Make this due Friday"
→ Sets deadline to Friday

"Remind me about this 1 day before deadline"
→ Sets reminder 24 hours before due date

Result: High priority task for John due Friday with automatic reminder, all done hands-free!
```

---

## ⏰ Voice Reminder Control (NEW!)

Set task reminders using natural language time expressions. Never miss an important deadline!

### How It Works

1. **Create an action first** (using voice dictation or UI)
2. **Optionally set a due date** if using deadline-relative reminders
3. **Say reminder command** with natural language time
4. **System sets reminder** and notifies you at the specified time

### Reminder Commands

| What You Say | Reminder Set |
|-------------|-------------|
| "Remind me about this tomorrow at 2pm" | Tomorrow at 2:00 PM |
| "Set reminder for 3 hours before deadline" | 3 hours before due date |
| "Reminder in 2 days" | 2 days from now |
| "Notify me at 9am tomorrow" | Tomorrow at 9:00 AM |
| "Alert me 1 day before due date" | 24 hours before deadline |
| "Remind me next Monday at 10am" | Next Monday at 10:00 AM |
| "Set reminder for today at 3pm" | Today at 3:00 PM |
| "Alert me in 4 hours" | 4 hours from now |

### Supported Time Formats

**Absolute Time (Specific Date/Time):**
- "tomorrow at 2pm" - Specific day and time
- "next Monday at 9am" - Future day of week with time
- "today at 3pm" - Same day at specific time
- "Friday at 10am" - This coming Friday

**Relative to Now:**
- "in 2 hours" - 2 hours from current time
- "in 3 days" - 3 days from now
- "in 30 minutes" - 30 minutes from now

**Relative to Deadline:**
- "3 hours before deadline" - Before due date
- "1 day before due date" - 24 hours before deadline
- "2 hours before due" - 2 hours before task due
- **Note:** Task must have a due date set first

### Smart Time Parsing

The system intelligently understands:
- **"tomorrow at 2pm"** = Next day at 14:00
- **"next Monday"** = Monday of next week (defaults to 9am)
- **"in 3 hours"** = Exactly 3 hours from now
- **"before deadline"** = Relative to task's due date

### Complete Workflow Example

```
You say: "Add action: Submit expense report"
System: ✓ Creates action

You say: "Make this due Friday"
System: ✓ Sets due date to Friday

You say: "Remind me 1 day before deadline"
System: ✓ Calculates reminder time (Thursday)
        ✓ Stores reminder in task metadata
        ✓ Creates notification entry
        ✓ Confirms "Reminder set for Thursday at [time]"
```

### Reminder Types

**Absolute Reminders:**
- Specific date and time
- Independent of task due date
- Example: "Remind me tomorrow at 2pm"

**Relative Reminders:**
- Based on task due date
- Requires due date to be set first
- Example: "3 hours before deadline"

### Notifications

- **In-App**: Notification appears in notification center
- **Email**: Optional email reminder (if enabled)
- **Browser**: Desktop notification at reminder time
- **Multiple Reminders**: Can set multiple reminders per task

### Permissions

- **Task Creator** can always set reminders
- **Task Assignee** can set reminders for their tasks
- **Meeting Participants** can set reminders for meeting tasks

### Troubleshooting

**Problem**: "Cannot set reminder relative to deadline - no due date set"
- ✓ Set a due date first
- ✓ Use absolute time instead ("tomorrow at 2pm")
- ✓ Deadline-relative reminders need an existing due date

**Problem**: "Could not parse reminder time"
- ✓ Use simpler phrases: "tomorrow at 2pm", "in 3 hours"
- ✓ Include time-related keywords (tomorrow, hours, days, etc.)
- ✓ Speak clearly for accurate recognition

**Problem**: "No recent action"
- ✓ Create an action first
- ✓ Reminder command must follow within 30 seconds
- ✓ Only works with tasks you just created

### Advanced Workflow Examples

**Morning Review:**
```
"Add action: Review daily standup notes"
"Make this due today"
"Remind me at 8am tomorrow"
```

**Project Deadline:**
```
"Add action: Submit project deliverables priority high"
"Make this due next Friday"
"Remind me 2 days before deadline"
"Also remind me 6 hours before deadline"
```

**Quick Follow-up:**
```
"Add action: Call client about proposal"
"Remind me in 2 hours"
```

---

### 📊 Meeting Functions

| Command (English) | Command (Amharic) | What It Does |
|------------------|-------------------|--------------|
| "Generate minutes" | "ደቂቃዎች ፍጠር" | Start AI minutes generation |
| "Create minutes" | "ማጠቃለያ ፍጠር" | Alternative generation command |
| "Make minutes" | "ሪፖርት ፍጠር" | Create meeting report |
| | | |
| "End meeting" | "ስብሰባ አብቃ" | Conclude meeting session |
| "Close meeting" | "ስብሰባ ዝጋ" | Alternative end command |
| "Finish meeting" | "ስብሰባ ጨርስ" | Complete meeting |

---

## 💡 Pro Tips

### Best Practices

✅ **Speak Naturally**
- No need for robot-like pronunciation
- Use conversational tone
- The system understands variations

✅ **Clear Environment**
- Works best in quiet rooms
- Minimize background noise
- Use quality microphone

✅ **Wait for Confirmation**
- Check visual feedback before next command
- Allow system to process
- Green highlight = command recognized

✅ **Mix Languages**
- Switch between Amharic and English freely
- Use whichever language is comfortable
- System adapts automatically

### Command Variations

The system understands many variations:
```
"Start recording" = "Begin recording" = "Record now"
"Add action" = "Create action" = "New action"
```

You don't need exact phrases - speak naturally!

### Troubleshooting

❌ **Command Not Recognized?**
- Check microphone permissions
- Speak slightly slower
- Try alternative phrasing
- Ensure voice commands are active (green badge)

❌ **No Audio Feedback?**
- Check speaker volume
- Verify 🔊 icon is not muted
- Browser may block autoplay

❌ **Keeps Stopping?**
- Browser may pause inactive tabs
- Keep tab active/visible
- Check browser console for errors

---

## 🔒 Privacy & Security

### Microphone Access
- Used only for voice recognition
- Not recorded or stored
- Local browser processing
- Can be revoked anytime

### Data Handling
- Commands processed locally in browser
- No voice data sent to servers
- Only text commands logged
- Follows browser security policies

---

## 🌐 Browser Support

### Fully Supported
- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge
- ✅ Opera

### Partial Support
- ⚠️ Safari (requires permissions)
- ⚠️ Firefox (limited features)

### Not Supported
- ❌ Internet Explorer
- ❌ Old browser versions

---

## 📱 Mobile Support

Voice commands work on mobile devices with some limitations:

### iOS (iPhone/iPad)
- Safari: Requires iOS 14.5+
- Must keep app in foreground
- May need to re-enable after switching apps

### Android
- Chrome: Full support
- Other browsers: Limited
- Background operation supported

---

## 🎯 Use Cases

### During Presentations
```
"Start recording" → Present freely
"Add action" → Note tasks while talking
"Generate minutes" → Quick summary
```

### Note-Taking
```
"Add decision" → Log important choices
"Record decision" → Capture outcomes
"Create action" → Track follow-ups
```

### Multi-tasking
```
"Pause recording" → Take a break
"Resume recording" → Continue
"Stop recording" → Finish session
```

---

## 🔧 Advanced Features

### Audio Feedback Control

Toggle between modes:
1. **Full Feedback**: Voice + visual confirmation
2. **Visual Only**: Silent but shows commands
3. **Off**: Disable voice commands

### Command History

Recent commands display:
- Shows last executed command
- Auto-clears after 3 seconds
- Green highlight = successful
- Red highlight = failed (if implemented)

### Keyboard Shortcuts

Combine with keyboard for power users:
- Voice commands for actions
- Keyboard for data entry
- Best of both worlds

---

## 📊 Command Categories

### By Frequency
**Most Used:**
1. "Start recording"
2. "Stop recording"
3. "Add action"
4. "Generate minutes"

**Less Common:**
5. "Pause recording"
6. "Add decision"
7. "End meeting"

### By Use Case

**Meeting Setup:**
- Start recording
- Begin transcription

**During Meeting:**
- Add action
- Add decision
- Pause/Resume

**Meeting Wrap-up:**
- Stop recording
- Generate minutes
- End meeting

---

## 🌟 Coming Soon

Future voice command features:
- [ ] Navigate between tabs
- [ ] Search transcripts
- [ ] Edit action items
- [ ] Set meeting agenda
- [ ] Invite participants
- [ ] Share screen
- [ ] Mute/unmute participants

---

## 🆘 Need Help?

### Common Issues

**Q: Command recognized but nothing happens?**
A: Check user permissions for the action (e.g., only hosts can end meetings)

**Q: Different language detected?**
A: System auto-detects language - no manual switching needed

**Q: Want to add custom commands?**
A: Contact support for organization-specific commands

### Support

- 📧 Email: support@example.com
- 💬 Chat: In-app support
- 📖 Docs: See `HOW_AI_WORKS.md`

---

## 📖 Related Documentation

- [AI Architecture](./AI_ARCHITECTURE.md) - How AI powers the system
- [How AI Works](./HOW_AI_WORKS.md) - Simple AI guide
- [System Integrations](./SYSTEM_INTEGRATIONS.md) - Technical details

---

Built with ❤️ for Ethiopian Telecom

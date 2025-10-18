# Google OAuth Setup Guide

## Issue: 403 Error When Connecting Google Meet

The 403 error occurs when the Google OAuth credentials are incorrectly configured. Here's how to fix it:

## Problem Identified

Your current setup is using the **Client SECRET** (GOCSPX-xxx) as the **Client ID**, which causes Google to reject the authentication request.

### Correct Format:
- **Client ID**: Should look like `123456789-abcdefghijk.apps.googleusercontent.com`
- **Client Secret**: Should look like `GOCSPX-xxxxxxxxxxxxxxxx`

## How to Get Correct Google OAuth Credentials

### Step 1: Go to Google Cloud Console
1. Visit https://console.cloud.google.com/
2. Create a new project or select an existing one

### Step 2: Enable Required APIs
1. Go to "APIs & Services" > "Library"
2. Search and enable:
   - Google Calendar API
   - Google Meet API

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (your email addresses)

### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: Meeting System
   - **Authorized JavaScript origins**: 
     - `https://31e1cbff-61c6-4001-80e3-bdf2d52b0e94.lovableproject.com`
   - **Authorized redirect URIs**:
     - `https://31e1cbff-61c6-4001-80e3-bdf2d52b0e94.lovableproject.com/google-oauth-callback`
5. Click "Create"

### Step 5: Copy Your Credentials
You'll receive:
- **Client ID**: Ends with `.apps.googleusercontent.com` ✅
- **Client Secret**: Starts with `GOCSPX-` ✅

## How to Configure in Your App

### Option 1: Via Settings UI (Recommended)
1. Go to Settings > Google API Settings
2. Paste your **Client ID** (the one ending in `.apps.googleusercontent.com`)
3. Paste your **Client Secret** (the one starting with `GOCSPX-`)
4. Save settings

### Option 2: Via Backend (Advanced)
Add the credentials to your system_settings table:
```sql
INSERT INTO system_settings (key, value)
VALUES (
  'google_oauth_credentials',
  '{"clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com", "clientSecret": "GOCSPX-YOUR_SECRET"}'
);
```

## Testing
1. Try creating a new instant meeting
2. Select "Google Meet" as the video provider
3. You should be redirected to Google's OAuth consent screen
4. Grant permissions
5. You'll be redirected back with a working Google Meet link

## Common Issues

### Still Getting 403?
- Make sure the redirect URI is exactly: `https://31e1cbff-61c6-4001-80e3-bdf2d52b0e94.lovableproject.com/google-oauth-callback`
- Verify your Client ID ends with `.apps.googleusercontent.com`
- Check that the OAuth consent screen is configured
- Ensure you're added as a test user

### No Meet Link Created?
- Verify Google Calendar API is enabled
- Check that the scope includes calendar access
- Ensure the OAuth token has proper permissions

## Alternative: Use Jitsi Meet (No Setup Required)
If you don't need Google Meet integration, the system automatically falls back to Jitsi Meet which requires no configuration and works immediately.

/**
 * Generate a Google Meet link
 * Note: This creates a simple meeting code format. For production,
 * you'd use Google Calendar API to create actual Meet links.
 */
export const generateGoogleMeetLink = (meetingId: string): string => {
  // Generate a random 3-letter code for the meet link
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randomCode = Array.from({ length: 3 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  
  // Create a simple hash from the meeting ID
  const hash = meetingId.slice(0, 10).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return `https://meet.google.com/${randomCode}-${hash.toString(36).slice(0, 4)}-${randomCode}`;
};

/**
 * Generate a Jitsi Meet room link
 */
export const generateJitsiMeetLink = (meetingTitle: string, meetingId: string): string => {
  // Create URL-friendly room name from title and ID
  const roomName = `${meetingTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${meetingId.slice(0, 8)}`;
  return `https://meet.jit.si/${roomName}`;
};

/**
 * Generate a TMeet room link
 */
export const generateTMeetLink = (meetingTitle: string, meetingId: string): string => {
  // Create URL-friendly room name from title and ID
  const roomName = `${meetingTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${meetingId.slice(0, 8)}`;
  return `https://tmeet.gubatech.com/${roomName}`;
};

/**
 * Get the appropriate video conference link based on provider
 */
export const getVideoConferenceLink = (
  provider: string,
  url: string | null,
  meetingTitle: string,
  meetingId: string
): string => {
  // If URL is provided, use it
  if (url) return url;

  // Otherwise, generate based on provider
  switch (provider) {
    case 'google_meet':
      return generateGoogleMeetLink(meetingId);
    case 'jitsi_meet':
      return generateJitsiMeetLink(meetingTitle, meetingId);
    case 'tmeet':
      return generateTMeetLink(meetingTitle, meetingId);
    default:
      return '';
  }
};

/**
 * Get display name for video provider
 */
export const getProviderDisplayName = (provider: string): string => {
  const names: Record<string, string> = {
    google_meet: 'Google Meet',
    jitsi_meet: 'Jitsi Meet',
    tmeet: 'TMeet',
    zoom: 'Zoom',
    teams: 'Microsoft Teams',
    other: 'Other'
  };
  return names[provider] || provider;
};

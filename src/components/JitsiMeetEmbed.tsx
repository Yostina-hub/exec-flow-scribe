import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName?: string;
  onMeetingEnd?: () => void;
  width?: string;
  height?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function JitsiMeetEmbed({
  roomName,
  displayName = 'Guest',
  onMeetingEnd,
  width = '100%',
  height = '600px',
}: JitsiMeetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    // Load Jitsi Meet External API
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = initializeJitsi;
    document.body.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      document.body.removeChild(script);
    };
  }, []);

  const initializeJitsi = () => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName,
      width,
      height,
      parentNode: containerRef.current,
      userInfo: {
        displayName,
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'profile',
          'chat',
          'recording',
          'livestreaming',
          'etherpad',
          'sharedvideo',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'feedback',
          'stats',
          'shortcuts',
          'tileview',
          'download',
          'help',
          'mute-everyone',
        ],
      },
    };

    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    apiRef.current.addEventListener('videoConferenceLeft', () => {
      onMeetingEnd?.();
    });

    apiRef.current.addEventListener('readyToClose', () => {
      onMeetingEnd?.();
    });
  };

  return (
    <Card className="overflow-hidden">
      <div ref={containerRef} style={{ width, height }} />
    </Card>
  );
}

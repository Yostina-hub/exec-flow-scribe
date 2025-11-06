import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MeetingData {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  location: string;
  created_by: string;
  [key: string]: any;
}

export const useRealtimeMeetingData = (meetingId: string) => {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;

    // Fetch initial data
    const fetchMeeting = async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (data && !error) {
        setMeeting(data);
      }
      setLoading(false);
    };

    fetchMeeting();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setMeeting(payload.new as MeetingData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return { meeting, loading };
};

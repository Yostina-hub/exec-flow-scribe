import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Transcription {
  id: string;
  meeting_id: string;
  content: string;
  speaker_name: string;
  speaker_id: string;
  timestamp: string;
  confidence_score: number;
  detected_language: string;
  created_at: string;
  [key: string]: any;
}

export const useRealtimeTranscriptions = (meetingId: string) => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;

    // Fetch initial data
    const fetchTranscriptions = async () => {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (data && !error) {
        setTranscriptions(data);
      }
      setLoading(false);
    };

    fetchTranscriptions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`transcriptions-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcriptions',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          setTranscriptions((prev) => [...prev, payload.new as Transcription]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return { transcriptions, loading };
};

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
      console.log('[useRealtimeTranscriptions] Fetching transcriptions for meeting:', meetingId);
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        console.log('[useRealtimeTranscriptions] Fetched', data.length, 'transcriptions');
        setTranscriptions(data);
      } else if (error) {
        console.error('[useRealtimeTranscriptions] Error fetching:', error);
      }
      setLoading(false);
    };

    fetchTranscriptions();

    // Subscribe to realtime changes
    console.log('[useRealtimeTranscriptions] Subscribing to realtime for meeting:', meetingId);
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
          console.log('[useRealtimeTranscriptions] NEW transcription received:', payload.new);
          setTranscriptions((prev) => [...prev, payload.new as Transcription]);
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeTranscriptions] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return { transcriptions, loading };
};

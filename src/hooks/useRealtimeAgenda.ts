import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  order_index: number;
  status: string;
  presenter_id: string;
  [key: string]: any;
}

export const useRealtimeAgenda = (meetingId: string) => {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;

    // Fetch initial data
    const fetchAgenda = async () => {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('order_index', { ascending: true });

      if (data && !error) {
        setAgenda(data);
      }
      setLoading(false);
    };

    fetchAgenda();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`agenda-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_items',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgenda((prev) => [...prev, payload.new as AgendaItem].sort((a, b) => a.order_index - b.order_index));
          } else if (payload.eventType === 'UPDATE') {
            setAgenda((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as AgendaItem) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setAgenda((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return { agenda, loading };
};

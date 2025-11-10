import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { playSuccessSound, playErrorSound } from '@/utils/soundEffects';

interface GenerationStatus {
  meetingId: string;
  meetingTitle: string;
  status: string;
  progress: number;
  currentStep: string | null;
  estimatedSeconds: number | null;
}

interface MinuteGenerationContextType {
  activeGenerations: GenerationStatus[];
  startGeneration: (meetingId: string, meetingTitle: string) => void;
  isGenerating: (meetingId: string) => boolean;
}

const MinuteGenerationContext = createContext<MinuteGenerationContextType | undefined>(undefined);

export const MinuteGenerationProvider = ({ children }: { children: ReactNode }) => {
  const [activeGenerations, setActiveGenerations] = useState<GenerationStatus[]>([]);
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Subscribe to all generation progress updates
  useEffect(() => {
    const channel = supabase
      .channel('all-minute-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minute_generation_progress'
        },
        async (payload) => {
          console.log('Background progress update:', payload);
          const data = payload.new as any;

          // Fetch meeting title if we don't have it
          let meetingTitle = 'Meeting';
          const { data: meeting } = await supabase
            .from('meetings')
            .select('title')
            .eq('id', data.meeting_id)
            .single();
          
          if (meeting) {
            meetingTitle = meeting.title;
          }

          setActiveGenerations(prev => {
            const existing = prev.find(g => g.meetingId === data.meeting_id);
            const updated: GenerationStatus = {
              meetingId: data.meeting_id,
              meetingTitle,
              status: data.status,
              progress: data.progress_percentage,
              currentStep: data.current_step,
              estimatedSeconds: data.estimated_completion_seconds
            };

            // Handle completion
            if (data.status === 'completed') {
              playSuccessSound();
              
              // Show browser notification
              if (notificationPermission === 'granted') {
                new Notification('✨ Minutes Ready!', {
                  body: `Meeting minutes for "${meetingTitle}" have been generated successfully.`,
                  icon: '/favicon.png',
                  tag: `minute-gen-${data.meeting_id}`
                });
              }

              // Show toast
              toast({
                title: '✨ Minutes Ready',
                description: `Minutes for "${meetingTitle}" have been generated`,
              });

              // Remove from active after delay
              setTimeout(() => {
                setActiveGenerations(p => p.filter(g => g.meetingId !== data.meeting_id));
              }, 3000);

              return prev.map(g => g.meetingId === data.meeting_id ? updated : g);
            }

            // Handle failure
            if (data.status === 'failed') {
              playErrorSound();
              
              // Show browser notification
              if (notificationPermission === 'granted') {
                new Notification('❌ Generation Failed', {
                  body: `Failed to generate minutes for "${meetingTitle}". ${data.error_message || ''}`,
                  icon: '/favicon.png',
                  tag: `minute-gen-${data.meeting_id}`
                });
              }

              // Show toast
              toast({
                title: 'Generation Failed',
                description: data.error_message || 'Failed to generate minutes',
                variant: 'destructive',
              });

              // Remove from active after delay
              setTimeout(() => {
                setActiveGenerations(p => p.filter(g => g.meetingId !== data.meeting_id));
              }, 5000);

              return prev.map(g => g.meetingId === data.meeting_id ? updated : g);
            }

            // Update or add
            if (existing) {
              return prev.map(g => g.meetingId === data.meeting_id ? updated : g);
            }
            return [...prev, updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, notificationPermission]);

  const startGeneration = (meetingId: string, meetingTitle: string) => {
    setActiveGenerations(prev => {
      const existing = prev.find(g => g.meetingId === meetingId);
      if (existing) return prev;
      
      return [...prev, {
        meetingId,
        meetingTitle,
        status: 'initializing',
        progress: 0,
        currentStep: 'Starting generation...',
        estimatedSeconds: 60
      }];
    });
  };

  const isGenerating = (meetingId: string) => {
    return activeGenerations.some(
      g => g.meetingId === meetingId && 
      !['completed', 'failed'].includes(g.status)
    );
  };

  return (
    <MinuteGenerationContext.Provider value={{ activeGenerations, startGeneration, isGenerating }}>
      {children}
    </MinuteGenerationContext.Provider>
  );
};

export const useMinuteGeneration = () => {
  const context = useContext(MinuteGenerationContext);
  if (!context) {
    throw new Error('useMinuteGeneration must be used within MinuteGenerationProvider');
  }
  return context;
};

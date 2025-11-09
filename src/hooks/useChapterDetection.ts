import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Transcription {
  id: string;
  content: string;
  timestamp: string;
  created_at: string;
}

export const useChapterDetection = (meetingId: string, transcriptions: Transcription[], isRecording: boolean) => {
  const lastProcessedIndex = useRef(0);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!meetingId || !isRecording || transcriptions.length === 0) return;

    // Process new transcriptions in batches
    const newTranscriptions = transcriptions.slice(lastProcessedIndex.current);
    
    if (newTranscriptions.length >= 5 && !processingRef.current) {
      processingRef.current = true;
      
      const detectChapters = async () => {
        try {
          console.log('[useChapterDetection] Analyzing', newTranscriptions.length, 'new transcriptions');
          
          const { data, error } = await supabase.functions.invoke('detect-meeting-chapters', {
            body: {
              meetingId,
              recentTranscriptions: newTranscriptions
            }
          });

          if (error) {
            console.error('[useChapterDetection] Error:', error);
          } else if (data?.chapter) {
            console.log('[useChapterDetection] New chapter detected:', data.chapter.title);
          }

          lastProcessedIndex.current = transcriptions.length;
        } catch (error) {
          console.error('[useChapterDetection] Exception:', error);
        } finally {
          processingRef.current = false;
        }
      };

      detectChapters();
    }
  }, [meetingId, transcriptions, isRecording]);
};

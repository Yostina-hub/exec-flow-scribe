import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export const useInterimTranscript = (isRecording: boolean) => {
  const [language, setLang] = useState<string>('am-ET');
  const { transcript, startListening, stopListening, setLanguage } = useSpeechRecognition();

  // Load preferred language from backend (default to Amharic)
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('transcription_preferences')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();
        const pref = (data?.language as string) || 'am-ET';
        setLang(pref);
        setLanguage(pref);
      } catch {}
    };
    load();
  }, [setLanguage]);

  // Start/stop listening based on recording state
  useEffect(() => {
    if (isRecording) {
      startListening(language);
    } else {
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, language]);

  return { interim: transcript, language };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Language = 'am' | 'ti' | 'en' | 'or' | 'so';

export const useLanguagePreference = () => {
  const [preferredLanguage, setPreferredLanguage] = useState<Language>('am');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreference();
  }, []);

  const loadPreference = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading language preference:', error);
        setIsLoading(false);
        return;
      }

      if (data?.preferred_language) {
        setPreferredLanguage(data.preferred_language as Language);
      }
    } catch (error) {
      console.error('Error in loadPreference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { preferredLanguage, isLoading, refreshPreference: loadPreference };
};

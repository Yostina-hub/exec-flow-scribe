import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Languages } from 'lucide-react';

interface LanguageSelectorProps {
  onLanguageChange?: (language: string) => void;
  className?: string;
}

export const LanguageSelector = ({ onLanguageChange, className }: LanguageSelectorProps) => {
  const [language, setLanguage] = useState<string>('am-ET');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('transcription_preferences')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.language) {
        setLanguage(data.language);
      } else {
        // Default to Amharic if no preference set
        setLanguage('am-ET');
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update or insert language preference
      const { data: existing } = await supabase
        .from('transcription_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('transcription_preferences')
          .update({ language: newLanguage })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('transcription_preferences')
          .insert({ 
            user_id: user.id, 
            language: newLanguage,
            provider: 'browser' // Default provider
          });
      }

      toast({
        title: 'Language updated',
        description: `Transcription language set to ${getLanguageName(newLanguage)}`,
      });

      onLanguageChange?.(newLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to save language preference',
        variant: 'destructive',
      });
    }
  };

  const getLanguageName = (code: string): string => {
    const names: Record<string, string> = {
      'am-ET': 'Amharic (አማርኛ)',
      'am': 'Amharic (አማርኛ)',
      'en-US': 'English (US)',
      'en': 'English',
      'auto': 'Auto-detect',
    };
    return names[code] || code;
  };

  if (loading) {
    return null;
  }

  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
        <Languages className="h-3.5 w-3.5" />
        Transcription Language
      </Label>
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="am-ET">Amharic (አማርኛ)</SelectItem>
          <SelectItem value="am">Amharic (አማርኛ) - Legacy</SelectItem>
          <SelectItem value="en-US">English (US)</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="auto">Auto-detect</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

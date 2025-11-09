import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Languages, Loader2 } from 'lucide-react';

type Language = 'am' | 'ti' | 'en' | 'or' | 'so';

const LANGUAGES = [
  { value: 'am', label: 'አማርኛ (Amharic)', flag: '🇪🇹' },
  { value: 'ti', label: 'ትግርኛ (Tigrinya)', flag: '🇪🇹' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'or', label: 'Afaan Oromo', flag: '🇪🇹' },
  { value: 'so', label: 'Af-Soomaali (Somali)', flag: '🇸🇴' },
];

export const LanguagePreference = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('am');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPreference();
  }, []);

  const loadPreference = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.preferred_language) {
        setSelectedLanguage(data.preferred_language as Language);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: selectedLanguage })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Language Preference Saved',
        description: `Your default language has been set to ${LANGUAGES.find(l => l.value === selectedLanguage)?.label}`,
      });
    } catch (error: any) {
      console.error('Error saving language preference:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save language preference',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Language Preference
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Language Preference
        </CardTitle>
        <CardDescription>
          Set your default language for meeting minutes, translations, and generated content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language-select">Default Language</Label>
          <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preference'
            )}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
          <p className="font-medium">Supported Languages:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>አማርኛ (Amharic)</strong> - Ge'ez script</li>
            <li><strong>ትግርኛ (Tigrinya)</strong> - Ge'ez script</li>
            <li><strong>English</strong> - Latin script</li>
            <li><strong>Afaan Oromo</strong> - Latin script (Qubee)</li>
            <li><strong>Af-Soomaali (Somali)</strong> - Latin script</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

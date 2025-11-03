import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AudioPlayer } from '@/components/minutes/AudioPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Headphones, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MeetingAudioPlaybackProps {
  meetingId: string;
  onTimeUpdate?: (time: number) => void;
}

interface AudioRecording {
  name: string;
  url: string;
  created_at: string;
  size: number;
}

export const MeetingAudioPlayback = ({ meetingId, onTimeUpdate }: MeetingAudioPlaybackProps) => {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<AudioRecording | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecordings();
  }, [meetingId]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      
      // Fetch recordings from database instead of storage listing
      const { data, error } = await supabase
        .from('meeting_media')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('media_type', 'audio')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Get public URLs for all recordings
        const recordingsWithUrls = data.map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('meeting-audio')
            .getPublicUrl(file.file_url);

          return {
            name: `Recording ${new Date(file.uploaded_at).toLocaleString()}`,
            url: publicUrl,
            created_at: file.uploaded_at,
            size: file.file_size || 0
          };
        });

        setRecordings(recordingsWithUrls);
        
        // Auto-select the first (most recent) recording
        if (recordingsWithUrls.length > 0) {
          setSelectedRecording(recordingsWithUrls[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching recordings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audio recordings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Audio Recordings
          </CardTitle>
          <CardDescription>
            Playback recorded audio from this meeting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Headphones className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">No audio recordings available</p>
            <p className="text-xs text-muted-foreground mt-2">
              Record audio during the meeting to see playback options here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          Audio Recordings ({recordings.length})
        </CardTitle>
        <CardDescription>
          Play back and review meeting recordings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Selection */}
        {recordings.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Select Recording:</p>
            <div className="grid gap-2">
              {recordings.map((recording, index) => (
                <button
                  key={`${recording.created_at}-${index}`}
                  onClick={() => setSelectedRecording(recording)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedRecording?.name === recording.name
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Recording #{recordings.length - index}
                        </span>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">Latest</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(recording.created_at)} • {formatFileSize(recording.size)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio Player */}
        {selectedRecording && (
          <div className="space-y-2">
            {recordings.length === 1 && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Recorded {formatDateTime(selectedRecording.created_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedRecording.size)}
                </p>
              </div>
            )}
            <AudioPlayer 
              audioUrl={selectedRecording.url}
              onTimeUpdate={onTimeUpdate}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

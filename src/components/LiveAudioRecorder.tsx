import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Square, Pause, Play, Trash2, Upload } from 'lucide-react';

interface LiveAudioRecorderProps {
  meetingId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export function LiveAudioRecorder({ meetingId, onUploadComplete, disabled = false }: LiveAudioRecorderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  
  const {
    isRecording,
    isPaused,
    audioBlob,
    audioDuration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
  } = useAudioRecording();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${meetingId}-${Date.now()}.webm`;
      const filePath = `${meetingId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-audio')
        .getPublicUrl(filePath);

      const checksum = await generateChecksum(audioBlob);

      const { error: insertError } = await supabase
        .from('meeting_media')
        .insert({
          meeting_id: meetingId,
          uploaded_by: user.id,
          file_url: publicUrl,
          media_type: 'audio',
          format: 'webm',
          file_size: audioBlob.size,
          duration_seconds: audioDuration,
          checksum,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'Recording uploaded successfully',
      });

      clearRecording();
      onUploadComplete?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to upload recording',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const generateChecksum = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            isRecording && !isPaused ? 'bg-destructive animate-pulse' : 'bg-primary/10'
          }`}>
            <Mic className={`h-5 w-5 ${isRecording && !isPaused ? 'text-white' : 'text-primary'}`} />
          </div>
          <div>
            {isRecording && (
              <>
                <p className="font-medium">
                  {isPaused ? 'Paused' : 'Recording...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(audioDuration)}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!isRecording && !audioBlob && (
            <Button onClick={startRecording} disabled={disabled}>
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <>
              {!isPaused ? (
                <Button variant="outline" onClick={pauseRecording}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button variant="outline" onClick={resumeRecording}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}

          {audioBlob && !isRecording && (
            <>
              <Button variant="outline" onClick={clearRecording}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      </div>

      {disabled && !isRecording && !audioBlob && (
        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
          Recording is disabled - meeting has been signed off or completed
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {audioBlob && (
        <div className="pt-4 border-t">
          <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
        </div>
      )}
    </div>
  );
}

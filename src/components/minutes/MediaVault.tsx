import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Film, Music, Image as ImageIcon, Download, Lock, Upload } from 'lucide-react';

interface MediaVaultProps {
  meetingId: string;
}

interface MediaMetadata {
  waveform?: number[];
  thumbnails?: string[];
}

interface MediaFile {
  id: string;
  media_type: string;
  file_url: string;
  file_size: number;
  duration_seconds: number;
  format: string;
  checksum: string;
  uploaded_at: string;
  metadata: MediaMetadata | any;
}

export function MediaVault({ meetingId }: MediaVaultProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMediaFiles();
  }, [meetingId]);

  const fetchMediaFiles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meeting_media')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setMediaFiles((data || []) as MediaFile[]);
    } catch (error) {
      console.error('Error fetching media files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media files',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'screen_recording':
        return <ImageIcon className="w-5 h-5" />;
      default:
        return <Film className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading media vault...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Immutable Media Vault</h3>
          </div>
          <Button size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          All original recordings with full audit trail
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {mediaFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No media files uploaded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {mediaFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getMediaIcon(file.media_type)}
                      <div>
                        <div className="font-medium text-sm">
                          {file.media_type.charAt(0).toUpperCase() + file.media_type.slice(1)} Recording
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {file.format} • {formatFileSize(file.file_size)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{' '}
                      {formatDuration(file.duration_seconds)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Uploaded:</span>{' '}
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-xs bg-muted p-2 rounded font-mono">
                    <span className="text-muted-foreground">Checksum:</span> {file.checksum}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground">
          <Lock className="w-3 h-3 inline mr-1" />
          All media files are cryptographically signed and cannot be modified or deleted.
        </div>
      </div>
    </div>
  );
}

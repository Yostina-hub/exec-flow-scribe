import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Presentation,
  Play,
  Trash2,
  Eye,
  Sparkles
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MediaResourceManagerProps {
  meetingId: string;
}

export function MediaResourceManager({ meetingId }: MediaResourceManagerProps) {
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'presentation',
    url: '',
    description: ''
  });

  useEffect(() => {
    fetchResources();
    setupRealtimeSubscription();
  }, [meetingId]);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('meeting_resources')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });
    
    setResources(data || []);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`resources-${meetingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_resources',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        fetchResources();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${meetingId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('meeting-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-media')
        .getPublicUrl(fileName);

      await supabase
        .from('meeting_resources')
        .insert({
          meeting_id: meetingId,
          title: newResource.title || file.name,
          type: newResource.type,
          url: publicUrl,
          description: newResource.description,
          file_size: file.size,
          file_type: file.type
        });

      setNewResource({ title: '', type: 'presentation', url: '', description: '' });
      toast({
        title: "Media Uploaded",
        description: "Resource is now available in the meeting room",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddURL = async () => {
    if (!newResource.url || !newResource.title) return;

    await supabase
      .from('meeting_resources')
      .insert({
        meeting_id: meetingId,
        title: newResource.title,
        type: newResource.type,
        url: newResource.url,
        description: newResource.description
      });

    setNewResource({ title: '', type: 'presentation', url: '', description: '' });
    toast({
      title: "Resource Added",
    });
  };

  const handlePresentResource = async (resourceId: string) => {
    await supabase
      .from('meeting_resources')
      .update({ is_presenting: true })
      .eq('id', resourceId);

    // Clear other presenting resources
    await supabase
      .from('meeting_resources')
      .update({ is_presenting: false })
      .eq('meeting_id', meetingId)
      .neq('id', resourceId);

    toast({
      title: "Now Presenting",
      description: "Resource is displayed in the virtual room",
    });
  };

  const handleDeleteResource = async (resourceId: string) => {
    await supabase
      .from('meeting_resources')
      .delete()
      .eq('id', resourceId);

    toast({
      title: "Resource Deleted",
    });
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'presentation': return <Presentation className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'image': return <ImageIcon className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Media & Resources
        </CardTitle>
        <CardDescription>Upload and present content in the virtual room</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label>Resource Title</Label>
            <Input
              placeholder="e.g., Q4 Results Presentation"
              value={newResource.title}
              onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Resource Type</Label>
            <Select
              value={newResource.type}
              onValueChange={(value) => setNewResource({ ...newResource, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Input
              placeholder="Brief description..."
              value={newResource.description}
              onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="file-upload">Upload File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label>Or Add URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={newResource.url}
                  onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                />
                <Button onClick={handleAddURL} disabled={!newResource.url || !newResource.title}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Resources List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className={`p-4 border rounded-lg transition-all ${
                  resource.is_presenting
                    ? 'bg-primary/10 border-primary shadow-lg'
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {getResourceIcon(resource.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{resource.title}</p>
                      {resource.is_presenting && (
                        <Badge variant="default" className="animate-pulse">
                          <Play className="h-3 w-3 mr-1" />
                          Presenting
                        </Badge>
                      )}
                    </div>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{resource.type}</Badge>
                      {resource.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {!resource.is_presenting && (
                      <Button
                        size="icon"
                        variant="default"
                        onClick={() => handlePresentResource(resource.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteResource(resource.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {resources.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No resources yet. Upload or add a URL to get started.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

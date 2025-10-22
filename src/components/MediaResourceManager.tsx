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
  Sparkles,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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
        {/* Uploaded Resources - Preview Section */}
        {resources.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Uploaded Resources ({resources.length})
                </h3>
                <p className="text-xs text-muted-foreground">Ready to present in virtual room</p>
              </div>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-lg p-4 bg-background">
              <div className="grid grid-cols-2 gap-4">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                      resource.is_presenting
                        ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    {/* Resource Preview/Thumbnail */}
                    <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative overflow-hidden">
                      {resource.type === 'image' && resource.url ? (
                        <img 
                          src={resource.url} 
                          alt={resource.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-4 rounded-full bg-primary/10">
                            {getResourceIcon(resource.type)}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Presenting Overlay */}
                      {resource.is_presenting && (
                        <div className="absolute inset-0 bg-primary/90 flex items-center justify-center">
                          <div className="text-center text-white">
                            <Play className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                            <p className="text-sm font-semibold">Now Presenting</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Hover Actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => window.open(resource.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDeleteResource(resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Resource Info */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{resource.title}</p>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>
                          )}
                        </div>
                        {resource.is_presenting && (
                          <Badge variant="default" className="shrink-0 text-xs animate-pulse">
                            <Play className="h-2 w-2 mr-1" />
                            Live
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {resource.file_size && (
                            <span className="text-xs text-muted-foreground">
                              {(resource.file_size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                        
                        {!resource.is_presenting ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handlePresentResource(resource.id)}
                          >
                            <Send className="h-3 w-3" />
                            Present
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => handlePresentResource(resource.id)}
                          >
                            <Clock className="h-3 w-3" />
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Separator />
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Add New Resource</h3>
          </div>
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

        {/* Empty State - Only show when no resources */}
        {resources.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No resources yet. Upload or add a URL to get started.</p>
            <p className="text-xs text-muted-foreground mt-1">Files will appear above before presenting</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

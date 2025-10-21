import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, GitBranch, Clock, Check, Upload, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DocumentVersionControlProps {
  meetingId: string;
}

export const DocumentVersionControl = ({ meetingId }: DocumentVersionControlProps) => {
  const [selectedType, setSelectedType] = useState<string>("minutes");
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [content, setContent] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const { data: versions, refetch } = useQuery({
    queryKey: ['document-versions', meetingId, selectedType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*, profiles(full_name)')
        .eq('meeting_id', meetingId)
        .eq('document_type', selectedType)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createNewVersion = async () => {
    setCreating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const latestVersion = versions?.[0]?.version_number || 0;

      const { error } = await supabase
        .from('document_versions')
        .insert({
          meeting_id: meetingId,
          document_type: selectedType,
          version_number: latestVersion + 1,
          content,
          content_format: 'markdown',
          created_by: user.user?.id,
          change_summary: changeSummary
        });

      if (error) throw error;

      toast({
        title: "Version created",
        description: `Version ${latestVersion + 1} has been created`
      });

      setNewVersionOpen(false);
      setContent("");
      setChangeSummary("");
      refetch();
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: "Failed to create version",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const publishVersion = async (versionId: string) => {
    const { error } = await supabase
      .from('document_versions')
      .update({ 
        is_published: true, 
        published_at: new Date().toISOString() 
      })
      .eq('id', versionId);

    if (error) {
      toast({
        title: "Failed to publish",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Version published",
        description: "This version is now published"
      });
      refetch();
    }
  };

  const documentTypes = [
    { value: 'minutes', label: 'Minutes' },
    { value: 'agenda', label: 'Agenda' },
    { value: 'transcript', label: 'Transcript' },
    { value: 'summary', label: 'Summary' },
    { value: 'report', label: 'Report' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          Document Version Control
        </CardTitle>
        <CardDescription>
          Track changes and manage document versions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={newVersionOpen} onOpenChange={setNewVersionOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Version</DialogTitle>
                <DialogDescription>
                  Create a new version of the {selectedType} document
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter document content..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Change Summary</Label>
                  <Textarea
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={3}
                  />
                </div>
                <Button onClick={createNewVersion} disabled={creating || !content}>
                  {creating ? "Creating..." : "Create Version"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {versions && versions.length > 0 ? (
            versions.map((version) => (
              <div key={version.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Version {version.version_number}</p>
                      <p className="text-xs text-muted-foreground">
                        by {version.profiles?.full_name} • {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {version.is_published && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Published
                      </Badge>
                    )}
                    {!version.is_published && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => publishVersion(version.id)}
                      >
                        Publish
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {version.change_summary && (
                  <p className="text-sm text-muted-foreground">
                    {version.change_summary}
                  </p>
                )}
                {version.file_size_bytes && (
                  <p className="text-xs text-muted-foreground">
                    Size: {(version.file_size_bytes / 1024).toFixed(2)} KB
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No versions yet</p>
              <p className="text-xs mt-1">Create your first version to start tracking changes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
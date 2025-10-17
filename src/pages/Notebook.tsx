import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  MessageSquare,
  X,
  Loader2,
  Sparkles,
  File,
  Link as LinkIcon,
  Music,
  Globe,
  Youtube,
  ClipboardPaste,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MeetingChatPanel from "@/components/MeetingChatPanel";
import MeetingStudioPanel from "@/components/MeetingStudioPanel";
import { AddSourceDialog } from "@/components/AddSourceDialog";

interface NotebookSource {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
}

const Notebook = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const meetingIdFromUrl = searchParams.get("meeting");
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    // Auto-add meeting if URL parameter is present
    if (meetingIdFromUrl) {
      addMeetingAsSource(meetingIdFromUrl);
    }
  }, [meetingIdFromUrl]);

  const loadSources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notebook_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSources(data || []);
      if (data && data.length > 0 && !selectedSource) {
        setSelectedSource(data[0].id);
      }
    } catch (error) {
      console.error("Error loading sources:", error);
      toast({
        title: "Error",
        description: "Failed to load sources",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMeetingAsSource = async (meetingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: meeting } = await supabase
        .from("meetings")
        .select("id, title")
        .eq("id", meetingId)
        .single();

      if (!meeting) return;

      const { error } = await supabase
        .from("notebook_sources")
        .insert({
          user_id: user.id,
          source_type: "meeting",
          title: meeting.title,
          metadata: { meeting_id: meetingId },
        });

      if (error) throw error;

      toast({
        title: "Meeting added",
        description: "Meeting has been added to your notebook",
      });

      loadSources();
    } catch (error) {
      console.error("Error adding meeting:", error);
    }
  };

  const removeSource = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notebook_sources")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSources(sources.filter((s) => s.id !== id));
      if (selectedSource === id) {
        setSelectedSource(sources[0]?.id || null);
      }

      toast({
        title: "Source removed",
        description: "Source has been removed from your notebook",
      });
    } catch (error) {
      console.error("Error removing source:", error);
      toast({
        title: "Error",
        description: "Failed to remove source",
        variant: "destructive",
      });
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "pdf":
        return <File className="h-3 w-3 text-red-500" />;
      case "text":
      case "markdown":
        return <FileText className="h-3 w-3 text-blue-500" />;
      case "audio":
        return <Music className="h-3 w-3 text-purple-500" />;
      case "website":
        return <Globe className="h-3 w-3 text-green-500" />;
      case "youtube":
        return <Youtube className="h-3 w-3 text-red-600" />;
      case "pasted_text":
        return <ClipboardPaste className="h-3 w-3 text-orange-500" />;
      case "meeting":
        return <FileText className="h-3 w-3 text-primary" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Meeting Notebook</h1>
                <p className="text-sm text-muted-foreground">
                  Analyze and explore your meetings with AI
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {sources.length} {sources.length === 1 ? "source" : "sources"}
            </Badge>
          </div>
        </div>

        {/* Three-panel layout */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Sources Panel */}
          <div className="col-span-3 border-r flex flex-col bg-muted/20">
            <div className="p-4 border-b">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sources
              </h2>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowAddSourceDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {sources.length} / 50 sources
              </p>
            </div>

            <ScrollArea className="flex-1">

              {/* Sources List */}
              <div className="p-4">
                {sources.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Saved sources will appear here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click Add Meeting above to add your first source
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <Card
                        key={source.id}
                        className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                          selectedSource === source.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => setSelectedSource(source.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getSourceIcon(source.source_type)}
                              <p className="text-xs text-muted-foreground capitalize">
                                {source.source_type.replace("_", " ")}
                              </p>
                            </div>
                            <p className="text-sm font-medium line-clamp-2">
                              {source.title}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSource(source.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Center Panel - Chat */}
          <div className="col-span-5 flex flex-col">
            {!selectedSource ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md px-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      Add a source to get started
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Add documents, links, or text to analyze them with AI
                    </p>
                  </div>
                  <Button onClick={() => setShowAddSourceDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Source
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="border-b p-4">
                  <h2 className="font-semibold text-lg mb-1">
                    {sources.find(s => s.id === selectedSource)?.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {sources.length} {sources.length === 1 ? 'source' : 'sources'} selected
                  </p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <MeetingChatPanel meetingId={selectedSource} />
                </div>
              </div>
            )}
          </div>

          {/* Studio Panel */}
          <div className="col-span-4 border-l flex flex-col bg-muted/10">
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Studio
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Studio output will be saved here
              </p>
            </div>
            <ScrollArea className="flex-1">
              {!selectedSource ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4 max-w-sm px-4">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Studio Features
                      </p>
                      <p className="text-xs text-muted-foreground">
                        After adding sources, generate audio overviews, study guides, briefings, and more
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <MeetingStudioPanel meetingId={selectedSource} />
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      <AddSourceDialog
        open={showAddSourceDialog}
        onOpenChange={setShowAddSourceDialog}
        onSourceAdded={loadSources}
      />
    </Layout>
  );
};

export default Notebook;
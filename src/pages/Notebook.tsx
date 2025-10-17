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
  BookOpen,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MeetingChatPanel from "@/components/MeetingChatPanel";
import MeetingStudioPanel from "@/components/MeetingStudioPanel";
import { AddSourceDialog } from "@/components/AddSourceDialog";
import { CreateNotebookDialog } from "@/components/CreateNotebookDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotebookSource {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
}

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

const Notebook = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const meetingIdFromUrl = searchParams.get("meeting");
  const notebookIdFromUrl = searchParams.get("notebook");
  
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<string | null>(null);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [showCreateNotebookDialog, setShowCreateNotebookDialog] = useState(false);

  useEffect(() => {
    loadNotebooks();
  }, []);

  useEffect(() => {
    if (currentNotebook) {
      loadSources();
    }
  }, [currentNotebook]);

  useEffect(() => {
    // Auto-add meeting if URL parameter is present
    if (meetingIdFromUrl) {
      addMeetingAsSource(meetingIdFromUrl);
    }
  }, [meetingIdFromUrl]);

  const loadNotebooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotebooks(data || []);
      
      // Set current notebook from URL or first notebook
      if (notebookIdFromUrl && data?.some(n => n.id === notebookIdFromUrl)) {
        setCurrentNotebook(notebookIdFromUrl);
      } else if (data && data.length > 0) {
        setCurrentNotebook(data[0].id);
        setSearchParams({ notebook: data[0].id });
      } else {
        // No notebooks exist - create a default one
        await createDefaultNotebook();
      }
    } catch (error) {
      console.error("Error loading notebooks:", error);
      toast({
        title: "Error",
        description: "Failed to load notebooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultNotebook = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notebooks")
        .insert({
          user_id: user.id,
          title: "My First Notebook",
          description: "Getting started with Meeting Notebook",
        })
        .select("id")
        .single();

      if (error) throw error;

      setCurrentNotebook(data.id);
      setSearchParams({ notebook: data.id });
      await loadNotebooks();
    } catch (error) {
      console.error("Error creating default notebook:", error);
    }
  };

  const loadSources = async () => {
    if (!currentNotebook) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notebook_sources")
        .select("*")
        .eq("user_id", user.id)
        .eq("notebook_id", currentNotebook)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSources(data || []);
      if (data && data.length > 0 && selectedSources.length === 0) {
        setSelectedSources([data[0].id]);
      }
    } catch (error) {
      console.error("Error loading sources:", error);
      toast({
        title: "Error",
        description: "Failed to load sources",
        variant: "destructive",
      });
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

      await loadSources();
      
      // Auto-select the newly added meeting - just select the most recent
      const { data: latestSources } = await supabase
        .from("notebook_sources")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (latestSources && latestSources.length > 0) {
        setSelectedSources([latestSources[0].id]);
      }
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
      setSelectedSources(selectedSources.filter((s) => s !== id));

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

  const toggleSourceSelection = (id: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
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

  const handleSourceAdded = async (ids?: string[]) => {
    if (!currentNotebook) return;
    
    await loadSources();
    if (ids && ids.length > 0) {
      setSelectedSources(ids);
      return;
    }
    // Fallback: select most recent
    const { data } = await supabase
      .from("notebook_sources")
      .select("id")
      .eq("notebook_id", currentNotebook)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setSelectedSources([data.id]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Full-width Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h1 className="text-2xl font-bold">
                      {notebooks.find(n => n.id === currentNotebook)?.title || "Meeting Notebook"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Analyze and explore your meetings with AI
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {notebooks.map((notebook) => (
                  <DropdownMenuItem
                    key={notebook.id}
                    onClick={() => {
                      setCurrentNotebook(notebook.id);
                      setSearchParams({ notebook: notebook.id });
                      setSelectedSources([]);
                    }}
                    className={currentNotebook === notebook.id ? "bg-accent" : ""}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{notebook.title}</div>
                      {notebook.description && (
                        <div className="text-xs text-muted-foreground">{notebook.description}</div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCreateNotebookDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Notebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {selectedSources.length} {selectedSources.length === 1 ? "source" : "sources"} selected
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start gap-2"
                  onClick={() => setShowAddSourceDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {sources.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs mt-2"
                  onClick={() => {
                    if (selectedSources.length === sources.length) {
                      setSelectedSources([]);
                    } else {
                      setSelectedSources(sources.map(s => s.id));
                    }
                  }}
                >
                  {selectedSources.length === sources.length ? "Deselect all" : "Select all sources"}
                </Button>
              )}
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
                          selectedSources.includes(source.id)
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => toggleSourceSelection(source.id)}
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
            {selectedSources.length === 0 ? (
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
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-lg">
                      {selectedSources.length === 1
                        ? sources.find(s => s.id === selectedSources[0])?.title
                        : `${selectedSources.length} sources selected`}
                    </h2>
                  </div>
                  {selectedSources.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedSources.map(sourceId => {
                        const source = sources.find(s => s.id === sourceId);
                        return source ? (
                          <Badge key={sourceId} variant="secondary" className="gap-1">
                            {getSourceIcon(source.source_type)}
                            <span className="text-xs">{source.title}</span>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <MeetingChatPanel 
                    meetingId={selectedSources[0]}
                    sourceIds={selectedSources}
                    sourceTitles={selectedSources.map(id => {
                      const source = sources.find(s => s.id === id);
                      return source ? { id: source.id, title: source.title, type: source.source_type } : null;
                    }).filter(Boolean) as Array<{id: string; title: string; type: string}>}
                  />
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
              {selectedSources.length === 0 ? (
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
                  <MeetingStudioPanel meetingId={selectedSources[0]} />
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

      <AddSourceDialog
        open={showAddSourceDialog}
        onOpenChange={setShowAddSourceDialog}
        onSourceAdded={handleSourceAdded}
        notebookId={currentNotebook}
      />
      
      <CreateNotebookDialog
        open={showCreateNotebookDialog}
        onOpenChange={setShowCreateNotebookDialog}
        onNotebookCreated={(notebookId) => {
          setCurrentNotebook(notebookId);
          setSearchParams({ notebook: notebookId });
          loadNotebooks();
        }}
      />
    </div>
  );
};

export default Notebook;
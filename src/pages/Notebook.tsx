import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  FileText,
  MessageSquare,
  X,
  Loader2,
  Sparkles,
  File,
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
import { AudioOverviewPlayer } from "@/components/AudioOverviewPlayer";
import { TimelineView } from "@/components/TimelineView";
import { StudyGuideGenerator } from "@/components/StudyGuideGenerator";
import { ChatWithCitations } from "@/components/ChatWithCitations";
import { SourceSummaryPanel } from "@/components/SourceSummaryPanel";
import { NotebookStudioGrid } from "@/components/NotebookStudioGrid";
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
  const [currentLanguage, setCurrentLanguage] = useState<string | undefined>();
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
      
      if (notebookIdFromUrl && data?.some(n => n.id === notebookIdFromUrl)) {
        setCurrentNotebook(notebookIdFromUrl);
      } else if (data && data.length > 0) {
        setCurrentNotebook(data[0].id);
        setSearchParams({ notebook: data[0].id });
      } else {
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
        return <File className="h-3.5 w-3.5 text-red-500" />;
      case "text":
      case "markdown":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      case "audio":
        return <Music className="h-3.5 w-3.5 text-purple-500" />;
      case "website":
        return <Globe className="h-3.5 w-3.5 text-green-500" />;
      case "youtube":
        return <Youtube className="h-3.5 w-3.5 text-red-600" />;
      case "pasted_text":
        return <ClipboardPaste className="h-3.5 w-3.5 text-orange-500" />;
      case "meeting":
        return <FileText className="h-3.5 w-3.5 text-primary" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const handleSourceAdded = async (ids?: string[]) => {
    if (!currentNotebook) return;
    
    await loadSources();
    if (ids && ids.length > 0) {
      setSelectedSources(ids);
      return;
    }
    
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading notebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0 hover:bg-primary/10 hover-scale transition-all rounded-full"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-4 h-auto py-3 px-4 hover:bg-accent/50 hover-scale transition-all rounded-2xl border border-border/50">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 flex items-center justify-center shrink-0 shadow-lg">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h1 className="text-2xl font-bold leading-none mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {notebooks.find(n => n.id === currentNotebook)?.title || "Meeting Notebook"}
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      Analyze and explore with AI
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Notebooks</p>
                </div>
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
                        <div className="text-xs text-muted-foreground mt-0.5">{notebook.description}</div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCreateNotebookDialog(true)} className="text-primary font-medium">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Notebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm shadow-sm">
            <FileText className="h-4 w-4" />
            <span className="font-semibold">
              {selectedSources.length} {selectedSources.length === 1 ? "source" : "sources"}
            </span>
          </Badge>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Sources Panel */}
        <div className="col-span-3 border border-border/50 rounded-2xl flex flex-col bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="px-5 py-6 border-b bg-gradient-to-br from-card to-card/50 space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Sources
            </h2>
            
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-2 shadow-md hover-scale"
                onClick={() => setShowAddSourceDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add Source
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 hover-scale"
                onClick={() => {
                  toast({
                    title: "Coming soon",
                    description: "Discover feature will help you find relevant sources",
                  });
                }}
              >
                <Globe className="h-4 w-4" />
                Discover
              </Button>
            </div>
            
            {sources.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => {
                  if (selectedSources.length === sources.length) {
                    setSelectedSources([]);
                  } else {
                    setSelectedSources(sources.map(s => s.id));
                  }
                }}
              >
                {selectedSources.length === sources.length ? "✓" : "○"} Select all sources
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {sources.length === 0 ? (
                <div className="text-center py-24 px-4 animate-scale-in">
                  <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FileText className="h-12 w-12 text-purple-500/70" />
                  </div>
                  <p className="text-lg font-bold mb-2">
                    No sources yet
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-4">
                    Add documents, websites, or meetings to get started with AI analysis
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowAddSourceDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Source
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source, index) => (
                    <Card
                      key={source.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-xl hover-scale border-2 animate-fade-in rounded-xl ${
                        selectedSources.includes(source.id)
                          ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg ring-2 ring-primary/20"
                          : "hover:border-primary/40 hover:bg-accent/40"
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => toggleSourceSelection(source.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                              {getSourceIcon(source.source_type)}
                            </div>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {source.source_type.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold line-clamp-2 leading-snug mb-1">
                            {source.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(source.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 hover:bg-destructive/20 hover:text-destructive rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSource(source.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Summary & Chat */}
        <div className="col-span-5 flex flex-col border border-border/50 rounded-2xl bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SourceSummaryPanel sourceIds={selectedSources} targetLanguage={currentLanguage} />
          </div>
          <div className="h-[320px] shrink-0 border-t">
            <ChatWithCitations 
              sourceIds={selectedSources} 
              onLanguageDetected={setCurrentLanguage}
            />
          </div>
        </div>

        {/* Right Panel - Studio */}
        <div className="col-span-4 flex flex-col border border-border/50 rounded-2xl bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="px-5 py-5 border-b bg-gradient-to-br from-card to-card/50">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              AI Studio
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <NotebookStudioGrid
              sourceIds={selectedSources}
              notebookId={currentNotebook || ''}
              onFeatureSelect={(feature) => {
                if (feature === 'audio') {
                  // Show audio overview dialog
                  toast({
                    title: "Generating Audio Overview",
                    description: "This will take a moment...",
                  });
                }
              }}
            />
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
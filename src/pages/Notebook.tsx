import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Brain,
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
import { DocumentIntelligencePanel } from "@/components/DocumentIntelligencePanel";
import { AutoAnalysisIndicator } from "@/components/AutoAnalysisIndicator";
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-background/95 via-card/50 to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0 hover:bg-accent hover-scale transition-all"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 h-auto py-2 px-3 hover:bg-accent hover-scale transition-all rounded-xl">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h1 className="text-xl font-bold leading-none mb-1.5">
                      {notebooks.find(n => n.id === currentNotebook)?.title || "Meeting Notebook"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Analyze and explore with AI
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Your Notebooks</p>
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
                <DropdownMenuItem onClick={() => setShowCreateNotebookDialog(true)} className="text-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Notebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Badge variant="secondary" className="gap-2 px-3 py-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-medium">
              {selectedSources.length} {selectedSources.length === 1 ? "source" : "sources"}
            </span>
          </Badge>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Sources Panel */}
        <div className="col-span-3 border-r flex flex-col bg-gradient-to-b from-muted/40 to-muted/20">
          <div className="px-4 py-5 border-b bg-card/80 backdrop-blur-sm space-y-4">
            <h2 className="font-semibold text-base">Sources</h2>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setShowAddSourceDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
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
            <div className="p-3">
              {sources.length === 0 ? (
                <div className="text-center py-20 px-4 animate-scale-in">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base font-semibold mb-3">
                    No sources yet
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Add documents, websites, or meetings to get started with AI analysis
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <Card
                      key={source.id}
                      className={`p-3 cursor-pointer transition-all hover:shadow-md hover-scale border-2 animate-fade-in ${
                        selectedSources.includes(source.id)
                          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md"
                          : "hover:border-primary/30 hover:bg-accent/30"
                      }`}
                      onClick={() => toggleSourceSelection(source.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {getSourceIcon(source.source_type)}
                            <p className="text-xs text-muted-foreground capitalize font-medium">
                              {source.source_type.replace("_", " ")}
                            </p>
                            <AutoAnalysisIndicator sourceId={source.id} />
                          </div>
                          <p className="text-sm font-medium line-clamp-2 leading-snug">
                            {source.title}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSource(source.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
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
        <div className="col-span-5 flex flex-col bg-background overflow-hidden">
          <Tabs defaultValue="summary" className="flex-1 flex flex-col">
            <div className="px-4 py-2 border-b bg-card/50 backdrop-blur-sm">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="intelligence">Executive Intelligence</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="summary" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <SourceSummaryPanel sourceIds={selectedSources} targetLanguage={currentLanguage} />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="intelligence" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {selectedSources.length === 1 && sources.length > 0 ? (
                    (() => {
                      const source = sources.find(s => s.id === selectedSources[0]);
                      if (source) {
                        return (
                          <DocumentIntelligencePanel
                            sourceId={source.id}
                            content=""
                            title={source.title}
                            sourceType={source.source_type}
                          />
                        );
                      }
                      return <p className="text-muted-foreground">Source not found</p>;
                    })()
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Brain className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {selectedSources.length === 0
                            ? "Select a source to view executive intelligence"
                            : "Select only one source at a time for intelligence analysis"}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-hidden m-0 flex flex-col">
              <div className="flex-1 overflow-hidden">
                <ChatWithCitations 
                  sourceIds={selectedSources} 
                  onLanguageDetected={setCurrentLanguage}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Studio */}
        <div className="col-span-4 flex flex-col bg-background border-l">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-base">Studio</h3>
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
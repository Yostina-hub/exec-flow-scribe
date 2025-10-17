import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  FileText,
  Volume2,
  Brain,
  BookOpen,
  HelpCircle,
  MessageSquare,
  X,
  Calendar,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MeetingChatPanel from "@/components/MeetingChatPanel";
import MeetingStudioPanel from "@/components/MeetingStudioPanel";
import { Input } from "@/components/ui/input";

interface MeetingSource {
  id: string;
  title: string;
  date: string;
  status: string;
}

const Notebook = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const meetingIdFromUrl = searchParams.get("meeting");
  const [sources, setSources] = useState<MeetingSource[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableMeetings, setAvailableMeetings] = useState<MeetingSource[]>([]);
  const [showAddMeeting, setShowAddMeeting] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    // Auto-add meeting if URL parameter is present
    if (meetingIdFromUrl && availableMeetings.length > 0) {
      const meeting = availableMeetings.find(m => m.id === meetingIdFromUrl);
      if (meeting && !sources.find(s => s.id === meeting.id)) {
        addSource(meeting);
      }
    }
  }, [meetingIdFromUrl, availableMeetings]);

  const loadMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, start_time, status")
        .order("start_time", { ascending: false })
        .limit(20);

      if (error) throw error;

      const formatted = data?.map((m) => ({
        id: m.id,
        title: m.title,
        date: new Date(m.start_time).toLocaleDateString(),
        status: m.status,
      })) || [];

      setAvailableMeetings(formatted);
    } catch (error) {
      console.error("Error loading meetings:", error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSource = (meeting: MeetingSource) => {
    if (!sources.find((s) => s.id === meeting.id)) {
      setSources([...sources, meeting]);
      if (!selectedMeeting) {
        setSelectedMeeting(meeting.id);
      }
      toast({
        title: "Source Added",
        description: `${meeting.title} has been added to your notebook`,
      });
    }
    setShowAddMeeting(false);
  };

  const removeSource = (id: string) => {
    setSources(sources.filter((s) => s.id !== id));
    if (selectedMeeting === id) {
      setSelectedMeeting(sources[0]?.id || null);
    }
  };

  const filteredMeetings = availableMeetings.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !sources.find((s) => s.id === m.id)
  );

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
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowAddMeeting(!showAddMeeting)}
                >
                  <Plus className="h-4 w-4" />
                  Add Meeting
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Search className="h-4 w-4" />
                  Discover
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {/* Add Meeting Search */}
              {showAddMeeting && (
                <div className="p-4 bg-background border-b space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Add Meeting Source</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowAddMeeting(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Search meetings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredMeetings.map((meeting) => (
                      <Button
                        key={meeting.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => addSource(meeting)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {meeting.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {meeting.date}
                          </p>
                        </div>
                      </Button>
                    ))}
                    {filteredMeetings.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No meetings found
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                          selectedMeeting === source.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => setSelectedMeeting(source.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground">
                                {source.date}
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
            {!selectedMeeting ? (
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
                      Add meetings from the Sources panel to analyze them with AI
                    </p>
                  </div>
                  <Button onClick={() => setShowAddMeeting(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meeting Source
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="border-b p-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Chat
                  </h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <MeetingChatPanel meetingId={selectedMeeting} />
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
              {!selectedMeeting ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4 max-w-sm px-4">
                    <Volume2 className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Studio Features
                      </p>
                      <p className="text-xs text-muted-foreground">
                        After adding sources, generate audio overviews, mind
                        maps, reports, and more
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-4">
                      <div className="p-3 bg-background rounded-lg">
                        <Volume2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-center">Audio Overview</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <Brain className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-center">Mind Map</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-center">Reports</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <BookOpen className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-center">Flashcards</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <MeetingStudioPanel meetingId={selectedMeeting} />
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Notebook;
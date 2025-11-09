import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Users, 
  FileText, 
  MessageSquare, 
  Brain,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MeetingRightDockProps {
  meetingId: string;
  participants?: any[];
  documents?: any[];
}

export const MeetingRightDock = ({
  meetingId,
  participants = [],
  documents = [],
}: MeetingRightDockProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-muted/30 flex flex-col items-center pt-4 gap-3">
        <Button 
          size="icon" 
          variant="ghost"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Users className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <FileText className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Brain className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Tools</span>
        <Button 
          size="icon" 
          variant="ghost"
          onClick={() => setIsCollapsed(true)}
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="settings" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="settings" className="h-9">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="participants" className="h-9">
            <Users className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="documents" className="h-9">
            <FileText className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="ai" className="h-9">
            <Brain className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="settings" className="p-4 space-y-4 m-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Capture Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Language</label>
                  <select className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                    <option>Amharic (አማርኛ)</option>
                    <option>English (US)</option>
                    <option>Auto-detect</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Provider</label>
                  <select className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                    <option>OpenAI Realtime</option>
                    <option>Browser Speech</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="p-4 space-y-2 m-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Participants</h3>
              <Badge variant="secondary">{participants.length || 8}</Badge>
            </div>
            {(participants.length > 0 ? participants : Array(8).fill(null)).map((p, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {p?.initials || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p?.name || `Participant ${i + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p?.role || "Guest"}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="documents" className="p-4 space-y-2 m-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Documents</h3>
              <Button size="sm" variant="outline" className="h-7">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {documents.length === 0 && (
              <Card className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  No documents yet. Add documents to share with participants.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai" className="p-4 space-y-4 m-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">AI Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Brain className="h-3.5 w-3.5 mr-2" />
                  Ask AI a question
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  Generate summary
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  Extract insights
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

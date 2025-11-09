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
  ChevronRight,
  Wand2,
  Sparkles,
  Search
} from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranscriptionProviderToggle } from "@/components/TranscriptionProviderToggle";

const AudioToMinutesWorkflow = lazy(() => import("@/components/AudioToMinutesWorkflow").then(m => ({ default: m.AudioToMinutesWorkflow })));

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

      <Tabs defaultValue="quickactions" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="quickactions" className="h-9" title="Quick Actions">
            <Sparkles className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-9" title="Settings">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="documents" className="h-9" title="Documents">
            <FileText className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="audiominutes" className="h-9" title="Audio to Minutes">
            <Wand2 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="ai" className="h-9" title="AI Intelligence">
            <Brain className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Quick Actions Tab */}
          <TabsContent value="quickactions" className="p-4 space-y-3 m-0">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            
            <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3">
              <Sparkles className="h-5 w-5 mr-3" />
              <span className="text-left">
                <div className="font-medium">AI Key Points Summary</div>
              </span>
            </Button>

            <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3">
              <Search className="h-5 w-5 mr-3" />
              <span className="text-left">
                <div className="font-medium">Keyword Search</div>
              </span>
            </Button>

            <div className="my-4 border-t" />

            <Button 
              size="lg" 
              className="w-full justify-start h-auto py-3 bg-primary hover:bg-primary/90"
            >
              <FileText className="h-5 w-5 mr-3" />
              <span className="text-left">
                <div className="font-medium">Generate AI Minutes</div>
              </span>
            </Button>

            <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3">
              <FileText className="h-5 w-5 mr-3" />
              <span className="text-left">
                <div className="font-medium">Open Minutes Editor</div>
              </span>
            </Button>

            <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3">
              <Plus className="h-5 w-5 mr-3" />
              <span className="text-left">
                <div className="font-medium">Add Agenda Items</div>
              </span>
            </Button>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4 m-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Capture Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LanguageSelector />
                <TranscriptionProviderToggle />
              </CardContent>
            </Card>
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

          {/* Audio to Minutes Tab */}
          <TabsContent value="audiominutes" className="p-4 m-0">
            <Suspense fallback={
              <Card className="p-8 text-center">
                <div className="animate-pulse space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </Card>
            }>
              <AudioToMinutesWorkflow meetingId={meetingId} />
            </Suspense>
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileAudio, FileText, Sparkles, Search, Download, Eye } from "lucide-react";
import { MeetingAudioPlayback } from "@/components/MeetingAudioPlayback";
import { MeetingSummaryCard } from "@/components/MeetingSummaryCard";
import { MeetingKeyPointsSummary } from "@/components/MeetingKeyPointsSummary";
import { MeetingKeywordSearch } from "@/components/MeetingKeywordSearch";
import { TranscriptionDocumentExport } from "@/components/TranscriptionDocumentExport";
import { EnhancedTranscriptionDisplay } from "@/components/EnhancedTranscriptionDisplay";
import { DocumentVersionControl } from "@/components/DocumentVersionControl";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";

interface EnhancedDocumentsTabProps {
  meetingId: string;
  meetingTitle?: string;
}

export const EnhancedDocumentsTab = ({ meetingId, meetingTitle = "Meeting" }: EnhancedDocumentsTabProps) => {
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTranscriptions();
  }, [meetingId]);

  const fetchTranscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (data && !error) {
        setTranscriptions(data);
      }
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formattedTranscriptions = transcriptions.map(t => ({
    id: t.id,
    content: t.content,
    speaker_name: t.speaker_name || 'Unknown',
    timestamp: t.timestamp,
    confidence_score: t.confidence_score || 0.95,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="audio" className="w-full">
        <TabsList className={`grid w-full grid-cols-5 ${isEthioTelecom ? 'bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10' : ''}`}>
          <TabsTrigger value="audio" className="gap-2">
            <FileAudio className="h-4 w-4" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="transcriptions" className="gap-2">
            <FileText className="h-4 w-4" />
            Transcripts
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="keypoints" className="gap-2">
            <Eye className="h-4 w-4" />
            Key Points
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
        </TabsList>

        {/* Audio Recordings Tab */}
        <TabsContent value="audio" className="space-y-4">
          <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileAudio className="h-5 w-5 text-primary" />
                    Recorded Audio Files
                  </CardTitle>
                  <CardDescription>
                    All audio recordings from this meeting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MeetingAudioPlayback meetingId={meetingId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Transcription Files Tab */}
        <TabsContent value="transcriptions" className="space-y-4">
          <div className="grid gap-4">
            <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Complete Transcription
                    </CardTitle>
                    <CardDescription>
                      Full meeting transcription with speaker identification
                    </CardDescription>
                  </div>
                  <TranscriptionDocumentExport 
                    meetingId={meetingId} 
                    meetingTitle={meetingTitle}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading transcriptions...
                  </div>
                ) : formattedTranscriptions.length > 0 ? (
                  <EnhancedTranscriptionDisplay transcriptions={formattedTranscriptions} />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No transcriptions available yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start recording to generate transcriptions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Version Control */}
            <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Document Versions
                </CardTitle>
                <CardDescription>
                  Manage and download different versions of meeting documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentVersionControl meetingId={meetingId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Meeting Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Generated Meeting Summary
              </CardTitle>
              <CardDescription>
                Comprehensive overview of the meeting with AI insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingSummaryCard 
                meetingId={meetingId} 
                meetingTitle={meetingTitle}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Key Points Summary Tab */}
        <TabsContent value="keypoints" className="space-y-4">
          <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Key Points & Highlights
              </CardTitle>
              <CardDescription>
                Important takeaways and action items from the meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingKeyPointsSummary meetingId={meetingId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keyword Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Keyword Search
              </CardTitle>
              <CardDescription>
                Search through transcriptions, minutes, and agenda items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingKeywordSearch meetingId={meetingId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

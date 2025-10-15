import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, CheckCircle, AlertTriangle, FileText, Film } from 'lucide-react';
import { WaveformViewer } from '@/components/minutes/WaveformViewer';
import { ConfidenceHeatmap } from '@/components/minutes/ConfidenceHeatmap';
import { FactCheckPanel } from '@/components/minutes/FactCheckPanel';
import { MediaVault } from '@/components/minutes/MediaVault';

interface TranscriptSegment {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export default function MinutesEditor() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [minutes, setMinutes] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<TranscriptSegment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingData();
    }
  }, [meetingId]);

  const fetchMeetingData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch transcriptions
      const { data: transcriptions, error: transError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (transError) throw transError;

      // Transform transcriptions into segments
      const segments: TranscriptSegment[] = (transcriptions || []).map((t, idx) => ({
        id: t.id,
        speaker: t.speaker_name || 'Unknown Speaker',
        content: t.content,
        timestamp: new Date(t.timestamp).toLocaleTimeString(),
        confidence: t.confidence_score ? Number(t.confidence_score) : 0.9,
        startTime: idx * 5, // Mock timing
        endTime: (idx + 1) * 5,
      }));

      setTranscript(segments);

      // Fetch latest minutes version
      const { data: minutesData } = await supabase
        .from('minutes_versions')
        .select('content')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (minutesData) {
        setMinutes(minutesData.content);
      }
    } catch (error) {
      console.error('Error fetching meeting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meeting data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMinutes = async () => {
    try {
      setIsSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current version number
      const { data: versions } = await supabase
        .from('minutes_versions')
        .select('version_number')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // Save new version
      const { error } = await supabase
        .from('minutes_versions')
        .insert({
          meeting_id: meetingId,
          version_number: nextVersion,
          content: minutes,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Saved',
        description: `Minutes version ${nextVersion} saved successfully`,
      });
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save minutes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRatifyMinutes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save current version first if there are changes
      if (minutes.trim()) {
        await handleSaveMinutes();
      }

      // Get latest version
      const { data: latestVersion, error: fetchError } = await supabase
        .from('minutes_versions')
        .select('id')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!latestVersion) {
        toast({
          title: 'No minutes to ratify',
          description: 'Please save minutes before ratifying',
          variant: 'destructive',
        });
        return;
      }

      // Mark as ratified
      const { error } = await supabase
        .from('minutes_versions')
        .update({
          is_ratified: true,
          ratified_at: new Date().toISOString(),
          ratified_by: user.id,
        })
        .eq('id', latestVersion.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Minutes have been ratified and locked',
      });
    } catch (error: any) {
      console.error('Error ratifying minutes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to ratify minutes',
        variant: 'destructive',
      });
    }
  };

  const handleSegmentClick = (segment: TranscriptSegment) => {
    setSelectedSegment(segment);
    // TODO: Seek audio/video to this timestamp
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading meeting data...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold">Minutes Polisher</h1>
            <p className="text-sm text-muted-foreground">Edit and refine meeting minutes</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveMinutes} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Version'}
            </Button>
            <Button onClick={handleRatifyMinutes} variant="default">
              <CheckCircle className="w-4 h-4 mr-2" />
              Ratify & Lock
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane - Transcript */}
          <div className="w-1/2 flex flex-col border-r">
            <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start border-b rounded-none">
                <TabsTrigger value="transcript">
                  <FileText className="w-4 h-4 mr-2" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="media">
                  <Film className="w-4 h-4 mr-2" />
                  Media
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="flex-1 flex flex-col m-0">
                {/* Waveform */}
                <div className="p-4 border-b">
                  <WaveformViewer 
                    meetingId={meetingId!}
                    onSeek={(time) => console.log('Seek to:', time)}
                  />
                </div>

                {/* Confidence Heatmap */}
                <div className="p-4 border-b">
                  <ConfidenceHeatmap segments={transcript} />
                </div>

                {/* Transcript Segments */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {transcript.map((segment) => (
                    <Card
                      key={segment.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedSegment?.id === segment.id ? 'border-primary' : ''
                      }`}
                      onClick={() => handleSegmentClick(segment)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">{segment.speaker}</span>
                            <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                            {segment.confidence < 0.7 && (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-sm">{segment.content}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              Confidence: {(segment.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="media" className="flex-1 m-0">
                <MediaVault meetingId={meetingId!} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Pane - Polished Minutes */}
          <div className="w-1/2 flex flex-col">
            <Tabs defaultValue="minutes" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start border-b rounded-none">
                <TabsTrigger value="minutes">Polished Minutes</TabsTrigger>
                <TabsTrigger value="factcheck">Fact Checks</TabsTrigger>
              </TabsList>

              <TabsContent value="minutes" className="flex-1 m-0 p-4">
                <Textarea
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="h-full resize-none font-mono text-sm"
                  placeholder="Edit polished minutes here..."
                />
              </TabsContent>

              <TabsContent value="factcheck" className="flex-1 m-0">
                <FactCheckPanel meetingId={meetingId!} transcript={transcript} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, CheckCircle, AlertTriangle, FileText, Film, ArrowLeft, FileDown } from 'lucide-react';
import { WaveformViewer } from '@/components/minutes/WaveformViewer';
import { ConfidenceHeatmap } from '@/components/minutes/ConfidenceHeatmap';
import { FactCheckPanel } from '@/components/minutes/FactCheckPanel';
import { MediaVault } from '@/components/minutes/MediaVault';
import { SensitiveSectionManager } from '@/components/signoff/SensitiveSectionManager';
import { PDFGenerationDialog } from '@/components/pdf/PDFGenerationDialog';

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
  const [meetingTitle, setMeetingTitle] = useState('');
  const [sensitiveSections, setSensitiveSections] = useState<any[]>([]);
  const [isSubmittingForSignOff, setIsSubmittingForSignOff] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [latestMinutesVersionId, setLatestMinutesVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingData();
    }
  }, [meetingId]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveMinutes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [minutes]);

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

      // Fetch meeting details
      const { data: meeting } = await supabase
        .from('meetings')
        .select('title')
        .eq('id', meetingId)
        .single();

      if (meeting) {
        setMeetingTitle(meeting.title);
        document.title = `Minutes Editor - ${meeting.title}`;
      }

      // Fetch latest minutes version
      const { data: minutesData } = await supabase
        .from('minutes_versions')
        .select('id, content')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (minutesData) {
        setMinutes(minutesData.content);
        setLatestMinutesVersionId(minutesData.id);
      }

      // Fetch sensitive sections
      const { data: sections } = await supabase
        .from('section_sensitivities')
        .select('*')
        .eq('meeting_id', meetingId);

      if (sections) {
        setSensitiveSections(sections);
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

  const handleSubmitForSignOff = async () => {
    try {
      setIsSubmittingForSignOff(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save current minutes first
      await handleSaveMinutes();

      // Get latest minutes version
      const { data: latestVersion, error: versionError } = await supabase
        .from('minutes_versions')
        .select('id, content')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError) throw versionError;
      if (!latestVersion) {
        toast({ title: 'Error', description: 'No minutes to submit', variant: 'destructive' });
        return;
      }

      // Fetch decisions and actions
      const { data: decisions } = await supabase
        .from('decisions')
        .select('decision_text, timestamp, context')
        .eq('meeting_id', meetingId);

      const { data: actions } = await supabase
        .from('action_items')
        .select('title, due_date, priority, assigned_to')
        .eq('meeting_id', meetingId);

      // Get assignee names
      const assigneeNames = new Map<string, string>();
      if (actions) {
        const uniqueUserIds = [...new Set(actions.map(a => a.assigned_to))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueUserIds);
        
        profiles?.forEach(p => assigneeNames.set(p.id, p.full_name || 'Unknown'));
      }

      // Format package data
      const packageData = {
        minutes: latestVersion.content,
        decisions: decisions || [],
        actions: (actions || []).map(a => ({
          ...a,
          assigned_to: assigneeNames.get(a.assigned_to) || 'Unknown',
        })),
        sensitiveSections: sensitiveSections.map(s => ({
          section_type: s.section_type,
          sensitivity_level: s.sensitivity_level,
        })),
      };

      // Get CEO or default approver (for demo, use first user with admin role)
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(1);

      const approver = adminUsers?.[0]?.user_id || user.id;

      // Create signature request
      const { data: request, error: requestError } = await supabase
        .from('signature_requests')
        .insert({
          meeting_id: meetingId,
          minutes_version_id: latestVersion.id,
          requested_by: user.id,
          assigned_to: approver,
          package_data: packageData,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      toast({
        title: 'Success',
        description: 'Minutes submitted for CEO sign-off',
      });

      // Navigate to signature approval page
      navigate(`/signature/${request.id}`);
    } catch (error: any) {
      console.error('Error submitting for sign-off:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit for sign-off',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingForSignOff(false);
    }
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
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/meetings/${meetingId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Minutes Polisher</h1>
              <p className="text-sm text-muted-foreground">
                {meetingTitle || 'Edit and refine meeting minutes'} • {minutes.split(/\s+/).filter(w => w).length} words
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveMinutes} disabled={isSaving} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save (Ctrl+S)'}
            </Button>
            <Button 
              onClick={() => setShowPDFDialog(true)} 
              disabled={!latestMinutesVersionId}
              variant="outline"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Generate PDF
            </Button>
            <Button onClick={handleSubmitForSignOff} disabled={isSubmittingForSignOff} variant="default">
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSubmittingForSignOff ? 'Submitting...' : 'Submit for Sign-Off'}
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
                  {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Transcript Available</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Start recording the meeting or upload audio to generate a transcript
                      </p>
                    </div>
                  ) : (
                    transcript.map((segment) => (
                      <Card
                        key={segment.id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedSegment?.id === segment.id ? 'border-primary ring-2 ring-primary/20' : ''
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
                    ))
                  )}
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
                {minutes || transcript.length > 0 ? (
                  <Textarea
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="h-full resize-none font-mono text-sm leading-relaxed"
                    placeholder="Type or paste your polished minutes here...&#10;&#10;Tip: Use the transcript on the left as reference. Press Ctrl+S to save."
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Start Writing Minutes</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Click here to start typing your meeting minutes. You can reference the transcript on the left.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="factcheck" className="flex-1 m-0 p-4">
                <FactCheckPanel meetingId={meetingId!} transcript={transcript} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sensitive Sections Panel */}
        <div className="border-t p-4">
          <SensitiveSectionManager
            meetingId={meetingId!}
            sections={sensitiveSections}
            onUpdate={fetchMeetingData}
          />
        </div>
      </div>

      {/* PDF Generation Dialog */}
      <PDFGenerationDialog
        open={showPDFDialog}
        onOpenChange={setShowPDFDialog}
        meetingId={meetingId!}
        minutesVersionId={latestMinutesVersionId!}
      />
    </Layout>
  );
}

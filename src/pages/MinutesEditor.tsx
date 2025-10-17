import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, CheckCircle, AlertTriangle, FileText, Film, ArrowLeft, Sparkles, Clock, Loader2 } from 'lucide-react';
import { WaveformViewer } from '@/components/minutes/WaveformViewer';
import { ConfidenceHeatmap } from '@/components/minutes/ConfidenceHeatmap';
import { FactCheckPanel } from '@/components/minutes/FactCheckPanel';
import { MediaVault } from '@/components/minutes/MediaVault';
import { SensitiveSectionManager } from '@/components/signoff/SensitiveSectionManager';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/minutes/AudioPlayer';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [audioSeekTime, setAudioSeekTime] = useState<number | undefined>(undefined);
  const [sensitiveSections, setSensitiveSections] = useState<any[]>([]);
  const [isSubmittingForSignOff, setIsSubmittingForSignOff] = useState(false);
  const [latestMinutesVersionId, setLatestMinutesVersionId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingData();
    }
  }, [meetingId]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!minutes || !meetingId) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveMinutes(true);
    }, 3000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [minutes, meetingId]);

  const fetchMeetingData = async () => {
    try {
      setIsLoading(true);
      
      const { data: transcriptions, error: transError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (transError) throw transError;

      const segments: TranscriptSegment[] = (transcriptions || []).map((t, idx) => ({
        id: t.id,
        speaker: t.speaker_name || 'Unknown Speaker',
        content: t.content,
        timestamp: new Date(t.timestamp).toLocaleTimeString(),
        confidence: t.confidence_score ? Number(t.confidence_score) : 0.9,
        startTime: idx * 5,
        endTime: (idx + 1) * 5,
      }));

      setTranscript(segments);

      const { data: meeting } = await supabase
        .from('meetings')
        .select('title, recording_url')
        .eq('id', meetingId)
        .single();

      if (meeting) {
        setMeetingTitle(meeting.title);
        setRecordingUrl(meeting.recording_url);
        document.title = `Minutes Editor - ${meeting.title}`;
      }

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

  const handleGenerateMinutes = async () => {
    try {
      setIsGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to generate minutes',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Generating Minutes',
        description: 'AI is analyzing your meeting transcript...',
      });

      const { data, error } = await supabase.functions.invoke('generate-minutes', {
        body: { meeting_id: meetingId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error generating minutes:', error);
        toast({
          title: 'Generation Failed',
          description: error.message || 'Failed to generate minutes. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.minutes) {
        setMinutes(data.minutes);
        toast({
          title: 'Success!',
          description: 'Meeting minutes generated successfully',
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMinutes = async (isAutoSave = false) => {
    try {
      setIsSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: versions } = await supabase
        .from('minutes_versions')
        .select('version_number')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      const { data: newVersion, error } = await supabase
        .from('minutes_versions')
        .insert({
          meeting_id: meetingId,
          version_number: nextVersion,
          content: minutes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setLastSaved(new Date());
      setLatestMinutesVersionId(newVersion.id);

      if (!isAutoSave) {
        toast({
          title: 'Saved',
          description: `Minutes version ${nextVersion} saved successfully`,
        });
        
        await generatePDF(newVersion.id);
      }
    } catch (error) {
      console.error('Error saving minutes:', error);
      if (!isAutoSave) {
        toast({
          title: 'Error',
          description: 'Failed to save minutes',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (minutesVersionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: brandKit } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();

      const { error } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: meetingId,
          minutes_version_id: minutesVersionId,
          brand_kit_id: brandKit?.id,
          watermark: 'INTERNAL USE ONLY',
          include_exhibits: true,
        },
      });

      if (error) throw error;

      toast({
        title: 'PDF Generated',
        description: 'Branded PDF has been automatically generated',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleSegmentClick = (segment: TranscriptSegment) => {
    setSelectedSegment(segment);
    // Seek audio to this segment's start time
    setAudioSeekTime(segment.startTime);
  };

  const handleSubmitForSignOff = async () => {
    try {
      setIsSubmittingForSignOff(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await handleSaveMinutes();

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

      const { data: decisions } = await supabase
        .from('decisions')
        .select('decision_text, timestamp, context')
        .eq('meeting_id', meetingId);

      const { data: actions } = await supabase
        .from('action_items')
        .select('title, due_date, priority, assigned_to')
        .eq('meeting_id', meetingId);

      const assigneeNames = new Map<string, string>();
      if (actions) {
        const uniqueUserIds = [...new Set(actions.map(a => a.assigned_to))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueUserIds);
        
        profiles?.forEach(p => assigneeNames.set(p.id, p.full_name || 'Unknown'));
      }

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

      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(1);

      const approver = adminUsers?.[0]?.user_id || user.id;

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
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading meeting data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const wordCount = minutes.split(/\s+/).filter(w => w).length;

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-background via-background to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/95">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/meetings/${meetingId}`)}
              className="hover:scale-110 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Minutes Polisher
                </h1>
                <Badge variant="secondary" className="animate-pulse">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-muted-foreground font-medium">
                  {meetingTitle || 'Edit and refine meeting minutes'}
                </p>
                <span className="text-xs text-muted-foreground">•</span>
                <Badge variant="outline" className="text-xs">
                  {wordCount} words
                </Badge>
                {lastSaved && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Auto-saved {lastSaved.toLocaleTimeString()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateMinutes} 
              disabled={isGenerating || transcript.length === 0}
              variant="secondary"
              className="hover:scale-105 transition-transform"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
            <Button 
              onClick={handleSubmitForSignOff} 
              disabled={isSubmittingForSignOff || !minutes}
              className="bg-gradient-to-r from-primary to-accent hover:scale-105 transition-transform"
            >
              {isSubmittingForSignOff ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit for Sign-Off
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane - Transcript */}
          <div className="w-1/2 flex flex-col border-r bg-muted/20">
            <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start border-b rounded-none bg-background/50 backdrop-blur">
                <TabsTrigger value="transcript" className="data-[state=active]:bg-primary/10">
                  <FileText className="w-4 h-4 mr-2" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="media" className="data-[state=active]:bg-primary/10">
                  <Film className="w-4 h-4 mr-2" />
                  Media
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="flex-1 flex flex-col m-0">
                {/* Audio Player */}
                <div className="p-4 border-b bg-background/80 backdrop-blur">
                  <AudioPlayer 
                    audioUrl={recordingUrl || undefined}
                    seekTo={audioSeekTime}
                    onTimeUpdate={(time) => {
                      // You can use this to highlight current transcript segment
                      console.log('Audio time:', time);
                    }}
                  />
                </div>

                {/* Waveform */}
                <div className="p-4 border-b bg-background/80 backdrop-blur">
                  <WaveformViewer 
                    meetingId={meetingId!}
                    onSeek={(time) => setAudioSeekTime(time)}
                  />
                </div>

                {/* Confidence Heatmap */}
                <div className="p-4 border-b bg-background/50">
                  <ConfidenceHeatmap segments={transcript} />
                </div>

                {/* Transcript Segments */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="rounded-full bg-primary/10 p-6 mb-4">
                        <FileText className="w-16 h-16 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No Transcript Available</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Start recording the meeting or upload audio to generate a transcript
                      </p>
                    </div>
                  ) : (
                    transcript.map((segment) => (
                      <Card
                        key={segment.id}
                        className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                          selectedSegment?.id === segment.id 
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
                            : 'hover:bg-accent/5'
                        }`}
                        onClick={() => handleSegmentClick(segment)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs font-semibold">
                                {segment.speaker}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                              {segment.confidence < 0.7 && (
                                <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{segment.content}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                segment.confidence >= 0.9 ? 'bg-success/10 text-success' :
                                segment.confidence >= 0.7 ? 'bg-warning/10 text-warning' :
                                'bg-destructive/10 text-destructive'
                              }`}>
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
          <div className="w-1/2 flex flex-col bg-background">
            <Tabs defaultValue="minutes" className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start border-b rounded-none bg-muted/30">
                <TabsTrigger value="minutes" className="data-[state=active]:bg-primary/10">
                  <FileText className="w-4 h-4 mr-2" />
                  Polished Minutes
                </TabsTrigger>
                <TabsTrigger value="factcheck" className="data-[state=active]:bg-primary/10">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Fact Checks
                </TabsTrigger>
              </TabsList>

              <TabsContent value="minutes" className="flex-1 m-0 p-6">
                {minutes || transcript.length > 0 ? (
                  <Textarea
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="h-full resize-none text-sm leading-relaxed focus:ring-2 focus:ring-primary/50 transition-all custom-scrollbar"
                    placeholder="Type or paste your polished minutes here...

Tip: Use the transcript on the left as reference. Press Ctrl+S to save.

The AI assistant can help generate a professional structure for you."
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="rounded-full bg-primary/10 p-6 mb-4 animate-pulse">
                      <FileText className="w-16 h-16 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Start Writing Minutes</h3>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                      Click "Generate with AI" to auto-generate minutes, or start typing manually.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="factcheck" className="flex-1 m-0 p-6">
                <FactCheckPanel meetingId={meetingId!} transcript={transcript} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sensitive Sections Panel */}
        <div className="border-t p-4 bg-muted/10">
          <SensitiveSectionManager
            meetingId={meetingId!}
            sections={sensitiveSections}
            onUpdate={fetchMeetingData}
          />
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LiveAudioRecorder } from './LiveAudioRecorder';
import { PDFGenerationPanel } from './PDFGenerationPanel';
import { Loader2, FileAudio, FileText, CheckCircle, AlertCircle, Download, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface AudioToMinutesWorkflowProps {
  meetingId: string;
}

type WorkflowStep = 'upload' | 'transcribing' | 'generating' | 'pdf' | 'complete';

export function AudioToMinutesWorkflow({ meetingId }: AudioToMinutesWorkflowProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [minutes, setMinutes] = useState<string>('');
  const [transcription, setTranscription] = useState<string>('');
  const [hasPDF, setHasPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [hasTranscriptPDF, setHasTranscriptPDF] = useState(false);
  const [transcriptPdfUrl, setTranscriptPdfUrl] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [latestAudioUrl, setLatestAudioUrl] = useState<string>();
  const [isGeneratingTranscriptPDF, setIsGeneratingTranscriptPDF] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkExistingData();
  }, [meetingId]);

  const checkExistingData = async () => {
    try {
      // Check for existing transcriptions
      const { data: transcripts } = await supabase
        .from('transcriptions')
        .select('content')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (transcripts && transcripts.length > 0) {
        setTranscription(transcripts[0].content);
        setCurrentStep('generating');
      }

      // Check for existing minutes
      const { data: minutesData } = await supabase
        .from('minutes_versions')
        .select('content')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (minutesData && minutesData.length > 0) {
        setMinutes(minutesData[0].content);
        setCurrentStep('pdf');
      }

      // Check for existing PDF
      const { data: meeting } = await supabase
        .from('meetings')
        .select('minutes_url')
        .eq('id', meetingId)
        .single();

      if (meeting?.minutes_url) {
        setHasPDF(true);
        setPdfUrl(meeting.minutes_url);
        setCurrentStep('complete');
      }

      // Check for latest audio
      const { data: audioData } = await supabase
        .from('meeting_media')
        .select('file_url')
        .eq('meeting_id', meetingId)
        .eq('media_type', 'audio')
        .order('created_at', { ascending: false })
        .limit(1);

      if (audioData && audioData.length > 0) {
        setLatestAudioUrl(audioData[0].file_url);
      }

      // Check for transcript PDF
      const { data: transcriptPdf } = await supabase
        .from('meeting_media')
        .select('file_url')
        .eq('meeting_id', meetingId)
        .eq('media_type', 'transcript_pdf')
        .order('created_at', { ascending: false })
        .limit(1);

      if (transcriptPdf && transcriptPdf.length > 0) {
        setHasTranscriptPDF(true);
        setTranscriptPdfUrl(transcriptPdf[0].file_url);
      }
    } catch (error) {
      console.error('Error checking existing data:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|webm|ogg|m4a)$/i)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an audio file (MP3, WAV, WEBM, OGG, M4A)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Audio file must be less than 25MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage
      const fileName = `${meetingId}-${Date.now()}-${file.name}`;
      const filePath = `${meetingId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-audio')
        .getPublicUrl(filePath);

      // Generate checksum
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Save to database
      const { error: insertError } = await supabase
        .from('meeting_media')
        .insert({
          meeting_id: meetingId,
          uploaded_by: user.id,
          file_url: publicUrl,
          media_type: 'audio',
          format: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          checksum,
        });

      if (insertError) throw insertError;

      setLatestAudioUrl(publicUrl);
      
      toast({
        title: 'Upload Complete',
        description: 'Audio file uploaded successfully. Click "Process Audio" to transcribe.',
      });

      checkExistingData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload audio file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateTranscriptPDF = async () => {
    try {
      setIsGeneratingTranscriptPDF(true);
      
      const { data, error } = await supabase.functions.invoke('generate-transcript-pdf', {
        body: { meetingId },
      });

      if (error) throw error;

      // Save the PDF URL
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('meeting_media')
        .insert({
          meeting_id: meetingId,
          media_type: 'transcript_pdf',
          file_url: data.pdfUrl,
          uploaded_by: user.id,
          checksum: '',
        });

      if (insertError) throw insertError;

      setHasTranscriptPDF(true);
      setTranscriptPdfUrl(data.pdfUrl);

      toast({
        title: 'Transcript PDF Generated',
        description: 'Transcription has been saved as PDF',
      });

      checkExistingData();
    } catch (error: any) {
      console.error('Error generating transcript PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error.message || 'Could not generate transcript PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTranscriptPDF(false);
    }
  };

  const handleAudioUpload = async () => {
    if (!latestAudioUrl) {
      toast({
        title: 'No Audio',
        description: 'Please upload an audio recording first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentStep('transcribing');
      setProgress(20);

      // Fetch the audio file
      const response = await fetch(latestAudioUrl);
      const audioBlob = await response.blob();
      
      // Convert to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      setProgress(40);

      // Transcribe audio
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioBase64: base64Audio,
          meetingId,
          language: 'auto',
          contentType: audioBlob.type,
        },
      });

      if (transcriptError) throw transcriptError;

      setTranscription(transcriptData.transcription);
      setProgress(60);
      
      toast({
        title: 'Transcription Complete',
        description: 'Audio has been transcribed successfully',
      });

      // Generate minutes
      setCurrentStep('generating');
      setProgress(70);

      const { data: minutesData, error: minutesError } = await supabase.functions.invoke('generate-minutes', {
        body: { meetingId },
      });

      if (minutesError) throw minutesError;

      setMinutes(minutesData.minutes);
      setProgress(90);
      
      toast({
        title: 'Minutes Generated',
        description: 'Meeting minutes have been created',
      });

      setCurrentStep('pdf');
      setProgress(100);
    } catch (error: any) {
      console.error('Workflow error:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process audio',
        variant: 'destructive',
      });
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    if (step === currentStep && isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    const stepIndex = ['upload', 'transcribing', 'generating', 'pdf', 'complete'].indexOf(step);
    const currentIndex = ['upload', 'transcribing', 'generating', 'pdf', 'complete'].indexOf(currentStep);
    
    if (stepIndex < currentIndex || currentStep === 'complete') {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    
    return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Audio to Minutes Workflow</CardTitle>
          <CardDescription>
            Complete workflow from audio recording to PDF generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {getStepIcon('upload')}
              <span className={currentStep === 'upload' ? 'font-medium' : 'text-muted-foreground'}>
                Upload Audio Recording
              </span>
            </div>
            <div className="flex items-center gap-3">
              {getStepIcon('transcribing')}
              <span className={currentStep === 'transcribing' ? 'font-medium' : 'text-muted-foreground'}>
                Transcribe Audio
              </span>
            </div>
            <div className="flex items-center gap-3">
              {getStepIcon('generating')}
              <span className={currentStep === 'generating' ? 'font-medium' : 'text-muted-foreground'}>
                Generate Minutes
              </span>
            </div>
            <div className="flex items-center gap-3">
              {getStepIcon('pdf')}
              <span className={currentStep === 'pdf' ? 'font-medium' : 'text-muted-foreground'}>
                Create PDF
              </span>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Processing... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Upload Options */}
      <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Audio File</CardTitle>
              <CardDescription>
                Upload a pre-recorded audio file (MP3, WAV, WEBM, OGG, M4A - max 25MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or record new audio
              </span>
            </div>
          </div>

          <LiveAudioRecorder
            meetingId={meetingId}
            onUploadComplete={() => {
              checkExistingData();
              toast({
                title: 'Audio Uploaded',
                description: 'Ready to transcribe and generate minutes',
              });
            }}
          />
          
          {latestAudioUrl && !isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Audio Ready</p>
                      <p className="text-sm text-muted-foreground">
                        Click to process and generate minutes
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleAudioUpload}>
                    Process Audio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      {/* Transcription Display */}
      {transcription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcription
              </CardTitle>
              <Badge variant="success">Complete</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <p className="text-sm whitespace-pre-wrap">{transcription}</p>
            </ScrollArea>
            
            {hasTranscriptPDF ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-medium">Transcript PDF Ready</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(transcriptPdfUrl, '_blank')}
                >
                  Download PDF
                </Button>
              </div>
            ) : (
              <Button
                onClick={generateTranscriptPDF}
                disabled={isGeneratingTranscriptPDF}
                variant="secondary"
                className="w-full"
              >
                {isGeneratingTranscriptPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Transcript PDF
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Minutes Display */}
      {minutes && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Meeting Minutes
              </CardTitle>
              <Badge variant="success">Generated</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>
                  {minutes}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* PDF Generation */}
      {minutes && (currentStep === 'pdf' || currentStep === 'complete') && (
        <PDFGenerationPanel
          meetingId={meetingId}
          hasPDF={hasPDF}
          pdfUrl={pdfUrl}
          minutesGenerated={!!minutes}
          onPDFGenerated={() => {
            setHasPDF(true);
            setCurrentStep('complete');
            checkExistingData();
          }}
        />
      )}
    </div>
  );
}

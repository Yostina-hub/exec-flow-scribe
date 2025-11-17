import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LiveAudioRecorder } from './LiveAudioRecorder';
import { PDFGenerationPanel } from './PDFGenerationPanel';
import { Loader2, FileAudio, FileText, CheckCircle, AlertCircle, Download, Upload, Edit, Save, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { normalizeAIMarkdown } from '@/utils/markdownNormalizer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';

interface AudioToMinutesWorkflowProps {
  meetingId: string;
}

type WorkflowStep = 'upload' | 'transcribing' | 'generating' | 'pdf' | 'complete';

export function AudioToMinutesWorkflow({ meetingId }: AudioToMinutesWorkflowProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [minutes, setMinutes] = useState<string>('');
  const [transcription, setTranscription] = useState<string>('');
  const [editableTranscription, setEditableTranscription] = useState<string>('');
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);
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
        setEditableTranscription(transcripts[0].content);
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

    // Very permissive validation - accept any audio/video type or common extensions
    const isAudioOrVideo = file.type.startsWith('audio/') || file.type.startsWith('video/');
    const commonExtensions = /\.(mp3|wav|webm|ogg|m4a|aac|mp4|mov|avi|mkv|flac|wma|amr|3gp)$/i;
    const hasKnownExtension = file.name.match(commonExtensions);
    
    // Accept if it's audio/video MIME type OR has known extension OR no MIME type provided
    const isValidType = isAudioOrVideo || hasKnownExtension || !file.type;
    
    if (!isValidType) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an audio or video file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 100MB for video, 25MB for audio)
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: file.type.startsWith('video/') 
          ? 'Video file must be less than 100MB' 
          : 'Audio file must be less than 25MB',
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

      // Determine media type based on file type
      const mediaType = file.type.startsWith('video/') ? 'video' : 'audio';
      
      // Save to database
      const { error: insertError } = await supabase
        .from('meeting_media')
        .insert({
          meeting_id: meetingId,
          uploaded_by: user.id,
          file_url: publicUrl,
          media_type: mediaType,
          format: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          checksum,
        });

      if (insertError) throw insertError;

      setLatestAudioUrl(publicUrl);
      
      toast({
        title: 'Upload Complete',
        description: `${mediaType === 'video' ? 'Video' : 'Audio'} file uploaded successfully. Click "Process Audio" to transcribe.`,
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

  const saveTranscription = async () => {
    try {
      setIsSavingTranscription(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update the transcription in the database
      const { error } = await supabase
        .from('transcriptions')
        .update({
          content: editableTranscription,
          timestamp: new Date().toISOString(),
        })
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) throw error;

      setTranscription(editableTranscription);
      setIsEditingTranscription(false);

      toast({
        title: 'Transcription Updated',
        description: 'Your changes have been saved successfully',
      });

      checkExistingData();
    } catch (error: any) {
      console.error('Error saving transcription:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save transcription changes',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTranscription(false);
    }
  };

  const handleOpenMinutesEditor = () => {
    navigate(`/minutes/${meetingId}`);
  };

  const handleAudioUpload = async () => {
    if (!latestAudioUrl) {
      toast({
        title: 'No Media',
        description: 'Please upload an audio or video file first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentStep('transcribing');
      setProgress(20);

      // Fetch the media file
      const response = await fetch(latestAudioUrl);
      const mediaBlob = await response.blob();
      
      // Check if it's a video file
      const isVideo = mediaBlob.type.startsWith('video/');
      
      if (isVideo) {
        toast({
          title: 'Video Processing',
          description: 'Extracting audio from video file...',
        });
      }
      
      // Convert to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(mediaBlob);
      });

      setProgress(40);

      // Transcribe audio (edge function will handle audio extraction from video)
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioBase64: base64Audio,
          meetingId,
          language: 'auto',
          contentType: mediaBlob.type,
          isVideo: isVideo,
        },
      });

      if (transcriptError) throw transcriptError;

      setTranscription(transcriptData.transcription);
      setEditableTranscription(transcriptData.transcription);
      setProgress(60);
      
      toast({
        title: 'Transcription Complete',
        description: isVideo ? 'Video audio has been transcribed successfully' : 'Audio has been transcribed successfully',
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
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to process media file';
      
      if (error.message?.includes('quota') || error.message?.includes('402')) {
        errorMessage = 'AI quota exceeded. Please check your API settings or try again later.';
      } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message?.includes('file size')) {
        errorMessage = 'File is too large. Please use a smaller file (max 100MB for video, 25MB for audio).';
      }
      
      toast({
        title: 'Processing Failed',
        description: errorMessage,
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
              <CardTitle>Upload Audio/Video File</CardTitle>
              <CardDescription>
                Upload media files (MP4, MOV, WEBM, MP3, WAV, M4A - max 100MB). 
                For video files, audio will be automatically extracted for transcription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
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
                      <p className="font-medium">Media Ready</p>
                      <p className="text-sm text-muted-foreground">
                        Click to process and generate minutes
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleAudioUpload}>
                    Process Media
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
              <div className="flex items-center gap-2">
                <Badge variant="success">Complete</Badge>
                {!isEditingTranscription ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingTranscription(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditableTranscription(transcription);
                        setIsEditingTranscription(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveTranscription}
                      disabled={isSavingTranscription}
                    >
                      {isSavingTranscription ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingTranscription ? (
              <Textarea
                value={editableTranscription}
                onChange={(e) => setEditableTranscription(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Edit transcription..."
              />
            ) : (
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <p className="text-sm whitespace-pre-wrap">{transcription}</p>
              </ScrollArea>
            )}
            
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
              <div className="flex items-center gap-2">
                <Badge variant="success">Generated</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenMinutesEditor}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Edit & Sign Off
                </Button>
              </div>
            </div>
            <CardDescription>
              Open the full editor to edit, submit for approval, and sign off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {normalizeAIMarkdown(minutes)}
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

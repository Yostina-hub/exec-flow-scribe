import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Notebook {
  id: string;
  title: string;
  description: string;
}

interface Executive {
  id: string;
  full_name: string;
  email: string;
}

export function SecretaryDocumentSubmission() {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>('');
  const [selectedExecutive, setSelectedExecutive] = useState<string>('');
  const [priorityLevel, setPriorityLevel] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [secretaryNotes, setSecretaryNotes] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, [user?.id]);

  const loadInitialData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load notebooks
      const { data: notebooksData, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id, title, description')
        .order('created_at', { ascending: false });

      if (notebooksError) throw notebooksError;
      setNotebooks(notebooksData || []);

      // Load executives (users with CEO, Chief of Staff, or Admin roles)
      const { data: executivesData, error: executivesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles!inner(
            role_id,
            roles!inner(
              name
            )
          )
        `)
        .in('user_roles.roles.name', ['CEO', 'Chief of Staff', 'Admin']);

      if (executivesError) throw executivesError;
      
      // Deduplicate executives
      const uniqueExecs = Array.from(
        new Map(executivesData?.map((exec: any) => [exec.id, exec])).values()
      ) as Executive[];
      
      setExecutives(uniqueExecs);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      if (!documentTitle) {
        setDocumentTitle(file.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNotebook || !selectedExecutive) {
      toast.error('Please select a notebook and executive');
      return;
    }

    if (!documentTitle || (!documentFile && !documentUrl)) {
      toast.error('Please provide a document title and either upload a file or enter a URL');
      return;
    }

    setSubmitting(true);

    try {
      let finalUrl = documentUrl;
      let contentType = 'url';

      // Upload file if provided
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('meeting-media')
          .upload(filePath, documentFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('meeting-media')
          .getPublicUrl(filePath);

        finalUrl = publicUrl;
        contentType = 'file';
      }

      // Insert document source with secretary metadata
      const insertData: any = {
        notebook_id: selectedNotebook,
        title: documentTitle,
        source_type: contentType === 'file' ? 'file' : 'url',
        user_id: user?.id,
        secretary_notes: secretaryNotes,
        priority_level: priorityLevel,
        submitted_by: user?.id,
        submitted_for: selectedExecutive,
      };

      if (contentType === 'file') {
        insertData.file_url = finalUrl;
      } else {
        insertData.external_url = finalUrl;
      }

      const { data: sourceData, error: sourceError } = await supabase
        .from('notebook_sources')
        .insert([insertData])
        .select()
        .single();

      if (sourceError) throw sourceError;

      // Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke('auto-analyze-source', {
        body: { sourceId: sourceData.id }
      });

      if (analysisError) {
        console.error('Analysis trigger error:', analysisError);
        toast.warning('Document submitted but AI analysis may be delayed');
      }

      toast.success('Document submitted successfully to executive!');
      
      // Reset form
      setDocumentTitle('');
      setDocumentFile(null);
      setDocumentUrl('');
      setSecretaryNotes('');
      setPriorityLevel('medium');
      setSelectedNotebook('');
      setSelectedExecutive('');
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Error submitting document:', error);
      toast.error('Failed to submit document');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-3 w-3" />;
      case 'high': return <AlertCircle className="h-3 w-3" />;
      default: return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Submit Document to Executive</CardTitle>
            <CardDescription>
              Upload documents with priority levels and notes for executive review
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Executive Selection */}
          <div className="space-y-2">
            <Label htmlFor="executive">Submit To (Executive) *</Label>
            <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
              <SelectTrigger>
                <SelectValue placeholder="Select an executive" />
              </SelectTrigger>
              <SelectContent>
                {executives.map((exec) => (
                  <SelectItem key={exec.id} value={exec.id}>
                    {exec.full_name} ({exec.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notebook Selection */}
          <div className="space-y-2">
            <Label htmlFor="notebook">Notebook *</Label>
            <Select value={selectedNotebook} onValueChange={setSelectedNotebook}>
              <SelectTrigger>
                <SelectValue placeholder="Select a notebook" />
              </SelectTrigger>
              <SelectContent>
                {notebooks.map((notebook) => (
                  <SelectItem key={notebook.id} value={notebook.id}>
                    {notebook.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Level */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level *</Label>
            <Select value={priorityLevel} onValueChange={(value: any) => setPriorityLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>Urgent - Immediate attention required</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span>High - Important, review soon</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span>Medium - Regular review</span>
                  </div>
                </SelectItem>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>Low - Review when convenient</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Selected priority:</span>
              <Badge variant={getPriorityColor(priorityLevel)} className="gap-1">
                {getPriorityIcon(priorityLevel)}
                {priorityLevel.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Document Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="e.g., Budget Proposal Q1 2025"
              required
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload Document</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {documentFile ? documentFile.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, TXT, XLSX, PPT (MAX. 20MB)
                </p>
              </label>
            </div>
          </div>

          {/* OR URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Or Enter Document URL</Label>
            <Input
              id="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Secretary Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Secretary Notes</Label>
            <Textarea
              id="notes"
              value={secretaryNotes}
              onChange={(e) => setSecretaryNotes(e.target.value)}
              placeholder="Add context, background information, or specific items requiring attention..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes will be visible to the executive along with the AI analysis
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting & Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit to Executive
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

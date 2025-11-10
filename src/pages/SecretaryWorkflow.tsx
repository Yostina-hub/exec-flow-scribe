import { SecretaryDocumentSubmission } from '@/components/SecretaryDocumentSubmission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export default function SecretaryWorkflow() {
  const { user } = useAuth();

  // Fetch recent submissions
  const { data: recentSubmissions } = useQuery({
    queryKey: ['secretary-submissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notebook_sources')
        .select(`
          id,
          title,
          priority_level,
          secretary_notes,
          submission_date,
          submitted_for,
          profiles:submitted_for(full_name),
          notebooks(title)
        `)
        .eq('submitted_by', user?.id)
        .order('submission_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Secretary Document Workflow</h1>
        <p className="text-muted-foreground">
          Submit documents to executives with priority levels and context notes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Submission Form */}
        <div className="lg:col-span-2">
          <SecretaryDocumentSubmission />
        </div>

        {/* Recent Submissions Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Submissions</CardTitle>
              <CardDescription>Your latest document submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentSubmissions || recentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSubmissions.map((submission: any) => (
                    <Card key={submission.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {submission.title}
                            </h4>
                            <Badge
                              variant={getPriorityColor(submission.priority_level)}
                              className="gap-1 text-xs shrink-0"
                            >
                              {getPriorityIcon(submission.priority_level)}
                              {submission.priority_level?.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{submission.notebooks?.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>For: {submission.profiles?.full_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {submission.submission_date
                                  ? format(new Date(submission.submission_date), 'MMM d, h:mm a')
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>

                          {submission.secretary_notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-2 p-2 bg-muted rounded">
                              {submission.secretary_notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

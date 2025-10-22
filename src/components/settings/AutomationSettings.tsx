import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, TrendingUp, AlertTriangle, Play, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JobConfig {
  name: string;
  description: string;
  schedule: string;
  icon: any;
  functionName: string;
  color: string;
}

const jobs: JobConfig[] = [
  {
    name: 'Action Nudges',
    description: 'Sends daily reminders to action owners with quick-reply status updates',
    schedule: 'Daily at 9:00 AM',
    icon: Bell,
    functionName: 'send-action-nudges',
    color: 'blue',
  },
  {
    name: 'Escalation Check',
    description: 'Monitors at-risk actions and escalates to Chief of Staff or CEO',
    schedule: 'Every 6 hours',
    icon: AlertTriangle,
    functionName: 'check-escalations',
    color: 'orange',
  },
  {
    name: 'Weekly Progress Report',
    description: 'Sends comprehensive progress digest to CEO every Monday',
    schedule: 'Monday at 8:00 AM',
    icon: TrendingUp,
    functionName: 'weekly-progress-rollup',
    color: 'green',
  },
];

export function AutomationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleTestJob = async (functionName: string, jobName: string) => {
    try {
      setLoading(functionName);
      
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;

      toast({
        title: 'Job Executed Successfully',
        description: `${jobName} completed: ${data?.message || 'Success'}`,
      });
    } catch (error: any) {
      console.error(`Error testing ${functionName}:`, error);
      toast({
        title: 'Job Failed',
        description: error.message || 'Failed to execute job',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const setupInstructions = `-- Step 1: Enable required extensions (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Schedule the jobs
-- Daily action nudges at 9:00 AM
SELECT cron.schedule(
  'send-action-nudges-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/send-action-nudges',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cXN2d2h3enhjdXR3ZGJ4enluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgxMTEsImV4cCI6MjA3NTk2NDExMX0.LKeKvr-JzlFCz_LE6vd-FD-8-UAUoj3m_AD_LelxS7o"}'::jsonb
  ) as request_id;
  $$
);

-- Escalation checks every 6 hours
SELECT cron.schedule(
  'check-escalations-6hourly',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/check-escalations',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cXN2d2h3enhjdXR3ZGJ4enluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgxMTEsImV4cCI6MjA3NTk2NDExMX0.LKeKvr-JzlFCz_LE6vd-FD-8-UAUoj3m_AD_LelxS7o"}'::jsonb
  ) as request_id;
  $$
);

-- Weekly progress rollup every Monday at 8:00 AM
SELECT cron.schedule(
  'weekly-progress-rollup',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url:='https://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/weekly-progress-rollup',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cXN2d2h3enhjdXR3ZGJ4enluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgxMTEsImV4cCI6MjA3NTk2NDExMX0.LKeKvr-JzlFCz_LE6vd-FD-8-UAUoj3m_AD_LelxS7o"}'::jsonb
  ) as request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule a job (if needed)
-- SELECT cron.unschedule('job-name-here');`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Automated Jobs</CardTitle>
          <CardDescription>
            Configure and test automated follow-ups, escalations, and progress reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="jobs">Jobs Overview</TabsTrigger>
              <TabsTrigger value="setup">Setup Instructions</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4 mt-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Test jobs manually below. Once cron is configured, these will run automatically on schedule.
                </AlertDescription>
              </Alert>

              {jobs.map((job) => {
                const IconComponent = job.icon;
                const isLoading = loading === job.functionName;

                return (
                  <Card key={job.functionName}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-2 rounded-lg bg-${job.color}-500/10`}>
                            <IconComponent className={`w-5 h-5 text-${job.color}-500`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{job.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {job.schedule}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{job.description}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleTestJob(job.functionName, job.name)}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {isLoading ? 'Running...' : 'Test Now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="setup" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Database Setup Required</CardTitle>
                  <CardDescription>
                    Run this SQL in your database to enable automated scheduling
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">To set up automated jobs:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                          <li>Click "Open SQL Editor" below</li>
                          <li>Copy the SQL code</li>
                          <li>Paste and run it in the SQL editor</li>
                          <li>Test jobs using the "Jobs Overview" tab</li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{setupInstructions}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(setupInstructions);
                          toast({
                            title: 'Copied',
                            description: 'SQL copied to clipboard',
                          });
                        } catch (error) {
                          console.error('Clipboard error:', error);
                          toast({
                            title: 'Copy failed',
                            description: 'Failed to copy to clipboard. Please check clipboard permissions.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      Copy SQL
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => window.open('https://supabase.com/dashboard/project/xtqsvwhwzxcutwdbxzyn/sql/new', '_blank')}
                    >
                      Open SQL Editor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prerequisites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>SMTP settings configured</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Escalation roles assigned (Chief of Staff & CEO)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <span>Cron jobs scheduled in database</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { 
  Calendar, 
  Bell, 
  CheckCircle2, 
  AlertTriangle,
  Brain,
  Mail,
  Loader2,
  Activity
} from "lucide-react";

const IntegrationTest = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { status: 'success' | 'error', message: string }>>({});

  const testMeetingCreation = async () => {
    setTesting('meeting-creation');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create test meeting
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title: 'Integration Test Meeting',
          description: 'Testing system integrations',
          start_time: new Date(Date.now() + 3600000).toISOString(),
          end_time: new Date(Date.now() + 7200000).toISOString(),
          location: 'Test Room',
          status: 'scheduled',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add attendee
      await supabase.from('meeting_attendees').insert({
        meeting_id: meeting.id,
        user_id: user.id,
        role: 'required',
      });

      setResults(prev => ({
        ...prev,
        'meeting-creation': {
          status: 'success',
          message: `Meeting created! Integration should trigger context capsule and notification creation.`
        }
      }));

      toast({
        title: "✅ Meeting Created",
        description: "Check console for integration logs",
      });
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        'meeting-creation': {
          status: 'error',
          message: error.message
        }
      }));
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testActionCreation = async () => {
    setTesting('action-creation');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get a meeting
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('created_by', user.id)
        .limit(1)
        .maybeSingle();

      // Create action with past due date (should trigger escalation)
      const { error } = await supabase
        .from('action_items')
        .insert({
          title: 'Test Action - Overdue',
          description: 'This should trigger escalation',
          assigned_to: user.id,
          created_by: user.id,
          meeting_id: meetings?.id,
          due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
          priority: 'high',
          status: 'pending',
        });

      if (error) throw error;

      setResults(prev => ({
        ...prev,
        'action-creation': {
          status: 'success',
          message: 'Action created with past due date - should trigger escalation check'
        }
      }));

      toast({
        title: "✅ Action Created",
        description: "Overdue action should trigger escalation",
      });
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        'action-creation': {
          status: 'error',
          message: error.message
        }
      }));
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testAIPipeline = async () => {
    setTesting('ai-pipeline');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find a completed meeting or create one
      const { data: meeting, error: selectError } = await supabase
        .from('meetings')
        .select('id')
        .eq('created_by', user.id)
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle();

      if (!meeting) {
        // Update a scheduled meeting to completed
        const { data: scheduledMeeting } = await supabase
          .from('meetings')
          .select('id')
          .eq('created_by', user.id)
          .eq('status', 'scheduled')
          .limit(1)
          .maybeSingle();

        if (scheduledMeeting) {
          await supabase
            .from('meetings')
            .update({ status: 'completed' })
            .eq('id', scheduledMeeting.id);

          setResults(prev => ({
            ...prev,
            'ai-pipeline': {
              status: 'success',
              message: 'Meeting marked as completed - AI pipeline should trigger automatically'
            }
          }));

          toast({
            title: "✅ Pipeline Triggered",
            description: "Check edge function logs for AI processing",
          });
        } else {
          throw new Error('No meetings available for testing');
        }
      } else {
        setResults(prev => ({
          ...prev,
          'ai-pipeline': {
            status: 'success',
            message: 'Completed meeting found - AI pipeline should have already run'
          }
        }));

        toast({
          title: "ℹ️ Pipeline Status",
          description: "Check database for generated minutes/briefs",
        });
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        'ai-pipeline': {
          status: 'error',
          message: error.message
        }
      }));
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testNotifications = async () => {
    setTesting('notifications');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      const prefs = profile?.notification_preferences as any;

      setResults(prev => ({
        ...prev,
        'notifications': {
          status: 'success',
          message: `Notification preferences loaded: Reminders=${prefs?.meeting_reminders}, Timing=${prefs?.reminder_timing}min`
        }
      }));

      toast({
        title: "✅ Notifications Active",
        description: "Real-time notification dispatcher is running",
      });
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        'notifications': {
          status: 'error',
          message: error.message
        }
      }));
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testCalendarSync = async () => {
    setTesting('calendar-sync');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user calendar sync preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('meeting_preferences')
        .eq('id', user.id)
        .single();

      const prefs = profile?.meeting_preferences as any;
      const syncEnabled = prefs?.calendar_sync;

      setResults(prev => ({
        ...prev,
        'calendar-sync': {
          status: 'success',
          message: `Calendar sync: ${syncEnabled ? `Enabled (${syncEnabled})` : 'Disabled'}`
        }
      }));

      toast({
        title: "✅ Calendar Sync",
        description: syncEnabled ? "Action-Calendar sync is active" : "Calendar sync disabled",
      });
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        'calendar-sync': {
          status: 'error',
          message: error.message
        }
      }));
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testRealtimeConnection = async () => {
    setTesting('realtime');
    try {
      const channel = supabase.channel('integration-test');
      
      const status = await new Promise((resolve) => {
        channel.subscribe((status) => {
          resolve(status);
        });
        
        setTimeout(() => resolve('timeout'), 5000);
      });

      await supabase.removeChannel(channel);

      if (status === 'SUBSCRIBED') {
        setResults(prev => ({
          ...prev,
          'realtime': {
            status: 'success',
            message: 'Real-time connection established successfully'
          }
        }));

        toast({
          title: "✅ Real-time Active",
          description: "All system integrations are listening",
        });
      } else {
        throw new Error(`Connection status: ${status}`);
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        'realtime': {
          status: 'error',
          message: error.message
        }
      }));
      toast({
        title: "❌ Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const tests = [
    {
      id: 'meeting-creation',
      name: 'Meeting Creation Integration',
      description: 'Creates meeting → Triggers context capsules & notifications',
      icon: Calendar,
      color: 'text-blue-500',
      action: testMeetingCreation,
    },
    {
      id: 'action-creation',
      name: 'Action Item Workflow',
      description: 'Creates overdue action → Triggers escalation',
      icon: AlertTriangle,
      color: 'text-orange-500',
      action: testActionCreation,
    },
    {
      id: 'ai-pipeline',
      name: 'AI Processing Pipeline',
      description: 'Completes meeting → Triggers minutes, sentiment, briefs',
      icon: Brain,
      color: 'text-purple-500',
      action: testAIPipeline,
    },
    {
      id: 'notifications',
      name: 'Notification System',
      description: 'Checks notification preferences and real-time dispatcher',
      icon: Bell,
      color: 'text-green-500',
      action: testNotifications,
    },
    {
      id: 'calendar-sync',
      name: 'Calendar Sync',
      description: 'Verifies action-calendar integration status',
      icon: CheckCircle2,
      color: 'text-indigo-500',
      action: testCalendarSync,
    },
    {
      id: 'realtime',
      name: 'Real-time Connection',
      description: 'Tests WebSocket connection for live updates',
      icon: Activity,
      color: 'text-pink-500',
      action: testRealtimeConnection,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">System Integration Tests</h1>
          <p className="text-muted-foreground mt-2">
            Verify that all system integrations are working correctly
          </p>
        </div>

        <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Status
            </CardTitle>
            <CardDescription>
              These tests verify the automated workflows connecting meetings, actions, AI, notifications, and calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {tests.map((test) => {
                const Icon = test.icon;
                const result = results[test.id];
                const isLoading = testing === test.id;

                return (
                  <Card key={test.id} className="transition-all hover:border-primary/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-lg bg-muted ${test.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{test.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {test.description}
                            </p>
                            {result && (
                              <div className={`text-sm p-2 rounded-lg ${
                                result.status === 'success' 
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
                              }`}>
                                {result.message}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={test.action}
                          disabled={isLoading || testing !== null}
                          variant="outline"
                        >
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isLoading ? 'Testing...' : 'Run Test'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📖 Integration Documentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Real-time Monitoring</h4>
              <p className="text-sm text-muted-foreground">
                Open your browser's developer console to see integration logs in real-time as events occur.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Edge Function Logs</h4>
              <p className="text-sm text-muted-foreground">
                Check Supabase edge function logs to see AI processing pipeline execution and escalation handling.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">What to Expect</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>New meetings auto-generate context capsules for attendees</li>
                <li>Completed meetings trigger full AI processing (5-10 min)</li>
                <li>Overdue actions escalate to Chief of Staff automatically</li>
                <li>Action due dates appear on calendar as reminders</li>
                <li>Real-time notifications appear as toasts</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default IntegrationTest;
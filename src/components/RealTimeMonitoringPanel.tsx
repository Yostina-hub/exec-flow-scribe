import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Users, Mic, Video, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemStatus {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
}

export const RealTimeMonitoringPanel = () => {
  const [activeMeetings, setActiveMeetings] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([
    { service: 'Transcription', status: 'operational', latency: 120 },
    { service: 'AI Processing', status: 'operational', latency: 250 },
    { service: 'Video Conference', status: 'operational', latency: 80 },
    { service: 'Database', status: 'operational', latency: 45 }
  ]);

  useEffect(() => {
    loadActiveMeetings();
    const interval = setInterval(loadActiveMeetings, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveMeetings = async () => {
    const now = new Date();
    const { data } = await supabase
      .from('meetings')
      .select('*, meeting_attendees(count)')
      .gte('end_time', now.toISOString())
      .lte('start_time', now.toISOString())
      .eq('status', 'in_progress')
      .limit(5);

    setActiveMeetings(data || []);
  };

  return (
    <div className="space-y-4">
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-background">
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity className="h-5 w-5 text-primary" />
            </motion.div>
            Real-Time System Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* System Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">System Health</h3>
            <div className="grid grid-cols-2 gap-2">
              {systemStatus.map((item) => (
                <div key={item.service} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {item.status === 'operational' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">{item.service}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.latency}ms
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Active Meetings */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Active Meetings
              <Badge variant="secondary">{activeMeetings.length}</Badge>
            </h3>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {activeMeetings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active meetings</p>
                  </div>
                ) : (
                  activeMeetings.map((meeting) => (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.meeting_attendees?.[0]?.count || 0}
                            </Badge>
                            <Badge variant="default" className="text-xs gap-1">
                              <Activity className="h-3 w-3 animate-pulse" />
                              Live
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

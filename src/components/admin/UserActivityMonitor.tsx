import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Activity, Search, User, Calendar, CheckSquare, LogIn } from "lucide-react";
import { format } from "date-fns";

interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_details: any;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export function UserActivityMonitor() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchActivities();

    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("user_activity" as any)
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setActivities((data as any) || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meeting_created':
        return <Calendar className="h-4 w-4" />;
      case 'action_status_changed':
        return <CheckSquare className="h-4 w-4" />;
      case 'login':
        return <LogIn className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'meeting_created':
        return <Badge variant="default">Meeting</Badge>;
      case 'action_status_changed':
        return <Badge variant="secondary">Action</Badge>;
      case 'login':
        return <Badge variant="outline">Auth</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredActivities = activities.filter((activity) =>
    activity.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          User Activity Monitor
        </CardTitle>
        <CardDescription>
          Real-time tracking of user actions and system events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading activities...
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {activity.profiles?.full_name || 'Unknown User'}
                        </span>
                        {getActivityBadge(activity.activity_type)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.activity_type.replace('_', ' ')}
                        {activity.activity_details?.title && 
                          `: ${activity.activity_details.title}`}
                        {activity.activity_details?.old_status && 
                          ` (${activity.activity_details.old_status} → ${activity.activity_details.new_status})`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

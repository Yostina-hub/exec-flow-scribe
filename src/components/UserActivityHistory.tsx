import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  UserPlus,
  Shield,
  ShieldOff,
  KeyRound,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  changed_by: string | null;
  activity_type: string;
  changes: Record<string, any>;
  created_at: string;
  user_profile: {
    full_name: string | null;
    email: string | null;
  };
  changer_profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface UserActivityHistoryProps {
  userId?: string;
  limit?: number;
}

export function UserActivityHistory({ userId, limit = 50 }: UserActivityHistoryProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("user_activity_log")
        .select(`
          id,
          user_id,
          changed_by,
          activity_type,
          changes,
          created_at,
          user_profile:profiles!user_activity_log_user_id_fkey(full_name, email),
          changer_profile:profiles!user_activity_log_changed_by_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data as any || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_created":
        return <UserPlus className="h-4 w-4" />;
      case "role_added":
        return <Shield className="h-4 w-4" />;
      case "role_removed":
        return <ShieldOff className="h-4 w-4" />;
      case "password_reset":
        return <KeyRound className="h-4 w-4" />;
      case "profile_updated":
        return <Pencil className="h-4 w-4" />;
      case "user_deleted":
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "user_created":
        return "default";
      case "role_added":
        return "default";
      case "role_removed":
        return "secondary";
      case "password_reset":
        return "outline";
      case "profile_updated":
        return "outline";
      case "user_deleted":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatActivityType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatChanges = (type: string, changes: Record<string, any>) => {
    switch (type) {
      case "user_created":
        return `Created user account`;
      case "role_added":
        return `Added role: ${changes.role_name || "Unknown"}`;
      case "role_removed":
        return `Removed role: ${changes.role_name || "Unknown"}`;
      case "password_reset":
        return "Reset user password";
      case "profile_updated":
        const updates = [];
        if (changes.full_name) updates.push("name");
        if (changes.email) updates.push("email");
        return `Updated ${updates.join(", ")}`;
      case "user_deleted":
        return "Deleted user account";
      default:
        return "Activity recorded";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
        <CardDescription>
          {userId
            ? "Recent activity for this user"
            : "Recent user management activities"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading activity history...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded yet
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b last:border-0"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10">
                      {getActivityIcon(activity.activity_type)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActivityColor(activity.activity_type) as any}>
                        {formatActivityType(activity.activity_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <p className="text-sm">
                      <span className="font-medium">
                        {activity.user_profile.full_name ||
                          activity.user_profile.email}
                      </span>
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {formatChanges(activity.activity_type, activity.changes)}
                    </p>

                    {activity.changer_profile && (
                      <p className="text-xs text-muted-foreground">
                        by{" "}
                        {activity.changer_profile.full_name ||
                          activity.changer_profile.email}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

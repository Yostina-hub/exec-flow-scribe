import { supabase } from "@/integrations/supabase/client";

export type ActivityType = 
  | "user_created"
  | "role_added"
  | "role_removed"
  | "password_reset"
  | "profile_updated"
  | "user_deleted";

interface LogActivityParams {
  userId: string;
  activityType: ActivityType;
  changes: Record<string, any>;
  changedBy?: string;
}

export async function logUserActivity({
  userId,
  activityType,
  changes,
  changedBy,
}: LogActivityParams) {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("user_activity_log")
      .insert({
        user_id: userId,
        changed_by: changedBy || currentUser?.id,
        activity_type: activityType,
        changes: changes,
      });

    if (error) {
      console.error("Failed to log user activity:", error);
    }
  } catch (error) {
    console.error("Error logging user activity:", error);
  }
}

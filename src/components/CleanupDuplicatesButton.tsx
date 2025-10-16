import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";

export const CleanupDuplicatesButton = () => {
  const [isCleaning, setIsCleaning] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    const confirmCleanup = window.confirm(
      "This will delete duplicate meetings. Are you sure?"
    );
    
    if (!confirmCleanup) return;
    
    setIsCleaning(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      // Get all meetings created in the last hour
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, start_time')
        .eq('created_by', user.id)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('title')
        .order('start_time')
        .order('created_at');

      if (!meetings || meetings.length === 0) {
        toast({
          title: "No Recent Meetings",
          description: "No recent meetings found to clean up",
        });
        return;
      }

      // Group by title and start_time
      const grouped: Record<string, string[]> = {};
      meetings.forEach(meeting => {
        const key = `${meeting.title}-${meeting.start_time}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(meeting.id);
      });

      // Keep the first one of each group, delete the rest
      const idsToDelete: string[] = [];
      Object.values(grouped).forEach(ids => {
        if (ids.length > 1) {
          idsToDelete.push(...ids.slice(1)); // Keep first, delete rest
        }
      });

      if (idsToDelete.length === 0) {
        toast({
          title: "No Duplicates Found",
          description: "No duplicate meetings to clean up",
        });
        return;
      }

      // Delete duplicates
      const { error } = await supabase
        .from('meetings')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: `Removed ${idsToDelete.length} duplicate meetings`,
      });

      // Refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : "Failed to clean up duplicates",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Button
      onClick={handleCleanup}
      disabled={isCleaning}
      variant="destructive"
      className="gap-2"
    >
      {isCleaning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Cleaning...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Clean Up Duplicates
        </>
      )}
    </Button>
  );
};


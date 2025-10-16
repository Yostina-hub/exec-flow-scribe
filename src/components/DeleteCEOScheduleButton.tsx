import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";

export const DeleteCEOScheduleButton = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "This will delete ALL CEO schedule meetings (Project Horizon, Revenue Councils, Executive 1:1s, etc.). Are you sure?"
    );
    
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    
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

      // List of all CEO schedule meeting titles
      const scheduleTitles = [
        'Project Horizon Board Meeting',
        'Meeting with KIDI',
        'Revenue Council: Misge',
        'Revenue Council: Yale',
        'Meeting with All Councils Chairs',
        'Meeting with YALE',
        'Meeting with TITI',
        'Meeting with MULE',
        'Revenue Council: Sam',
        'Meeting with Elton',
        'Meeting with BINI',
        'Revenue Council: Mule',
        'Meeting with MISGE',
        'Ermias - Road',
        'Meeting with TTI',
        'Revenue Council: Misge',
        'Meeting with SAM',
        'Meeting with KEBI',
        'Revenue Council: Kebi',
        '20 Project owners & 7 Councils Chairs Evaluation Meeting'
      ];

      // Delete all meetings with these titles
      const { data: deletedMeetings, error } = await supabase
        .from('meetings')
        .delete()
        .eq('created_by', user.id)
        .in('title', scheduleTitles)
        .select('id');

      if (error) throw error;

      const count = deletedMeetings?.length || 0;

      toast({
        title: "Schedule Deleted",
        description: `Removed ${count} CEO schedule meetings. You can now import fresh.`,
      });

      // Refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete schedule",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={isDeleting}
      variant="destructive"
      className="gap-2"
    >
      {isDeleting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Deleting...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Delete CEO Schedule
        </>
      )}
    </Button>
  );
};

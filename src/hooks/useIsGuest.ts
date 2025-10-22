import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GuestStatus {
  isGuest: boolean;
  guestName: string | null;
  loading: boolean;
}

/**
 * Hook to check if the current user is a guest
 * Checks user_roles table for Guest role assignment
 */
export function useIsGuest(meetingId?: string): GuestStatus {
  const [guestStatus, setGuestStatus] = useState<GuestStatus>({
    isGuest: false,
    guestName: null,
    loading: true,
  });

  useEffect(() => {
    const checkGuestStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setGuestStatus({ isGuest: false, guestName: null, loading: false });
          return;
        }

        // Check if user has Guest role using the database function
        const { data: isGuestRole, error: roleError } = await supabase.rpc('is_guest', {
          _user_id: user.id
        });

        if (roleError) {
          console.error("Error checking guest role:", roleError);
          setGuestStatus({ isGuest: false, guestName: null, loading: false });
          return;
        }

        // If checking for specific meeting, also verify guest has access
        if (meetingId && isGuestRole) {
          const { data: guestAccess } = await supabase
            .from('guest_access_requests')
            .select('full_name')
            .eq('user_id', user.id)
            .eq('meeting_id', meetingId)
            .eq('status', 'approved')
            .maybeSingle();

          setGuestStatus({
            isGuest: !!guestAccess,
            guestName: guestAccess?.full_name || null,
            loading: false,
          });
        } else {
          // Not checking specific meeting, just return guest role status
          // Get guest name from any approved access request
          const { data: guestAccess } = await supabase
            .from('guest_access_requests')
            .select('full_name')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle();

          setGuestStatus({
            isGuest: !!isGuestRole,
            guestName: guestAccess?.full_name || null,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Error checking guest status:", error);
        setGuestStatus({ isGuest: false, guestName: null, loading: false });
      }
    };

    checkGuestStatus();
  }, [meetingId]);

  return guestStatus;
}

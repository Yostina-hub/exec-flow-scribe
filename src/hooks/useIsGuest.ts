import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GuestStatus {
  isGuest: boolean;
  guestName: string | null;
  loading: boolean;
}

/**
 * Hook to check if the current user is a guest
 * Checks guest_access_requests table for approved guest access
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

        // Check if user has any approved guest access (for any meeting or specific one)
        let query = supabase
          .from('guest_access_requests')
          .select('status, full_name')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        if (meetingId) {
          query = query.eq('meeting_id', meetingId);
        }

        const { data: guestAccess } = await query.maybeSingle();

        setGuestStatus({
          isGuest: !!guestAccess,
          guestName: guestAccess?.full_name || null,
          loading: false,
        });
      } catch (error) {
        console.error("Error checking guest status:", error);
        setGuestStatus({ isGuest: false, guestName: null, loading: false });
      }
    };

    checkGuestStatus();
  }, [meetingId]);

  return guestStatus;
}

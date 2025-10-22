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
          .select('full_name', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (meetingId) {
          query = query.eq('meeting_id', meetingId);
        }

        const { data, count, error } = await query;
        if (error) {
          console.error('useIsGuest query error:', error);
        }

        const first = Array.isArray(data) && data.length > 0 ? data[0] as any : null;

        setGuestStatus({
          isGuest: !!(count && count > 0) || !!first,
          guestName: first?.full_name || null,
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

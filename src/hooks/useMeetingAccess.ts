import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MeetingAccessResult {
  hasAccess: boolean;
  isSeniorRole: boolean;
  canAccessRecordings: boolean;
  canAccessTranscriptions: boolean;
  canUseAITools: boolean;
  canViewAnalytics: boolean;
  canManageDocuments: boolean;
  loading: boolean;
}

/**
 * Hook to check user's access permissions for a specific meeting
 * Implements time-based access control and element-level permissions
 */
export function useMeetingAccess(meetingId: string | undefined): MeetingAccessResult {
  const [accessData, setAccessData] = useState<MeetingAccessResult>({
    hasAccess: false,
    isSeniorRole: false,
    canAccessRecordings: false,
    canAccessTranscriptions: false,
    canUseAITools: false,
    canViewAnalytics: false,
    canManageDocuments: false,
    loading: true,
  });

  useEffect(() => {
    if (!meetingId) {
      setAccessData(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAccessData(prev => ({ ...prev, loading: false }));
          return;
        }

        // Check if user has senior role
        const { data: isSenior } = await supabase.rpc("is_senior_role" as any, {
          _user_id: user.id,
        }) as { data: boolean | null };

        // Check time-based access
        const { data: hasTimeAccess } = await supabase.rpc("has_time_based_access" as any, {
          _user_id: user.id,
          _meeting_id: meetingId,
        }) as { data: boolean | null };

        // Check element-level permissions
        const { data: canRecordings } = await supabase.rpc("can_access_element" as any, {
          _user_id: user.id,
          _meeting_id: meetingId,
          _element_type: "recordings",
        }) as { data: boolean | null };

        const { data: canTranscriptions } = await supabase.rpc("can_access_element" as any, {
          _user_id: user.id,
          _meeting_id: meetingId,
          _element_type: "transcriptions",
        }) as { data: boolean | null };

        const { data: canAI } = await supabase.rpc("can_access_element" as any, {
          _user_id: user.id,
          _meeting_id: meetingId,
          _element_type: "ai_tools",
        }) as { data: boolean | null };

        const { data: canAnalytics } = await supabase.rpc("can_access_element" as any, {
          _user_id: user.id,
          _meeting_id: meetingId,
          _element_type: "analytics",
        }) as { data: boolean | null };

        const { data: canDocs } = await supabase.rpc("can_access_element" as any, {
          _user_id: user.id,
          _meeting_id: meetingId,
          _element_type: "documents",
        }) as { data: boolean | null };

        setAccessData({
          hasAccess: hasTimeAccess || false,
          isSeniorRole: isSenior || false,
          canAccessRecordings: canRecordings || false,
          canAccessTranscriptions: canTranscriptions || false,
          canUseAITools: canAI || false,
          canViewAnalytics: canAnalytics || false,
          canManageDocuments: canDocs || false,
          loading: false,
        });
      } catch (error) {
        console.error("Error checking meeting access:", error);
        setAccessData(prev => ({ ...prev, loading: false }));
      }
    };

    checkAccess();
  }, [meetingId]);

  return accessData;
}

/**
 * Hook to check if current user has a senior role
 */
export function useIsSeniorRole(): { isSeniorRole: boolean; loading: boolean } {
  const [state, setState] = useState({ isSeniorRole: false, loading: true });

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setState({ isSeniorRole: false, loading: false });
          return;
        }

        const { data } = await supabase.rpc("is_senior_role" as any, {
          _user_id: user.id,
        }) as { data: boolean | null };

        setState({ isSeniorRole: data || false, loading: false });
      } catch (error) {
        console.error("Error checking senior role:", error);
        setState({ isSeniorRole: false, loading: false });
      }
    };

    checkRole();
  }, []);

  return state;
}

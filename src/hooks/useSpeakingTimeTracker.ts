import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSpeakingTimeTrackerProps {
  meetingId: string;
  userId: string;
  isSpeaking: boolean;
}

export function useSpeakingTimeTracker({
  meetingId,
  userId,
  isSpeaking,
}: UseSpeakingTimeTrackerProps) {
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSpeaking) {
      // Start tracking
      startTimeRef.current = Date.now();

      // Update speaking duration every second
      intervalRef.current = setInterval(async () => {
        if (startTimeRef.current) {
          const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

          // Update the attendee's speaking duration
          const { error } = await supabase
            .from("meeting_attendees")
            .update({
              speaking_duration_seconds: elapsedSeconds,
              last_spoke_at: new Date().toISOString(),
            })
            .eq("meeting_id", meetingId)
            .eq("user_id", userId);

          if (error) {
            console.error("Error updating speaking duration:", error);
          }
        }
      }, 1000);
    } else {
      // Stop tracking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Save final speaking duration
      if (startTimeRef.current) {
        const finalElapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

        (async () => {
          try {
            const { data } = await supabase
              .from("meeting_attendees")
              .select("speaking_duration_seconds")
              .eq("meeting_id", meetingId)
              .eq("user_id", userId)
              .single();

            const currentDuration = data?.speaking_duration_seconds || 0;
            const newTotalDuration = currentDuration + finalElapsedSeconds;

            await supabase
              .from("meeting_attendees")
              .update({
                speaking_duration_seconds: newTotalDuration,
                last_spoke_at: new Date().toISOString(),
              })
              .eq("meeting_id", meetingId)
              .eq("user_id", userId);
          } catch (error) {
            console.error("Error saving final speaking duration:", error);
          }
        })();

        startTimeRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSpeaking, meetingId, userId]);
}

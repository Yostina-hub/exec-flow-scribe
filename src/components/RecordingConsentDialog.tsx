import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Video } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecordingConsentDialogProps {
  meetingId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordingConsentDialog({
  meetingId,
  userId,
  open,
  onOpenChange,
}: RecordingConsentDialogProps) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      checkExistingConsent();
    }
  }, [open, meetingId, userId]);

  const checkExistingConsent = async () => {
    const { data, error } = await supabase
      .from("recording_consents")
      .select("consent_given")
      .eq("meeting_id", meetingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.consent_given) {
      // User already gave consent, close dialog
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!consentGiven) {
      toast({
        variant: "destructive",
        title: "Consent Required",
        description: "You must provide consent to continue with this meeting.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("recording_consents").upsert({
        meeting_id: meetingId,
        user_id: userId,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_version: "1.0",
      });

      if (error) throw error;

      // Log audit trail
      await supabase.from("audit_logs").insert({
        user_id: userId,
        meeting_id: meetingId,
        action_type: "recording_consent_given",
        action_details: {
          consent_version: "1.0",
          timestamp: new Date().toISOString(),
        },
      });

      toast({
        title: "Consent Recorded",
        description: "Thank you. You may now join the meeting.",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error recording consent:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record consent. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast({
      title: "Meeting Access Denied",
      description:
        "You must provide recording consent to join this meeting. You will be redirected.",
    });

    // Redirect to meetings list after a short delay
    setTimeout(() => {
      window.location.href = "/meetings";
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Recording Consent Required
          </DialogTitle>
          <DialogDescription>
            This meeting may be recorded for documentation and quality purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              By proceeding, you acknowledge and consent to being recorded during this meeting.
              The recording may include:
            </AlertDescription>
          </Alert>

          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground pl-2">
            <li>Audio of your voice and contributions</li>
            <li>Video if you enable your camera</li>
            <li>Screen sharing content you present</li>
            <li>Chat messages and reactions</li>
            <li>Transcripts of spoken content</li>
          </ul>

          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">Your Rights:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You may withdraw consent by leaving the meeting</li>
              <li>Recordings are stored securely and access is restricted</li>
              <li>You can request deletion of your data (subject to legal requirements)</li>
              <li>Contact the meeting organizer for questions about data handling</li>
            </ul>
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
            />
            <Label
              htmlFor="consent"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I consent to being recorded and have read and understood the above information.
              I confirm that I am authorized to provide this consent.
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleDecline} disabled={isSubmitting}>
            Decline & Leave
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!consentGiven || isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

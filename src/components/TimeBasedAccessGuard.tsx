import { ReactNode } from "react";
import { useMeetingAccess } from "@/hooks/useMeetingAccess";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";

interface TimeBasedAccessGuardProps {
  meetingId: string;
  children: ReactNode;
}

/**
 * Guard component that enforces time-based access control
 * Participants can only access during meeting time window
 * Senior roles and hosts have unrestricted access
 */
export function TimeBasedAccessGuard({
  meetingId,
  children,
}: TimeBasedAccessGuardProps) {
  const access = useMeetingAccess(meetingId);

  if (access.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!access.hasAccess && !access.isSeniorRole && !access.isHost) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              You can only access this meeting during its scheduled time window.
            </p>
            <p className="text-sm text-muted-foreground">
              Access is available 30 minutes before the meeting starts and 30 minutes after it ends.
            </p>
          </AlertDescription>
        </Alert>
        
        <Alert className="mt-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            After the meeting ends, you'll be able to access your own recordings and transcriptions if available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

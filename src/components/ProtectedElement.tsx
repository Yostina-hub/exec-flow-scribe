import { ReactNode } from "react";
import { useMeetingAccess } from "@/hooks/useMeetingAccess";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface ProtectedElementProps {
  meetingId: string;
  elementType: "recordings" | "transcriptions" | "ai_tools" | "analytics" | "documents";
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * Component to protect UI elements based on user permissions
 * Hides or shows alternative content if user lacks access
 */
export function ProtectedElement({
  meetingId,
  elementType,
  children,
  fallback,
  showMessage = true,
}: ProtectedElementProps) {
  const access = useMeetingAccess(meetingId);

  if (access.loading) {
    return null;
  }

  // Check if user has access to this element
  let hasAccess = false;
  switch (elementType) {
    case "recordings":
      hasAccess = access.canAccessRecordings;
      break;
    case "transcriptions":
      hasAccess = access.canAccessTranscriptions;
      break;
    case "ai_tools":
      hasAccess = access.canUseAITools;
      break;
    case "analytics":
      hasAccess = access.canViewAnalytics;
      break;
    case "documents":
      hasAccess = access.canManageDocuments;
      break;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showMessage) {
      return (
        <Alert className="border-muted">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

export default ProtectedElement;

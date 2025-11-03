import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import React from "react";

interface IframePermissionNoticeProps {
  feature?: "microphone" | "camera";
}

export const IframePermissionNotice: React.FC<IframePermissionNoticeProps> = ({ feature = "microphone" }) => {
  const inIframe = typeof window !== "undefined" && window.top !== window;
  if (!inIframe) return null;

  const handleOpenNewTab = () => {
    const url = window.location.href;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Alert className="mb-4">
      <AlertTitle>Access to {feature} may be blocked in embedded preview</AlertTitle>
      <AlertDescription>
        Some browsers block {feature} access inside embedded iframes. Open this page in a new tab to enable {feature} permissions.
        <div className="mt-3">
          <Button onClick={handleOpenNewTab} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

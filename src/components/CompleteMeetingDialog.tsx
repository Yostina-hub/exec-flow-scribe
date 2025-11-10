import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from "lucide-react";

interface CompleteMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  meetingTitle?: string;
}

export const CompleteMeetingDialog = ({
  open,
  onOpenChange,
  onConfirm,
  meetingTitle,
}: CompleteMeetingDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <AlertDialogTitle className="text-xl">Complete Meeting?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-2">
            <p>
              You're about to mark <span className="font-semibold text-foreground">"{meetingTitle}"</span> as completed.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-foreground">This will:</p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Set the meeting status to "Completed"</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Record the actual end time</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Auto-generate minutes if transcription is available</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              You can still access the meeting details, transcriptions, and minutes after completion.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-success hover:bg-success/90"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Yes, Complete Meeting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

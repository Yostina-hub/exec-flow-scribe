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
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";

interface Role {
  id: string;
  name: string;
}

interface ConfirmRoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  rolesToAdd: Role[];
  rolesToRemove: Role[];
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmRoleChangeDialog({
  open,
  onOpenChange,
  userName,
  rolesToAdd,
  rolesToRemove,
  onConfirm,
  loading,
}: ConfirmRoleChangeDialogProps) {
  const hasChanges = rolesToAdd.length > 0 || rolesToRemove.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Role Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to change roles for <strong>{userName}</strong>. Please review the changes below:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {rolesToAdd.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <Plus className="h-4 w-4" />
                <span>Roles to Add ({rolesToAdd.length})</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {rolesToAdd.map((role) => (
                  <Badge key={role.id} variant="default" className="bg-green-600 hover:bg-green-700">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {rolesToRemove.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <Minus className="h-4 w-4" />
                <span>Roles to Remove ({rolesToRemove.length})</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {rolesToRemove.map((role) => (
                  <Badge key={role.id} variant="destructive">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!hasChanges && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No changes detected
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading || !hasChanges}>
            {loading ? "Applying Changes..." : "Confirm Changes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

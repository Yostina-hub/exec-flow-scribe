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
import { toast } from "@/hooks/use-toast";
import { ConfirmRoleChangeDialog } from "@/components/ConfirmRoleChangeDialog";

interface Role {
  id: string;
  name: string;
  description: string;
}

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; full_name: string; email: string; roles: Array<{ id: string; name: string }> };
  onSuccess: () => void;
}

export function UserRoleDialog({ open, onOpenChange, user, onSuccess }: UserRoleDialogProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRoles();
      setSelectedRoleIds(new Set(user.roles.map((r) => r.id)));
    }
  }, [open, user]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch roles: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const handleInitiateSave = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmedSave = async () => {
    try {
      setLoading(true);

      // Current auth user (used for assigned_by)
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Get current role IDs
      const currentRoleIds = new Set(user.roles.map((r) => r.id));

      // Determine roles to add and remove
      const rolesToAdd = Array.from(selectedRoleIds).filter((id) => !currentRoleIds.has(id));
      const rolesToRemove = Array.from(currentRoleIds).filter((id) => !selectedRoleIds.has(id));

      // Detect bootstrap (no user_roles rows yet)
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });
      const isBootstrap = (count ?? 0) === 0;

      // Ensure Admin is inserted first during bootstrap so subsequent inserts pass RLS
      const adminRole = roles.find((r) => r.name.toLowerCase() === "admin");
      if (isBootstrap && adminRole && !currentRoleIds.has(adminRole.id)) {
        const { error: bootstrapInsertError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: user.id,
            role_id: adminRole.id,
            assigned_by: currentUser?.id,
          }]);
        if (bootstrapInsertError) throw bootstrapInsertError;
        // Treat Admin as now assigned so we don't duplicate later
        currentRoleIds.add(adminRole.id);
      }

      // Add roles first to avoid losing permissions mid-operation (e.g., removing your own Admin)
      const remainingToAdd = rolesToAdd.filter((id) => !(adminRole && id === adminRole.id));
      if (remainingToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(
            remainingToAdd.map((roleId) => ({
              user_id: user.id,
              role_id: roleId,
              assigned_by: currentUser?.id,
            }))
          );

        if (insertError) throw insertError;
      }

      // Remove roles after inserts complete
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .in("role_id", rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Verify assignments when readable
      const { data: after, error: verifyError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user.id);

      if (!verifyError && after) {
        const assigned = new Set(after.map((r: any) => r.role_id));
        const missing = Array.from(selectedRoleIds).filter((id) => !assigned.has(id));
        if (missing.length > 0) {
          throw new Error('Some roles were not assigned due to access rules.');
        }
      }

      toast({
        title: "Success",
        description: "User roles updated successfully",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update user roles: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // Calculate changes for confirmation dialog
  const currentRoleIds = new Set(user.roles.map((r) => r.id));
  const rolesToAdd = roles.filter((r) => selectedRoleIds.has(r.id) && !currentRoleIds.has(r.id));
  const rolesToRemove = roles.filter((r) => !selectedRoleIds.has(r.id) && currentRoleIds.has(r.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Assign roles to {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {roles.map((role) => (
            <div key={role.id} className="flex items-start space-x-3">
              <Checkbox
                id={role.id}
                checked={selectedRoleIds.has(role.id)}
                onCheckedChange={() => handleToggleRole(role.id)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={role.id} className="font-medium cursor-pointer">
                  {role.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInitiateSave} disabled={loading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmRoleChangeDialog
      open={confirmDialogOpen}
      onOpenChange={setConfirmDialogOpen}
      userName={user.full_name || user.email}
      rolesToAdd={rolesToAdd}
      rolesToRemove={rolesToRemove}
      onConfirm={handleConfirmedSave}
      loading={loading}
    />
    </>
  );
}

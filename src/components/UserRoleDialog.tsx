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
import { toast } from "sonner";

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
      toast.error("Failed to fetch roles: " + error.message);
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

  const handleSave = async () => {
    try {
      setLoading(true);

      // Get current role IDs
      const currentRoleIds = new Set(user.roles.map((r) => r.id));

      // Determine roles to add and remove
      const rolesToAdd = Array.from(selectedRoleIds).filter((id) => !currentRoleIds.has(id));
      const rolesToRemove = Array.from(currentRoleIds).filter((id) => !selectedRoleIds.has(id));

      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .in("role_id", rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add roles
      if (rolesToAdd.length > 0) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(
            rolesToAdd.map((roleId) => ({
              user_id: user.id,
              role_id: roleId,
              assigned_by: currentUser?.id,
            }))
          );

        if (insertError) throw insertError;
      }

      toast.success("User roles updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update user roles: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

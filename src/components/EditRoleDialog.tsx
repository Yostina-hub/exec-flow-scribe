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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: Array<{ id: string; resource: string; action: string; description: string }>;
}

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  onSuccess: () => void;
}

export function EditRoleDialog({ open, onOpenChange, role, onSuccess }: EditRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && role) {
      setName(role.name);
      setDescription(role.description || "");
      setSelectedPermissions(new Set(role.permissions.map((p) => p.id)));
      fetchPermissions();
    }
  }, [open, role]);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("resource, action");

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch permissions: " + error.message);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      setLoading(true);

      // Update role
      const { error: roleError } = await supabase
        .from("roles")
        .update({ name, description })
        .eq("id", role.id);

      if (roleError) throw roleError;

      // Get current permission IDs
      const currentPermissionIds = new Set(role.permissions.map((p) => p.id));

      // Determine permissions to add and remove
      const permsToAdd = Array.from(selectedPermissions).filter(
        (id) => !currentPermissionIds.has(id)
      );
      const permsToRemove = Array.from(currentPermissionIds).filter(
        (id) => !selectedPermissions.has(id)
      );

      // Remove permissions
      if (permsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", role.id)
          .in("permission_id", permsToRemove);

        if (deleteError) throw deleteError;
      }

      // Add permissions
      if (permsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(
            permsToAdd.map((permissionId) => ({
              role_id: role.id,
              permission_id: permissionId,
            }))
          );

        if (insertError) throw insertError;
      }

      toast.success("Role updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update role: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update the role and manage its permissions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={role.is_system_role}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <Label>Permissions</Label>
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource} className="space-y-2">
                <h4 className="text-sm font-medium capitalize">{resource}</h4>
                <div className="pl-4 space-y-2">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={perm.id}
                        checked={selectedPermissions.has(perm.id)}
                        onCheckedChange={() => handleTogglePermission(perm.id)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor={perm.id} className="font-medium cursor-pointer capitalize">
                          {perm.action}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

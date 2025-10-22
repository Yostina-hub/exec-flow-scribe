import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: Permission[];
}

export function PermissionManagementTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          is_system_role,
          role_permissions!inner (
            permissions!inner (
              id,
              resource,
              action,
              description
            )
          )
        `)
        .order('name');

      if (error) throw error;

      const rolesWithPermissions = data?.map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        is_system_role: role.is_system_role,
        permissions: role.role_permissions.map((rp: any) => rp.permissions)
      })) || [];

      setRoles(rolesWithPermissions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role "${roleToDelete.name}" has been deleted.`,
      });

      fetchRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Permission Overview</CardTitle>
          <CardDescription>
            View all permissions assigned to each role. System roles cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Permissions control access to different parts of the application. Make sure users have appropriate roles for their responsibilities.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {roles.map((role) => {
        const groupedPermissions = groupPermissionsByResource(role.permissions);
        
        return (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    {role.is_system_role && (
                      <Badge variant="secondary">System Role</Badge>
                    )}
                  </CardTitle>
                  {role.description && (
                    <CardDescription className="mt-1">
                      {role.description}
                    </CardDescription>
                  )}
                </div>
                {!role.is_system_role && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(role)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Role
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {role.permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions assigned</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                    <div key={resource}>
                      <h4 className="text-sm font-medium mb-2 capitalize">{resource}</h4>
                      <div className="flex flex-wrap gap-2">
                        {permissions.map((permission) => (
                          <Badge key={permission.id} variant="outline">
                            {permission.action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
              Users with this role will lose their associated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

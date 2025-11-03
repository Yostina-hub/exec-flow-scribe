import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Permission {
  resource: string;
  action: string;
}

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user roles and their permissions
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner (
            id,
            name,
            role_permissions!inner (
              permissions!inner (
                resource,
                action
              )
            )
          )
        `)
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      // Check if user is admin
      const hasAdminRole = userRoles?.some(
        (ur: any) => ur.roles?.name === 'Admin'
      );
      setIsAdmin(hasAdminRole);

      // Collect all unique permissions
      const allPermissions: Permission[] = [];
      userRoles?.forEach((ur: any) => {
        ur.roles?.role_permissions?.forEach((rp: any) => {
          if (rp.permissions) {
            allPermissions.push({
              resource: rp.permissions.resource,
              action: rp.permissions.action
            });
          }
        });
      });

      // Remove duplicates
      const uniquePermissions = allPermissions.filter(
        (permission, index, self) =>
          index === self.findIndex(
            (p) => p.resource === permission.resource && p.action === permission.action
          )
      );

      setPermissions(uniquePermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    // Admins have all permissions
    if (isAdmin) return true;
    
    return permissions.some(
      (p) => p.resource === resource && p.action === action
    );
  };

  const canAccessRoute = (route: string): boolean => {
    // Admin-only routes
    const adminOnlyRoutes = ['/actions', '/notifications', '/integration-test'];
    if (adminOnlyRoutes.includes(route)) {
      return isAdmin;
    }

    // Admins can access everything
    if (isAdmin) return true;

    // Map routes to required permissions
    const routePermissions: Record<string, { resource: string; action: string }> = {
      '/admin': { resource: 'users', action: 'manage' },
      '/analytics': { resource: 'reports', action: 'view' },
      '/reports': { resource: 'reports', action: 'view' },
      '/settings': { resource: 'settings', action: 'manage' },
    };

    const permission = routePermissions[route];
    if (!permission) {
      // Routes without specific permission requirements are accessible to all authenticated users
      return true;
    }

    return hasPermission(permission.resource, permission.action);
  };

  return {
    permissions,
    loading,
    isAdmin,
    hasPermission,
    canAccessRoute,
    refetch: fetchUserPermissions,
  };
}

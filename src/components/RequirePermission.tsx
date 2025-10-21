import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RequirePermissionProps {
  resource: PermissionResource;
  action: PermissionAction;
  children: React.ReactNode;
}

type PermissionResource = 'actions' | 'meetings' | 'roles' | 'settings' | 'transcriptions' | 'users';

type PermissionAction = 'create' | 'delete' | 'manage' | 'read' | 'update';

export function RequirePermission({ resource, action, children }: RequirePermissionProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }
        const { data, error } = await supabase.rpc("has_permission", {
          _user_id: user.id,
          _resource: resource,
          _action: action,
        });
        if (error) throw error;
        if (!cancelled) {
          setAllowed(Boolean(data));
        }
      } catch (err: any) {
        console.error("Permission check failed", err);
        toast.error("Could not verify permissions");
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resource, action]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    toast({
      title: "Access Denied",
      description: `You need '${action}' permission on '${resource}' to access this page. Please contact an administrator.`,
      variant: "destructive",
    });
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

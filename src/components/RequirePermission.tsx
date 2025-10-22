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
    // Avoid repeated toasts on each re-render
    toast({
      title: "Access Denied",
      description: `You need '${action}' permission on '${resource}' to access this page. Please contact an administrator.`,
      variant: "destructive",
    });
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            You don’t have permission to view this page. You can return to your dashboard.
          </p>
          <a href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition-opacity">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

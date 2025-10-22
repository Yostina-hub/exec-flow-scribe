import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuthAndGuestStatus();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAuthAndGuestStatus();
      } else {
        setAuthenticated(false);
        setIsGuest(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthAndGuestStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);

      if (session?.user) {
        // Check if user is a guest
        const { data: guestAccess } = await supabase
          .from('guest_access_requests')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'approved')
          .maybeSingle();

        setIsGuest(!!guestAccess);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Guest access control - only allow specific routes
  if (isGuest) {
    const allowedGuestRoutes = [
      '/',
      '/quick-join',
      '/auth'
    ];

    const isAllowedRoute = allowedGuestRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );

    if (!isAllowedRoute) {
      // Redirect guests trying to access non-guest routes back to dashboard
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

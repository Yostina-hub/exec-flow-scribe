import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

let guestCache: { userId: string; isGuest: boolean; timestamp: number } | null = null;
const GUEST_CACHE_MS = 5 * 60 * 1000; // 5 minutes

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
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If there's an auth error (like invalid refresh token), sign out and clear session
      if (error) {
        console.error("Auth error:", error);
        await supabase.auth.signOut();
        setAuthenticated(false);
        setIsGuest(false);
        setLoading(false);
        return;
      }
      
      setAuthenticated(!!session);

      if (session?.user) {
        const now = Date.now();
        if (
          guestCache &&
          guestCache.userId === session.user.id &&
          now - guestCache.timestamp < GUEST_CACHE_MS
        ) {
          setIsGuest(guestCache.isGuest);
        } else {
          // Check if user is a guest (cached if recently checked)
          const { data: guestAccess } = await supabase
            .from('guest_access_requests')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('status', 'approved')
            .maybeSingle();

          const isGuestValue = !!guestAccess;
          setIsGuest(isGuestValue);
          guestCache = { userId: session.user.id, isGuest: isGuestValue, timestamp: now };
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      await supabase.auth.signOut();
      setAuthenticated(false);
      setIsGuest(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

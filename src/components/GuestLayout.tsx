import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface GuestLayoutProps {
  children: ReactNode;
  guestName?: string | null;
}

/**
 * Simplified layout for guest users
 * No sidebar, minimal navigation
 */
export function GuestLayout({ children, guestName }: GuestLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for guests */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Meeting Portal</h1>
                  <p className="text-xs text-muted-foreground">Guest Access</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {guestName && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{guestName}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="border-t mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Guest access is limited to meeting participation only</p>
        </div>
      </footer>
    </div>
  );
}

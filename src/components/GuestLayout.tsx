import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, Sparkles } from "lucide-react";
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
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate floating particles for background
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Glassmorphic header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50 animate-slide-down">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-purple-500/50">
                  <Sparkles className="text-white w-6 h-6 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              </div>
              <div className="transform transition-all duration-300 group-hover:translate-x-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Meeting Portal
                </h1>
                <p className="text-xs text-purple-300/80 font-medium">Guest Access • Premium Experience</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {guestName && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 animate-fade-in hover:bg-white/10 transition-all duration-300">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <UserCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-white font-medium">{guestName}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-white/80 hover:text-white hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with glass effect */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {children}
        </div>
      </main>

      {/* Enhanced footer */}
      <footer className="relative z-10 border-t border-white/10 mt-auto py-8 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-purple-300/60">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Secure Guest Access</span>
            </div>
            <p className="text-sm text-gray-400 text-center max-w-md">
              You're experiencing our premium guest portal. Access is limited to meeting participation only.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
            opacity: 0.7;
          }
          75% {
            transform: translateY(-30px) translateX(5px);
            opacity: 0.4;
          }
        }
        
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

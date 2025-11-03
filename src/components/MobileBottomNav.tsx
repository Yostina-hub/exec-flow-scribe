import { Calendar, LayoutDashboard, CheckSquare, Bell, Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Settings, BarChart3, FileText, Shield, Activity, Sparkles, Cloud, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Actions", href: "/actions", icon: CheckSquare },
  { name: "Alerts", href: "/notifications", icon: Bell },
];

const moreNavItems = [
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Smart Drive", href: "/drive", icon: Cloud },
  { name: "Notebooks", href: "/notebooks", icon: Sparkles },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Administration", href: "/admin", icon: Shield },
  { name: "Integration Test", href: "/integration-test", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { canAccessRoute } = useUserPermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const visibleMainNav = mainNavItems.filter(item => canAccessRoute(item.href));
  const visibleMoreNav = moreNavItems.filter(item => canAccessRoute(item.href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 md:hidden mobile-safe-bottom shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {visibleMainNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "transition-transform duration-200",
                isActive && "scale-110"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full animate-scale-in" />
              )}
            </NavLink>
          );
        })}
        
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center gap-1 h-full rounded-none text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto py-6">
                <h2 className="text-lg font-semibold mb-4 px-2">More Options</h2>
                <div className="grid gap-2">
                  {visibleMoreNav.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

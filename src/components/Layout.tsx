import { ReactNode } from "react";
import { Calendar, LayoutDashboard, CheckSquare, Settings, BarChart3, FileText, LogOut, Shield, Activity, Sparkles, Cloud, Bell } from "lucide-react";
import { QuickSearch } from "@/components/QuickSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { ActiveRecordingIndicator } from "@/components/ActiveRecordingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { NavLink, useLocation } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAutoUploadToDrive } from "@/hooks/useAutoUploadToDrive";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Smart Drive", href: "/drive", icon: Cloud },
  { name: "Notebooks", href: "/notebooks", icon: Sparkles },
  { name: "Actions", href: "/actions", icon: CheckSquare },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Administration", href: "/admin", icon: Shield },
  { name: "Integration Test", href: "/integration-test", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { canAccessRoute, loading } = useUserPermissions();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Filter navigation items based on user permissions
  const visibleNavigation = navigation.filter(item => canAccessRoute(item.href));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary to-secondary flex-shrink-0 shadow-lg ring-2 ring-primary/20 animate-scale-in" />
          {open && (
            <div className="animate-slide-in-right">
              <h1 className="text-xl font-bold font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                MeetingHub
              </h1>
              <p className="text-xs text-muted-foreground">Executive Suite</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            {loading ? (
              <div className="px-4 py-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <SidebarMenu className="space-y-1">
                {visibleNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        className={`
                          relative group transition-all duration-200
                          ${isActive 
                            ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary font-medium shadow-sm' 
                            : 'hover:bg-accent/50 hover:translate-x-1'
                          }
                        `}
                      >
                        <NavLink to={item.href}>
                          <item.icon className={`h-4 w-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                          <span>{item.name}</span>
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-r-full" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            {open && (
              <div className="px-4 py-3 mb-2">
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                  <p className="font-semibold text-sm">CEO Office</p>
                  <p className="text-xs text-muted-foreground">Executive Access</p>
                </div>
              </div>
            )}
            <SidebarMenuButton 
              onClick={handleLogout}
              className="mx-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const Layout = ({ children }: LayoutProps) => {
  // Enable auto-upload to drive for generated documents
  useAutoUploadToDrive();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-muted/5 to-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
            <div className="flex h-16 lg:h-16 items-center gap-3 lg:gap-4 px-4 lg:px-6">
              <SidebarTrigger className="hover:bg-accent/50 transition-colors" />
              <div className="flex-1" />
              <div className="flex items-center gap-2 lg:gap-3">
                <NotificationBell />
                <QuickSearch />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 animate-fade-in">
            <div className="mx-auto max-w-[1600px]">
              {children}
            </div>
          </main>
        </div>
        
        <ActiveRecordingIndicator />
      </div>
    </SidebarProvider>
  );
};

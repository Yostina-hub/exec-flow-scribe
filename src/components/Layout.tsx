import { ReactNode } from "react";
import { Calendar, LayoutDashboard, CheckSquare, Settings, BarChart3, FileText, LogOut, Shield, Activity, Sparkles, Cloud, Bell } from "lucide-react";
import { QuickSearch } from "@/components/QuickSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { NavLink, useLocation } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useIsMobile } from "@/hooks/use-mobile";
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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
          {open && <h1 className="text-xl font-bold">MeetingHub</h1>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <SidebarMenu>
                {visibleNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <NavLink to={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {open && (
              <div className="px-2 py-2 text-sm">
                <p className="font-medium">CEO Office</p>
                <p className="text-xs text-muted-foreground">Executive Access</p>
              </div>
            )}
            <SidebarMenuButton onClick={handleLogout}>
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
  const isMobile = useIsMobile();

  // Mobile mini-app layout with bottom navigation
  return (
    <>
      {/* Mobile Layout */}
      <div className={`${isMobile ? 'flex' : 'hidden'} min-h-screen flex-col w-full pb-16`}>
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mobile-safe-top">
          <div className="flex h-14 items-center gap-3 px-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
            <h1 className="text-lg font-bold">MeetingHub</h1>
            <div className="flex-1" />
            <NotificationBell />
            <QuickSearch />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      {isMobile && <MobileBottomNav />}

      {/* Desktop Layout */}
      <SidebarProvider>
        <div className={`${isMobile ? 'hidden' : 'flex'} min-h-screen w-full`}>
          <AppSidebar />
          
          <div className="flex-1 flex flex-col w-full">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center gap-4 px-4">
                <SidebarTrigger />
                <div className="flex-1" />
                <NotificationBell />
                <QuickSearch />
              </div>
            </header>

            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};

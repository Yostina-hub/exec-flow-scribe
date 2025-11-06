import { ReactNode } from "react";
import { Calendar, LayoutDashboard, CheckSquare, Settings, BarChart3, FileText, LogOut, Shield, Activity, Sparkles, Cloud, Bell } from "lucide-react";
import { QuickSearch } from "@/components/QuickSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { ActiveRecordingIndicator } from "@/components/ActiveRecordingIndicator";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { NavLink, useLocation } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAutoUploadToDrive } from "@/hooks/useAutoUploadToDrive";
import { useTheme } from "@/contexts/ThemeContext";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";
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
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Filter navigation items based on user permissions
  const visibleNavigation = navigation.filter(item => canAccessRoute(item.href));

  return (
    <Sidebar collapsible="icon" className={`border-r ${isEthioTelecom ? 'bg-white border-gray-200' : 'border-border/50'}`}>
      <SidebarHeader className={`border-b ${isEthioTelecom ? 'border-gray-200' : 'border-border/50'}`}>
        <div className="flex items-center gap-3 px-4 py-5">
          <div className={`h-10 w-10 rounded-xl flex-shrink-0 shadow-lg ring-2 animate-scale-in ${isEthioTelecom ? 'bg-gradient-to-br from-[#8DC63F] to-[#0072BC] ring-[#8DC63F]/20' : 'bg-gradient-to-br from-primary via-primary to-secondary ring-primary/20'}`} />
          {open && (
            <div className="animate-slide-in-right">
              <h1 className={`text-xl font-bold ${isEthioTelecom ? 'font-["Noto_Sans_Ethiopic"] bg-gradient-to-r from-[#8DC63F] to-[#0072BC]' : 'font-display bg-gradient-to-r from-primary to-secondary'} bg-clip-text text-transparent`}>
                MeetingHub
              </h1>
              <p className={`text-xs ${isEthioTelecom ? 'text-[#8DC63F] font-semibold' : 'text-muted-foreground'}`}>Executive Suite</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={`py-4 ${isEthioTelecom ? 'bg-white' : ''}`}>
        <SidebarGroup>
          <SidebarGroupLabel className={`px-4 text-xs font-semibold uppercase tracking-wider ${isEthioTelecom ? 'text-gray-500' : 'text-muted-foreground/70'}`}>
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
                            ? isEthioTelecom
                              ? 'bg-gradient-to-r from-[#8DC63F]/10 to-[#0072BC]/10 text-[#8DC63F] font-semibold shadow-sm'
                              : 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary font-medium shadow-sm'
                            : isEthioTelecom
                              ? 'hover:bg-gray-100 hover:translate-x-1 text-gray-700'
                              : 'hover:bg-accent/50 hover:translate-x-1'
                          }
                        `}
                      >
                        <NavLink to={item.href}>
                          <item.icon className={`h-4 w-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                          <span>{item.name}</span>
                          {isActive && (
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${isEthioTelecom ? 'bg-gradient-to-b from-[#8DC63F] to-[#0072BC]' : 'bg-gradient-to-b from-primary to-secondary'}`} />
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

      <SidebarFooter className={`border-t mt-auto ${isEthioTelecom ? 'bg-white border-gray-200' : 'border-border/50'}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            {open && (
              <div className="px-4 py-3 mb-2">
                <div className={`p-3 rounded-lg ${isEthioTelecom ? 'bg-gradient-to-br from-[#8DC63F]/10 to-[#0072BC]/10 border border-[#8DC63F]/20' : 'bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20'}`}>
                  <p className={`font-semibold text-sm ${isEthioTelecom ? 'text-gray-900' : ''}`}>CEO Office</p>
                  <p className={`text-xs ${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>Executive Access</p>
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
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  
  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${isEthioTelecom ? 'bg-[#F4F4F4]' : 'bg-gradient-to-br from-background via-muted/5 to-background'}`}>
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Ethio Telecom Header */}
          {isEthioTelecom && (
            <div className="fixed top-0 left-0 right-0 h-16 sm:h-20 z-50">
              <img 
                src={ethioTelecomLogo} 
                alt="Ethio Telecom" 
                className="w-full h-full object-cover object-left"
              />
            </div>
          )}

          <header className={`sticky z-40 border-b ${isEthioTelecom ? 'top-16 sm:top-20 border-gray-200 bg-white shadow-sm' : 'top-0 border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm'}`}>
            <div className="flex h-16 lg:h-16 items-center gap-3 lg:gap-4 px-4 lg:px-6">
              <SidebarTrigger className={`transition-colors ${isEthioTelecom ? 'hover:bg-gray-100' : 'hover:bg-accent/50'}`} />
              <div className="flex-1" />
              <div className="flex items-center gap-2 lg:gap-3">
                <ThemeSwitcher />
                <NotificationBell />
                <QuickSearch />
              </div>
            </div>
          </header>

          <main className={`flex-1 p-4 lg:p-8 animate-fade-in ${isEthioTelecom ? 'pt-20 sm:pt-24' : ''}`}>
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

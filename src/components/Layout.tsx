import { ReactNode } from "react";
import { Calendar, LayoutDashboard, CheckSquare, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Actions", href: "/actions", icon: CheckSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary" />
              <h1 className="text-xl font-bold">MeetingHub</h1>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="gap-2"
                  asChild
                >
                  <a href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </a>
                </Button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-medium">CEO Office</p>
                <p className="text-xs text-muted-foreground">Executive Access</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-semibold">
                CE
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {children}
      </main>
    </div>
  );
};

import { useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, Calendar, CheckSquare, BarChart3, Settings } from "lucide-react";

const shortcuts = [
  { name: "Dashboard", href: "/", icon: BarChart3, category: "Navigation" },
  { name: "Calendar", href: "/calendar", icon: Calendar, category: "Navigation" },
  { name: "Meetings", href: "/meetings", icon: Calendar, category: "Navigation" },
  { name: "Actions", href: "/actions", icon: CheckSquare, category: "Navigation" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, category: "Navigation" },
  { name: "Settings", href: "/settings", icon: Settings, category: "Navigation" },
  { name: "Executive Strategy Review", href: "/meetings/1", icon: Calendar, category: "Recent Meetings" },
  { name: "Quarterly Planning Session", href: "/meetings/2", icon: Calendar, category: "Recent Meetings" },
  { name: "Review Q4 financial projections", href: "/actions", icon: CheckSquare, category: "Recent Actions" },
  { name: "Finalize hiring plan for 2025", href: "/actions", icon: CheckSquare, category: "Recent Actions" },
];

export const QuickSearch = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search meetings, actions, and more..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {["Navigation", "Recent Meetings", "Recent Actions"].map((category) => {
            const items = shortcuts.filter((s) => s.category === category);
            if (items.length === 0) return null;
            
            return (
              <CommandGroup key={category} heading={category}>
                {items.map((item) => (
                  <CommandItem
                    key={item.name}
                    onSelect={() => {
                      window.location.href = item.href;
                      setOpen(false);
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
};

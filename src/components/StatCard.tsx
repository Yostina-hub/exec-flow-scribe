import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  iconColor?: string;
}

export const StatCard = ({ title, value, icon: Icon, trend, iconColor }: StatCardProps) => {
  return (
    <Card className="group relative overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 animate-fade-in border-0 bg-gradient-to-br from-card to-muted/20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardContent className="pt-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl lg:text-4xl font-bold font-display">{value}</p>
            {trend && (
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                  trend.positive 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  <span>{trend.positive ? "↑" : "↓"}</span>
                  <span>{trend.value}</span>
                </div>
              </div>
            )}
          </div>
          <div
            className={cn(
              "h-14 w-14 lg:h-16 lg:w-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
              iconColor || "bg-gradient-to-br from-primary to-secondary"
            )}
          >
            <Icon className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

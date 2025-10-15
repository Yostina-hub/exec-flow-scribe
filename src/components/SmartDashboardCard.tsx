import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartDashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
    icon?: LucideIcon;
  }[];
  stats?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  gradient?: string;
}

export function SmartDashboardCard({
  title,
  description,
  icon: Icon,
  actions,
  stats,
  gradient = 'from-primary/10 to-primary/5'
}: SmartDashboardCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden group hover:shadow-xl transition-all duration-300",
      "hover:-translate-y-1 animate-fade-in"
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradient)} />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-background/80">
                <Icon className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-1">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.trend && (
                    <Badge 
                      variant={stat.trend === 'up' ? 'default' : stat.trend === 'down' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="sm"
              onClick={action.onClick}
              className="gap-2"
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

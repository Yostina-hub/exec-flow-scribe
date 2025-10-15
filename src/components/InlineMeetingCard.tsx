import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, MapPin, Users, Play, ChevronRight, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface InlineMeetingCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  status: 'upcoming' | 'in-progress' | 'completed';
  agendaItems: number;
}

const statusConfig = {
  upcoming: { 
    variant: 'secondary' as const, 
    label: 'Upcoming', 
    gradient: 'from-blue-500/10 to-purple-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400'
  },
  'in-progress': { 
    variant: 'default' as const, 
    label: 'Live', 
    gradient: 'from-green-500/10 to-emerald-500/10',
    border: 'border-green-500/20',
    text: 'text-green-600 dark:text-green-400'
  },
  completed: { 
    variant: 'outline' as const, 
    label: 'Completed', 
    gradient: 'from-gray-500/5 to-slate-500/5',
    border: 'border-gray-500/20',
    text: 'text-gray-600 dark:text-gray-400'
  },
};

export function InlineMeetingCard({
  id,
  title,
  date,
  time,
  duration,
  location,
  attendees,
  status,
  agendaItems,
}: InlineMeetingCardProps) {
  const navigate = useNavigate();
  const config = statusConfig[status];

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden cursor-pointer",
        "hover:shadow-xl hover:scale-[1.01] transition-all duration-300",
        "bg-gradient-to-r", config.gradient,
        "border", config.border,
        "animate-fade-in"
      )}
      onClick={() => navigate(`/meetings/${id}`)}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Left: Date Badge */}
        <div className="flex-shrink-0 text-center">
          <div className={cn(
            "flex flex-col items-center justify-center w-16 h-16 rounded-xl",
            "bg-gradient-to-br from-background to-muted",
            "border shadow-sm"
          )}>
            <span className="text-2xl font-bold">{date.split(' ')[1]}</span>
            <span className="text-xs text-muted-foreground uppercase">{date.split(' ')[0]}</span>
          </div>
        </div>

        {/* Middle: Meeting Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.variant} className="text-xs font-medium">
              {config.label}
            </Badge>
            {status === 'in-progress' && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </div>
          
          <h3 className="font-semibold text-base mb-2 truncate group-hover:text-primary transition-colors">
            {title}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">{location}</span>
            </div>
            {attendees > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{attendees}</span>
              </div>
            )}
            {agendaItems > 0 && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>{agendaItems}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meetings/${id}`);
            }}
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Join</span>
          </Button>
          
          <ChevronRight className={cn(
            "h-5 w-5 transition-all duration-300",
            config.text,
            "group-hover:translate-x-1"
          )} />
        </div>
      </div>
    </Card>
  );
}

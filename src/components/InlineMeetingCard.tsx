import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, MapPin, Users, Play, FileText, Calendar, ListPlus, Pencil
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AgendaIntakeForm } from './AgendaIntakeForm';
import { EditMeetingDialog } from './EditMeetingDialog';

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
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10'
  },
  'in-progress': { 
    variant: 'default' as const, 
    label: 'Live', 
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/10'
  },
  completed: { 
    variant: 'outline' as const, 
    label: 'Completed', 
    gradient: 'from-gray-500 to-slate-500',
    bg: 'bg-gray-500/10'
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
        "group relative overflow-hidden cursor-pointer h-full",
        "hover:shadow-2xl hover:scale-[1.02] transition-all duration-300",
        "bg-gradient-to-br from-background to-muted/30",
        "border-2 hover:border-primary/50"
      )}
      onClick={() => navigate(`/meetings/${id}`)}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1", `bg-gradient-to-r ${config.gradient}`)} />
      
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "flex flex-col items-center justify-center px-3 py-2 rounded-lg",
              "bg-gradient-to-br from-background to-muted text-center min-w-[60px]"
            )}>
              <Calendar className="h-4 w-4 mb-1 text-muted-foreground" />
              <span className="text-xs font-bold uppercase text-muted-foreground">{date}</span>
            </div>
            <Badge variant={config.variant} className="text-xs">
              {config.label}
            </Badge>
          </div>
          
          {status === 'in-progress' && (
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors min-h-[56px]">
          {title}
        </h3>

        {/* Info Grid */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{time} • {duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{attendees || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{agendaItems || 0} items</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className={cn(
              "flex-1 gap-2 bg-gradient-to-r",
              config.gradient,
              "hover:opacity-90 transition-opacity"
            )}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meetings/${id}`);
            }}
          >
            <Play className="h-4 w-4" />
            Join Meeting
          </Button>
          <EditMeetingDialog 
            meetingId={id}
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <AgendaIntakeForm 
            meetingId={id} 
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <ListPlus className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

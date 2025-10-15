import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, MapPin, Users, Play, Edit, Trash2, 
  MoreVertical, FileText, Copy 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  upcoming: { variant: 'secondary' as const, label: 'Upcoming', color: 'bg-blue-500' },
  'in-progress': { variant: 'default' as const, label: 'Live', color: 'bg-green-500' },
  completed: { variant: 'outline' as const, label: 'Completed', color: 'bg-gray-500' },
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
  const [isHovered, setIsHovered] = useState(false);
  const config = statusConfig[status];

  const quickActions = [
    { icon: Play, label: 'Start/Join', onClick: () => navigate(`/meetings/${id}`) },
    { icon: FileText, label: 'Minutes', onClick: () => navigate(`/meetings/${id}/minutes`) },
    { icon: Edit, label: 'Edit', onClick: () => {} },
  ];

  return (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-200 cursor-pointer relative",
        isHovered && "shadow-xl scale-[1.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/meetings/${id}`)}
    >
      {/* Status indicator bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", config.color)} />

      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
              {status === 'in-progress' && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>

            <h3 className="font-semibold text-lg mb-3 truncate">{title}</h3>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>{time} • {duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{attendees} attendees</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span>{agendaItems} items</span>
              </div>
            </div>
          </div>

          {/* Quick actions - show on hover */}
          <div className={cn(
            "flex items-center gap-1 transition-all duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => {}}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => {}}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

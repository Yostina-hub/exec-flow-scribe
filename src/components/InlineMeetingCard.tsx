import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, MapPin, Users, Play, FileText, Calendar, ListPlus, Pencil, Video, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AgendaIntakeForm } from './AgendaIntakeForm';
import { EditMeetingDialog } from './EditMeetingDialog';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

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
  meetingType?: string;
  videoConferenceUrl?: string | null;
  createdBy?: string;
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
  meetingType,
  videoConferenceUrl,
  createdBy,
}: InlineMeetingCardProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const config = statusConfig[status];
  const isOnlineMeeting = meetingType === 'online' || meetingType === 'hybrid';
  const hasVideoLink = !!videoConferenceUrl;
  const isHost = createdBy === currentUserId;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  const getEthioTelecomGradient = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'from-[#0072BC] to-[#005A9C]';
      case 'in-progress':
        return 'from-[#8DC63F] to-[#7AB62F]';
      case 'completed':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-[#0072BC] to-[#8DC63F]';
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden cursor-pointer h-full",
        "hover:shadow-2xl hover:-translate-y-2 transition-all duration-500",
        isEthioTelecom 
          ? "bg-white border-2 border-gray-200 hover:border-[#8DC63F]/50"
          : "bg-gradient-to-br from-background to-muted/30 border-2 hover:border-primary/50"
      )}
      onClick={() => navigate(`/meetings/${id}`)}
    >
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2",
        `bg-gradient-to-r ${isEthioTelecom ? getEthioTelecomGradient(status) : config.gradient}`
      )} />
      
      <CardContent className="p-5 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "flex flex-col items-center justify-center px-3 py-2 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110",
              isEthioTelecom 
                ? "bg-gradient-to-br from-[#8DC63F]/10 to-[#0072BC]/10 border border-[#8DC63F]/20"
                : "bg-gradient-to-br from-background to-muted"
            )}>
              <Calendar className={`h-4 w-4 mb-1 ${isEthioTelecom ? 'text-[#8DC63F]' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-bold uppercase ${isEthioTelecom ? 'text-gray-900' : 'text-muted-foreground'}`}>{date}</span>
            </div>
            <Badge 
              variant={config.variant} 
              className={cn(
                "text-xs font-semibold",
                isEthioTelecom && status === 'upcoming' && "bg-[#0072BC] text-white hover:bg-[#005A9C]",
                isEthioTelecom && status === 'in-progress' && "bg-[#8DC63F] text-white hover:bg-[#7AB62F]"
              )}
            >
              {config.label}
            </Badge>
          </div>
          
          {status === 'in-progress' && (
            <span className="flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-75 ${isEthioTelecom ? 'bg-[#8DC63F]' : 'bg-green-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isEthioTelecom ? 'bg-[#8DC63F]' : 'bg-green-500'}`}></span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={cn(
          "font-black text-base lg:text-lg line-clamp-2 min-h-[56px] transition-colors duration-300",
          isEthioTelecom 
            ? 'font-["Noto_Sans_Ethiopic"] text-gray-900 group-hover:text-[#8DC63F]'
            : 'group-hover:text-primary'
        )}>
          {title}
        </h3>

        {/* Info Grid */}
        <div className={`space-y-2 text-sm ${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate font-medium">{time} • {duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate font-medium">{location}</span>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-semibold">{attendees || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-semibold">{agendaItems || 0} items</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Participants see Join Virtual Room for in-progress meetings */}
          {!isHost && status === 'in-progress' && (
            <Button
              size="sm"
              className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${id}`);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Join Virtual Room
            </Button>
          )}
          
          {isOnlineMeeting && hasVideoLink ? (
            <Button
              size="sm"
              className={`${!isHost && status === 'in-progress' ? '' : 'flex-1'} gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90`}
              onClick={(e) => {
                e.stopPropagation();
                window.open(videoConferenceUrl, '_blank');
              }}
            >
              <Video className="h-4 w-4" />
              Join Video
            </Button>
          ) : (
            !(!isHost && status === 'in-progress') && (
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
                View Meeting
              </Button>
            )
          )}
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

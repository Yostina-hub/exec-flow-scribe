import { Calendar, Clock, Users, MapPin, FileText, Video, Link2, Copy, Sparkles, Brain, ChevronDown, CheckCircle, AlertCircle, Target, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

interface MeetingCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  status: "upcoming" | "in-progress" | "completed";
  agendaItems: number;
  meetingType?: string;
  videoConferenceUrl?: string | null;
  videoProvider?: string | null;
  createdBy?: string;
  readiness?: number;
  missingItems?: string[];
  isEncrypted?: boolean;
  sensitivityLevel?: string;
}

const statusConfig = {
  upcoming: {
    variant: "secondary" as const,
    label: "Upcoming",
  },
  "in-progress": {
    variant: "warning" as const,
    label: "In Progress",
  },
  completed: {
    variant: "success" as const,
    label: "Completed",
  },
};

export const MeetingCard = ({
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
  videoProvider,
  createdBy,
  readiness = 100,
  missingItems = [],
  isEncrypted = false,
  sensitivityLevel = 'standard',
}: MeetingCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = statusConfig[status];
  const isOnlineMeeting = meetingType === 'online' || meetingType === 'hybrid';
  const hasVideoLink = !!videoConferenceUrl;
  const isHost = createdBy === currentUserId;
  
  const readinessColor = readiness >= 90 ? 'text-green-500' : 
                         readiness >= 70 ? 'text-blue-500' : 
                         readiness >= 40 ? 'text-yellow-500' : 'text-red-500';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  const handleCopyLink = async () => {
    try {
      const meetingUrl = `${window.location.origin}/meetings/${id}`;
      await navigator.clipboard.writeText(meetingUrl);
      toast({
        title: "Link copied",
        description: "Meeting link copied to clipboard",
      });
    } catch (error) {
      console.error('Clipboard error:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy link. Please check clipboard permissions.",
        variant: "destructive",
      });
    }
  };

  const handleJoinVirtualRoom = () => {
    navigate(`/meetings/${id}`);
  };

  const handleQuickJoin = () => {
    // Zero-click: Direct navigation with sound effect
    navigate(`/meetings/${id}?autoJoin=true`);
    toast({
      title: "Joining...",
      description: "Loading virtual room",
    });
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-scale-in border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              {status === "in-progress" && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
              {isEncrypted && (
                <Badge variant="default" className="text-xs gap-1 bg-gradient-to-r from-amber-500 to-orange-500">
                  <ShieldCheck className="h-3 w-3" />
                  Encrypted
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {date} • {time}
              </span>
              {status === "upcoming" && readiness < 100 && (
                <Badge variant="outline" className={cn("text-xs gap-1", readinessColor)}>
                  <Target className="h-3 w-3" />
                  {readiness}% Ready
                </Badge>
              )}
            </div>
          </div>
          
          {/* ONE-CLICK Primary Action */}
          {status === "in-progress" && (
            <Button 
              size="sm"
              onClick={handleQuickJoin}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg animate-pulse"
            >
              <Sparkles className="h-4 w-4" />
              Join Now
            </Button>
          )}
          
          {status === "upcoming" && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => navigate(`/meetings/${id}`)}
              className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Brain className="h-4 w-4" />
              Prepare
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Info - Always Visible */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate text-xs">{location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="text-xs">{attendees} people</span>
          </div>
        </div>

        {/* Smart Preparation Progress */}
        {status === "upcoming" && readiness < 100 && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Preparation</span>
              <span className={cn("text-xs font-bold", readinessColor)}>{readiness}%</span>
            </div>
            <Progress value={readiness} className="h-1.5" />
            {missingItems.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {missingItems.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Details - Progressive Disclosure */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              <span className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                {agendaItems} items • {duration}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 pt-2">
            {/* Quick Actions - Only shown when expanded */}
            <div className="flex gap-2 flex-wrap">
              {isOnlineMeeting && hasVideoLink && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1 gap-2 text-xs h-8" 
                  onClick={() => window.open(videoConferenceUrl, '_blank')}
                >
                  <Video className="h-3 w-3" />
                  Video Call
                </Button>
              )}
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2 text-xs h-8"
              >
                <Copy className="h-3 w-3" />
                Copy Link
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(`/meetings/${id}`)}
                className="flex-1 gap-2 text-xs h-8"
              >
                Full Details
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

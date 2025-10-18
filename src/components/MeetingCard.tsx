import { Calendar, Clock, Users, MapPin, FileText, Video, Link2, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
}: MeetingCardProps) => {
  const { toast } = useToast();
  const statusInfo = statusConfig[status];
  const isOnlineMeeting = meetingType === 'online' || meetingType === 'hybrid';
  const hasVideoLink = !!videoConferenceUrl;

  const handleCopyLink = () => {
    const meetingUrl = `${window.location.origin}/meetings/${id}`;
    navigator.clipboard.writeText(meetingUrl);
    toast({
      title: "Link copied",
      description: "Meeting link copied to clipboard",
    });
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-sm text-muted-foreground">{date}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{time} • {duration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{attendees} attendees</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{agendaItems} agenda items</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {isOnlineMeeting && hasVideoLink && (
            <Button 
              size="sm" 
              className="flex-1 gap-2" 
              onClick={() => window.open(videoConferenceUrl, '_blank')}
            >
              <Video className="h-4 w-4" />
              Join Meeting
            </Button>
          )}
          <Button size="sm" className="flex-1" asChild>
            <a href={`/meetings/${id}`}>View Details</a>
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleCopyLink}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

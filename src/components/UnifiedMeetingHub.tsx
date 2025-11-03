import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Video, Calendar, Clock, MapPin, Users, Copy, 
  ExternalLink, Smartphone, Monitor, CheckCircle, 
  Play, Loader2, Share2, Sparkles, Radio
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  created_by: string;
  video_conference_url?: string;
  video_conference_provider?: string;
  meeting_attendees?: any[];
  activeParticipants?: number;
}

export function UnifiedMeetingHub() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [guestMeetings, setGuestMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [presenceData, setPresenceData] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllMeetings();
    subscribeToPresence();
  }, []);

  const subscribeToPresence = () => {
    // Subscribe to real-time presence updates
    const channel = supabase
      .channel('meeting-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const counts: Record<string, number> = {};
        
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[];
          presences.forEach((presence: any) => {
            if (presence?.meeting_id) {
              counts[presence.meeting_id] = (counts[presence.meeting_id] || 0) + 1;
            }
          });
        });
        
        setPresenceData(counts);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAllMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch meetings where user is attendee or host
      const { data: myMeetings } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_attendees(user_id, response_status)
        `)
        .or(`created_by.eq.${user.id},id.in.(${await getAttendingMeetingIds(user.id)})`)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);

      // Fetch guest access meetings
      const { data: guestAccess } = await supabase
        .from('guest_access_requests')
        .select('meeting_id, meetings(*)')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      const guestMeetingsData = guestAccess?.map(g => g.meetings).filter(Boolean) || [];

      setMeetings(myMeetings || []);
      setGuestMeetings(guestMeetingsData as Meeting[]);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAttendingMeetingIds = async (userId: string) => {
    const { data } = await supabase
      .from('meeting_attendees')
      .select('meeting_id')
      .eq('user_id', userId);
    
    return data?.map(d => d.meeting_id).join(',') || '';
  };

  const generateQuickJoinLink = (meetingId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/quick-join?m=${meetingId}`;
  };

  const copyJoinLink = (meetingId: string) => {
    const link = generateQuickJoinLink(meetingId);
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Quick join link copied to clipboard"
    });
  };

  const shareViaWhatsApp = (meeting: Meeting) => {
    const link = generateQuickJoinLink(meeting.id);
    const message = encodeURIComponent(
      `Join "${meeting.title}" meeting\n${format(new Date(meeting.start_time), 'PPp')}\n${link}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const joinMeeting = (meeting: Meeting) => {
    // Track device type
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    toast({
      title: `Joining from ${isMobile ? 'Mobile' : 'Desktop'}`,
      description: "Connecting you to the meeting...",
    });

    // Navigate to meeting detail with auto-join
    navigate(`/meetings/${meeting.id}?autoJoin=true&device=${isMobile ? 'mobile' : 'desktop'}`);
  };

  const getMeetingStatus = (meeting: Meeting) => {
    const now = new Date();
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    
    if (now >= start && now <= end) {
      return { label: 'Live Now', color: 'bg-green-500', pulse: true };
    } else if (isToday(start)) {
      return { label: 'Today', color: 'bg-blue-500', pulse: false };
    } else if (isTomorrow(start)) {
      return { label: 'Tomorrow', color: 'bg-purple-500', pulse: false };
    }
    return { label: format(start, 'MMM d'), color: 'bg-gray-500', pulse: false };
  };

  const filteredMeetings = [...meetings, ...guestMeetings].filter(m => {
    if (!searchQuery) return true;
    return m.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const upcomingMeetings = filteredMeetings.filter(m => !isPast(new Date(m.end_time)));
  const pastMeetings = filteredMeetings.filter(m => isPast(new Date(m.end_time)));

  const renderMeetingCard = (meeting: Meeting, isGuest = false) => {
    const status = getMeetingStatus(meeting);
    const activeCount = presenceData[meeting.id] || 0;
    const isLive = status.label === 'Live Now';

    return (
      <Card 
        key={meeting.id} 
        className={cn(
          "group hover:shadow-xl transition-all duration-300 border-2",
          isLive && "border-green-500 shadow-green-500/20"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{meeting.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge 
                  className={cn(
                    status.color,
                    status.pulse && "animate-pulse"
                  )}
                >
                  {status.label}
                </Badge>
                {isGuest && (
                  <Badge variant="outline">Guest Access</Badge>
                )}
                {isLive && activeCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                    {activeCount} active
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(meeting.start_time), 'PPp')}</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{meeting.location}</span>
              </div>
            )}
            {meeting.meeting_attendees && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{meeting.meeting_attendees.length} attendees</span>
              </div>
            )}
          </div>

          {/* Multi-Device Join Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button 
              onClick={() => joinMeeting(meeting)}
              className={cn(
                "w-full gap-2",
                isLive && "bg-green-500 hover:bg-green-600 animate-pulse"
              )}
            >
              <Play className="h-4 w-4" />
              {isLive ? 'Join Live Meeting' : 'Join Meeting'}
              <Sparkles className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyJoinLink(meeting.id)}
                className="gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy Link
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => shareViaWhatsApp(meeting)}
                className="gap-1"
              >
                <Share2 className="h-3 w-3" />
                Share
              </Button>
            </div>

            {/* Device Indicators */}
            <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                Desktop
              </div>
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
              <div className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                Mobile
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Meeting Hub</CardTitle>
              <p className="text-sm text-muted-foreground">
                Join from anywhere, any device
              </p>
            </div>
          </div>
        </div>

        <Input
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-4"
        />
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastMeetings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map(meeting => 
                    renderMeetingCard(
                      meeting, 
                      guestMeetings.some(g => g.id === meeting.id)
                    )
                  )
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No upcoming meetings
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastMeetings.length > 0 ? (
                  pastMeetings.map(meeting => renderMeetingCard(meeting))
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No past meetings
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

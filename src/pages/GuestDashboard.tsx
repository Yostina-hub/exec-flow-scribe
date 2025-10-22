import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GuestLayout } from "@/components/GuestLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useIsGuest } from "@/hooks/useIsGuest";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Video, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Sparkles,
  ArrowRight,
  MapPin
} from "lucide-react";
import { format } from "date-fns";

interface GuestMeeting {
  id: string;
  meeting_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  meeting?: {
    id: string;
    title?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    status?: string | null;
  } | null;
}

interface AvailableMeeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  hasRequested?: boolean;
  requestStatus?: 'pending' | 'approved' | 'rejected';
}

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { guestName, isGuest, loading: guestLoading } = useIsGuest();
  const [meetings, setMeetings] = useState<GuestMeeting[]>([]);
  const [availableMeetings, setAvailableMeetings] = useState<AvailableMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  // Redirect non-guests to main dashboard
  useEffect(() => {
    if (!guestLoading && !isGuest) {
      navigate("/");
    }
  }, [isGuest, guestLoading, navigate]);

  useEffect(() => {
    fetchGuestMeetings();
    fetchAvailableMeetings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('guest-meetings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_access_requests'
        },
        () => {
          fetchGuestMeetings();
          fetchAvailableMeetings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        () => fetchAvailableMeetings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGuestMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('guest_access_requests')
        .select(`
          *,
          meeting:meetings(id, title, start_time, end_time, location, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMeetings(data as any);
      }
    } catch (error) {
      console.error("Error fetching guest meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get upcoming meetings (next 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const { data: upcomingMeetings, error } = await supabase
        .from('meetings')
        .select('*')
        .gte('start_time', now.toISOString())
        .lte('start_time', thirtyDaysFromNow.toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Get all user's guest access requests to check status
      const { data: userRequests } = await supabase
        .from('guest_access_requests')
        .select('meeting_id, status')
        .eq('user_id', user.id);

      // Map meetings with request status
      const meetingsWithStatus = (upcomingMeetings || []).map(meeting => {
        const request = userRequests?.find(r => r.meeting_id === meeting.id);
        return {
          ...meeting,
          hasRequested: !!request,
          requestStatus: request?.status as 'pending' | 'approved' | 'rejected' | undefined
        };
      });

      setAvailableMeetings(meetingsWithStatus);
    } catch (error) {
      console.error("Error fetching available meetings:", error);
    }
  };

  const handleRequestAccess = async (meetingId: string) => {
    try {
      setRequesting(meetingId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('guest_access_requests')
        .insert({
          meeting_id: meetingId,
          user_id: user.id,
          full_name: guestName || 'Guest User',
          email: user.email || '',
          status: 'pending'
        });

      if (error) throw error;

      // Refresh both lists
      await fetchGuestMeetings();
      await fetchAvailableMeetings();

      // Show success message
      toast({
        title: "Access requested!",
        description: "The meeting host will review your request.",
      });
    } catch (error) {
      console.error("Error requesting access:", error);
      toast({
        title: "Error",
        description: "Failed to request access. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRequesting(null);
    }
  };

  const approvedMeetings = meetings.filter(m => m.status === 'approved');
  const pendingMeetings = meetings.filter(m => m.status === 'pending');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-400" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      rejected: "bg-red-500/20 text-red-300 border-red-500/40"
    };
    
    return (
      <Badge className={`${styles[status as keyof typeof styles]} backdrop-blur-sm border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading || guestLoading) {
    return (
      <GuestLayout guestName={guestName}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout guestName={guestName}>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-blue-900/40 border border-white/10 backdrop-blur-xl p-8 lg:p-12 animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white">
                  Welcome back, {guestName || "Guest"}!
                </h1>
                <p className="text-purple-200/80 text-sm lg:text-base mt-1">
                  Your exclusive meeting access portal
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  <h3 className="text-2xl font-bold text-white">{approvedMeetings.length}</h3>
                </div>
                <p className="text-sm text-white/70">Approved Meetings</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-amber-400/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-6 w-6 text-amber-400" />
                  <h3 className="text-2xl font-bold text-white">{pendingMeetings.length}</h3>
                </div>
                <p className="text-sm text-white/70">Pending Requests</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-6 w-6 text-blue-400" />
                  <h3 className="text-2xl font-bold text-white">{meetings.length}</h3>
                </div>
                <p className="text-sm text-white/70">Total Requests</p>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Meetings */}
        {approvedMeetings.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Your Approved Meetings</h2>
            </div>

            <div className="grid gap-4">
              {approvedMeetings.map((meeting, index) => (
                <Card
                  key={meeting.id}
                  className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-emerald-400/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden animate-scale-in"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  onClick={() => navigate(`/quick-join/${meeting.meeting_id}`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {meeting.meeting?.title || "Meeting"}
                          </h3>
                          {getStatusBadge(meeting.status)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-white/70">
                          {meeting.meeting?.start_time && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-purple-400" />
                              <span>{format(new Date(meeting.meeting.start_time), "PPP")}</span>
                            </div>
                          )}
                          {meeting.meeting?.start_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-pink-400" />
                              <span>{format(new Date(meeting.meeting.start_time), "p")}</span>
                            </div>
                          )}
                          {meeting.meeting?.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-400" />
                              <span>{meeting.meeting.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                          <CheckCircle className="h-4 w-4" />
                          <span>Ready to join</span>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/50 group-hover:shadow-emerald-500/70 transition-all duration-300 group-hover:scale-110"
                      >
                        <Video className="h-5 w-5 mr-2" />
                        Join Now
                        <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pending Meetings */}
        {pendingMeetings.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Pending Approval</h2>
            </div>

            <div className="grid gap-4">
              {pendingMeetings.map((meeting, index) => (
                <Card
                  key={meeting.id}
                  className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-amber-400/50 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white">
                            {meeting.meeting?.title || "Meeting"}
                          </h3>
                          {getStatusBadge(meeting.status)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-white/70">
                          {meeting.meeting?.start_time && (
                            <>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-400" />
                                <span>{format(new Date(meeting.meeting.start_time), "PPP")}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-pink-400" />
                                <span>{format(new Date(meeting.meeting.start_time), "p")}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-amber-300 text-sm">
                          <Clock className="h-4 w-4 animate-pulse" />
                          <span>Awaiting host approval</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Meetings to Request Access */}
        {availableMeetings.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Available Meetings</h2>
            </div>
            <p className="text-white/70 text-sm">Request access to upcoming meetings you'd like to join</p>

            <div className="grid gap-4">
              {availableMeetings.map((meeting, index) => (
                <Card
                  key={meeting.id}
                  className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-400/50 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white">
                            {meeting.title}
                          </h3>
                          {meeting.hasRequested && meeting.requestStatus && getStatusBadge(meeting.requestStatus)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-white/70">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-400" />
                            <span>{format(new Date(meeting.start_time), "PPP")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-pink-400" />
                            <span>{format(new Date(meeting.start_time), "p")}</span>
                          </div>
                          {meeting.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-400" />
                              <span>{meeting.location}</span>
                            </div>
                          )}
                        </div>

                        {!meeting.hasRequested && (
                          <p className="text-sm text-blue-300">
                            Click to request access to this meeting
                          </p>
                        )}
                        {meeting.hasRequested && meeting.requestStatus === 'pending' && (
                          <div className="flex items-center gap-2 text-amber-300 text-sm">
                            <Clock className="h-4 w-4 animate-pulse" />
                            <span>Request pending approval</span>
                          </div>
                        )}
                        {meeting.hasRequested && meeting.requestStatus === 'approved' && (
                          <div className="flex items-center gap-2 text-emerald-300 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span>Access approved! Check "Your Approved Meetings" above</span>
                          </div>
                        )}
                        {meeting.hasRequested && meeting.requestStatus === 'rejected' && (
                          <div className="flex items-center gap-2 text-red-300 text-sm">
                            <XCircle className="h-4 w-4" />
                            <span>Request was declined</span>
                          </div>
                        )}
                      </div>

                      {!meeting.hasRequested && (
                        <Button
                          size="lg"
                          onClick={() => handleRequestAccess(meeting.id)}
                          disabled={requesting === meeting.id}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-105"
                        >
                          {requesting === meeting.id ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Requesting...
                            </>
                          ) : (
                            <>
                              Request Access
                              <ArrowRight className="h-5 w-5 ml-2" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {meetings.length === 0 && availableMeetings.length === 0 && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-12 text-center animate-fade-in">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto">
                <Calendar className="h-10 w-10 text-purple-300" />
              </div>
              <h3 className="text-2xl font-bold text-white">No meetings available</h3>
              <p className="text-white/70">
                There are no upcoming meetings to request access to at the moment. Check back soon!
              </p>
            </div>
          </Card>
        )}
      </div>
    </GuestLayout>
  );
}

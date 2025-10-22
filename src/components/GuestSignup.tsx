import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, Clock } from "lucide-react";

export function GuestSignup() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [reason, setReason] = useState("");
  const [meetings, setMeetings] = useState<any[]>([]);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const { data } = await supabase
      .from('meetings')
      .select('id, title, start_time')
      .gte('start_time', now.toISOString())
      .lte('start_time', twoHoursFromNow.toISOString())
      .order('start_time', { ascending: true })
      .limit(20);
    
    if (data) setMeetings(data);
  };

  const handleGuestSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Then create the access request
      const { error: requestError } = await supabase
        .from('guest_access_requests')
        .insert({
          user_id: authData.user.id,
          meeting_id: meetingId,
          full_name: fullName,
          email: email,
          reason: reason,
          status: 'pending'
        });

      if (requestError) throw requestError;

      // Send confirmation email to guest
      try {
        await supabase.functions.invoke('send-guest-request-confirmation', {
          body: {
            guestEmail: email,
            guestName: fullName,
            meetingTitle: meetings.find(m => m.id === meetingId)?.title || 'Meeting',
            meetingStartTime: meetings.find(m => m.id === meetingId)?.start_time || new Date().toISOString(),
          },
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't throw - request was still created successfully
      }

      setRequestSubmitted(true);
      toast({
        title: "Request submitted!",
        description: "Your access request is pending admin approval. You'll be notified once approved.",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (requestSubmitted) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Request Submitted</CardTitle>
          <CardDescription>
            Your guest access request is pending approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-sm font-medium text-blue-900 mb-2">
              What happens next?
            </p>
            <ol className="text-sm text-blue-700 space-y-2 text-left">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>An administrator will review your request</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Once approved, you'll receive a quick access link</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Use that link to join the meeting directly</span>
              </li>
            </ol>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Check your email for the access link once approved. You can also sign in with your credentials to view meeting details.
          </p>
          <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <CardTitle>Guest Access Request</CardTitle>
        </div>
        <CardDescription>
          Request access to a meeting as a guest
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGuestSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullname">Full Name</Label>
            <Input
              id="fullname"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting">Meeting</Label>
            <Select value={meetingId} onValueChange={setMeetingId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a meeting" />
              </SelectTrigger>
              <SelectContent>
                {meetings.map((meeting) => (
                  <SelectItem key={meeting.id} value={meeting.id}>
                    {meeting.title} - {new Date(meeting.start_time).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Access (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you requesting access to this meeting?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || !meetingId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>

          <Button 
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate("/auth")}
          >
            Back to Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

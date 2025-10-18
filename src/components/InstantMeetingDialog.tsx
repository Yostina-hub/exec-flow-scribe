import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Video } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { generateGoogleMeetLink, generateJitsiMeetLink } from '@/utils/videoConference';

export function InstantMeetingDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateInstant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get('title') as string || 'Quick Meeting';
      const duration = parseInt(formData.get('duration') as string);
      const videoProvider = formData.get('video_provider') as string;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60000);
      let videoUrl = '';

      // Handle Google Meet with OAuth
      if (videoProvider === 'google_meet') {
        try {
          // Get authorization URL
          const { data: authData, error: authError } = await supabase.functions.invoke(
            'google-meet-auth',
            { body: { action: 'getAuthUrl' } }
          );

          if (authError) throw authError;

          // Open OAuth popup
          const authWindow = window.open(
            authData.authUrl,
            'Google OAuth',
            'width=500,height=600'
          );

          if (!authWindow) {
            throw new Error('Popup blocked. Please allow popups for this site.');
          }

          // Wait for OAuth completion
          const code = await new Promise<string>((resolve, reject) => {
            const checkInterval = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(checkInterval);
                reject(new Error('Authentication cancelled'));
              }
              try {
                const url = new URL(authWindow.location.href);
                if (url.searchParams.get('code')) {
                  const authCode = url.searchParams.get('code');
                  authWindow.close();
                  clearInterval(checkInterval);
                  if (authCode) resolve(authCode);
                  else reject(new Error('No code received'));
                }
              } catch {
                // Cross-origin error - still loading
              }
            }, 500);

            setTimeout(() => {
              clearInterval(checkInterval);
              if (!authWindow.closed) authWindow.close();
              reject(new Error('Authentication timeout'));
            }, 120000); // 2 minute timeout
          });

          // Exchange code for token
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
            'google-meet-auth',
            { body: { action: 'exchangeCode', code } }
          );

          if (tokenError) throw tokenError;

          // Create Meeting with Google Calendar
          const { data: meetData, error: meetError } = await supabase.functions.invoke(
            'google-meet-auth',
            {
              body: {
                action: 'createMeeting',
                meetingData: {
                  accessToken: tokenData.accessToken,
                  title,
                  startTime: startTime.toISOString(),
                  endTime: endTime.toISOString(),
                  description: 'Instant meeting',
                }
              }
            }
          );

          if (meetError) throw meetError;
          videoUrl = meetData.meetLink;
          
          toast.success('Google Meet link created!');
        } catch (error: any) {
          console.error('Google Meet error:', error);
          toast.error('Google Meet setup failed. Using Jitsi instead.');
          videoUrl = generateJitsiMeetLink(title, crypto.randomUUID());
        }
      } else {
        // Use Jitsi Meet
        videoUrl = generateJitsiMeetLink(title, crypto.randomUUID());
      }

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: 'Virtual',
          description: 'Instant meeting',
          created_by: user.id,
          status: 'in_progress' as any,
          meeting_type: 'online' as any,
          video_conference_url: videoUrl,
          video_provider: videoProvider as any,
          timezone: 'Africa/Addis_Ababa',
          is_recurring: false,
        } as any)
        .select()
        .single();

      if (meetingError) throw meetingError;

      await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          role: 'required',
          attendance_confirmed: true,
        });

      toast.success('Instant meeting created!');
      setOpen(false);
      navigate(`/meetings/${meeting.id}`);
      
      if (videoUrl) {
        window.open(videoUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating instant meeting:', error);
      toast.error('Failed to create instant meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Zap className="h-4 w-4" />
          Instant Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Start Instant Meeting
          </DialogTitle>
          <DialogDescription>
            Create and join a video meeting right now
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateInstant}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Quick sync meeting"
                defaultValue="Quick Meeting"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select defaultValue="30" name="duration">
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_provider">Video Platform</Label>
              <Select defaultValue="jitsi_meet" name="video_provider">
                <SelectTrigger id="video_provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jitsi_meet">Jitsi Meet (Instant)</SelectItem>
                  <SelectItem value="google_meet">Google Meet (with OAuth)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
              <p className="font-semibold mb-1">What happens next:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Meeting starts immediately</li>
                <li>Video link opens in new tab</li>
                <li>You can invite others from meeting page</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Zap className="h-4 w-4" />
              {loading ? 'Starting...' : 'Start Now'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

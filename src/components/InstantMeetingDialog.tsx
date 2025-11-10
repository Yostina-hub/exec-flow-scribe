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
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Video, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';


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
      let finalProvider = videoProvider; // Track the actual provider used

      // Handle Google Meet with OAuth
      if (videoProvider === 'google_meet') {
        try {
          // Store meeting data in sessionStorage for callback
          const tempMeetingData = {
            title,
            duration,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            userId: user.id,
          };
          sessionStorage.setItem('pendingInstantMeeting', JSON.stringify(tempMeetingData));

          // Get authorization URL and redirect
          const { data: authData, error: authError } = await supabase.functions.invoke(
            'google-meet-auth',
            { body: { action: 'getAuthUrl' } }
          );

          if (authError) throw authError;

          // Redirect to Google OAuth
          window.location.href = authData.authUrl;
          return; // Don't continue, we're redirecting
        } catch (error: any) {
          console.error('Google Meet error:', error);
          toast({
            title: 'Google Meet setup failed',
            description: 'Please provide a meeting URL.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
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
          meeting_type: 'video_conference' as any,
          video_conference_url: videoUrl,
          video_provider: finalProvider as any,
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

      toast({
        title: 'Instant meeting created!',
        description: 'Meeting is ready to join',
      });
      setOpen(false);
      navigate('/meetings');
    } catch (error: any) {
      console.error('Error creating instant meeting:', error);
      toast({
        title: 'Failed to create instant meeting',
        description: error.message,
        variant: 'destructive',
      });
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Start Instant Meeting
          </DialogTitle>
          <DialogDescription>
            Create and join a video meeting right now
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateInstant} className="flex flex-col overflow-hidden">
          <div className="grid gap-4 py-4 overflow-y-auto pr-2">
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
              <Select defaultValue="tmeet" name="video_provider">
                <SelectTrigger id="video_provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tmeet">TMeet (Instant)</SelectItem>
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
          <DialogFooter className="mt-4 flex-shrink-0">
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

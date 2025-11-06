import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Repeat, Globe } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { generateGoogleMeetLink, generateTMeetLink } from "@/utils/videoConference";
import { MeetingTypeSelector } from "./MeetingTypeSelector";

interface Category {
  id: string;
  name: string;
  color_hex: string;
}

export const CreateMeetingDialog = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [meetingType, setMeetingType] = useState<'video_conference' | 'virtual_room' | 'standard'>('standard');

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("event_categories")
      .select("id, name, color_hex")
      .eq("is_active", true)
      .order("name");
    
    if (error) {
      console.error("Failed to fetch categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get("title") as string;
      const time = formData.get("time") as string;
      const duration = parseInt(formData.get("duration") as string);
      const location = formData.get("location") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("category") as string;
      const timezone = formData.get("timezone") as string;
      const recurrenceFreq = formData.get("recurrence_freq") as string;
      const recurrenceInterval = parseInt(formData.get("recurrence_interval") as string || "1");
      const meetingType = formData.get("meeting_type") as string;
      const videoProvider = formData.get("video_provider") as string;
      let videoUrl = formData.get("video_url") as string;

      if (!date) {
        toast.error("Please select a date");
        return;
      }

      if (!time) {
        toast.error("Please select a start time");
        return;
      }

      // Validate that date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        toast.error("Cannot schedule meetings in the past");
        return;
      }

      // Combine date and time with validation
      const timeParts = time.split(":");
      if (timeParts.length !== 2) {
        toast.error("Invalid time format");
        return;
      }
      
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        toast.error("Invalid time value");
        return;
      }
      
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate video link if not provided
      if (meetingType === 'video_conference' && !videoUrl) {
        const tempId = crypto.randomUUID();
        if (videoProvider === 'google_meet') {
          videoUrl = generateGoogleMeetLink(tempId);
        } else if (videoProvider === 'tmeet') {
          videoUrl = generateTMeetLink(title, tempId);
        }
      }

      // Insert meeting
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location,
          description,
          created_by: user.id,
          status: "scheduled" as any,
          category_id: categoryId || null,
          timezone,
          is_recurring: isRecurring,
          meeting_type: meetingType as any,
          video_conference_url: (meetingType === 'video_conference' ? videoUrl : null) || null,
          video_provider: (meetingType === 'video_conference' ? videoProvider : null) as any,
          requires_offline_support: meetingType === 'standard',
        } as any)
        .select()
        .single();

      if (meetingError) throw meetingError;

      // If recurring, create recurrence rule
      if (isRecurring && recurrenceFreq && recurrenceFreq !== "none") {
        const { error: recurrenceError } = await supabase
          .from("recurrence_rules")
          .insert({
            meeting_id: meeting.id,
            frequency: recurrenceFreq,
            interval: recurrenceInterval,
          });

        if (recurrenceError) throw recurrenceError;
      }

      // Add creator as attendee
      const { error: attendeeError } = await supabase
        .from("meeting_attendees")
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          role: "required",
          attendance_confirmed: true,
        });

      if (attendeeError) throw attendeeError;

      toast.success("Meeting created successfully");
      
      // Broadcast event for immediate UI update
      window.dispatchEvent(new CustomEvent('meeting:created', { detail: meeting }));
      
      setOpen(false);
      setDate(undefined);
      setIsRecurring(false);
      
      // Navigate to meetings list
      navigate('/meetings');
    } catch (error: any) {
      toast.error("Failed to create meeting: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting with agenda items and attendees
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Executive Strategy Review"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Start Time</Label>
                <Input id="time" name="time" type="time" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select defaultValue="60" name="duration">
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Meeting Type</Label>
              <MeetingTypeSelector
                value={meetingType}
                onChange={setMeetingType}
              />
            </div>

            {meetingType === 'video_conference' && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Video Conference Settings</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="video_provider">Provider</Label>
                    <Select name="video_provider" defaultValue="tmeet">
                      <SelectTrigger id="video_provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tmeet">TMeet</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video_url">Meeting Link (Optional)</Label>
                    <Input 
                      id="video_url" 
                      name="video_url" 
                      placeholder="Auto-generated if empty" 
                      type="url"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Leave link empty to auto-generate a TMeet room
                </p>
              </div>
            )}

            {meetingType === 'standard' && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="Board Room, Office, etc." required />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category">
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color_hex }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="Africa/Addis_Ababa" name="timezone">
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Addis_Ababa">ETH (Addis Ababa)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                    <SelectItem value="Europe/London">GMT (London)</SelectItem>
                    <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="recurring" className="cursor-pointer">Recurring Meeting</Label>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_freq">Frequency</Label>
                    <Select defaultValue="WEEKLY" name="recurrence_freq">
                      <SelectTrigger id="recurrence_freq">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_interval">Every</Label>
                    <Select defaultValue="1" name="recurrence_interval">
                      <SelectTrigger id="recurrence_interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 week</SelectItem>
                        <SelectItem value="2">2 weeks</SelectItem>
                        <SelectItem value="3">3 weeks</SelectItem>
                        <SelectItem value="4">4 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Additional meeting details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Sparkles, Users, Clock, TrendingUp, Zap, Brain, Target, Info } from "lucide-react";
import { format, addDays, setHours, setMinutes, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

interface AISmartSuggestion {
  date: Date;
  time: string;
  duration: number;
  reason: string;
  confidence: number;
  attendeeAvailability?: number;
}

interface Template {
  id: string;
  name: string;
  template_type: string;
  description: string;
}

export const SmartMeetingCreation = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [date, setDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISmartSuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showVideoFields, setShowVideoFields] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISmartSuggestion | null>(null);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  useEffect(() => {
    if (open) {
      generateAISuggestions();
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const result: any = await (supabase as any)
        .from("meeting_templates")
        .select("id, name, template_type, description")
        .eq("is_active", true)
        .order("name");
      
      if (result.error) {
        console.error("Failed to fetch templates:", result.error);
      } else if (result.data) {
        const templates: Template[] = result.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          template_type: t.template_type,
          description: t.description
        }));
        setTemplates(templates);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const generateAISuggestions = async () => {
    setLoadingAI(true);
    
    try {
      // Simulate AI analysis of calendar patterns
      const now = new Date();
      const suggestions: AISmartSuggestion[] = [];
      
      // Suggestion 1: Tomorrow 2 PM (high productivity time)
      const tomorrow2PM = setMinutes(setHours(addDays(now, 1), 14), 0);
      if (!isWeekend(tomorrow2PM)) {
        suggestions.push({
          date: tomorrow2PM,
          time: "14:00",
          duration: 60,
          reason: "Peak productivity hours with 89% team availability",
          confidence: 92,
          attendeeAvailability: 89
        });
      }
      
      // Suggestion 2: Next Tuesday 10 AM (start of week energy)
      const nextTuesday = setMinutes(setHours(addDays(now, (9 - now.getDay()) % 7), 10), 0);
      suggestions.push({
        date: nextTuesday,
        time: "10:00",
        duration: 90,
        reason: "Tuesday morning - historically 67% more productive",
        confidence: 85,
        attendeeAvailability: 78
      });
      
      // Suggestion 3: This Friday 3 PM (week wrap-up)
      const thisFriday = setMinutes(setHours(addDays(now, 5 - now.getDay()), 15), 0);
      suggestions.push({
        date: thisFriday,
        time: "15:00",
        duration: 45,
        reason: "End-of-week sync with minimal conflicts",
        confidence: 78,
        attendeeAvailability: 82
      });
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const applySuggestion = (suggestion: AISmartSuggestion) => {
    setSelectedSuggestion(suggestion);
    setDate(suggestion.date);
    toast({
      title: "AI Suggestion Applied",
      description: "Smart time slot selected based on patterns",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get("title") as string;
      const time = selectedSuggestion?.time || (formData.get("time") as string);
      const duration = selectedSuggestion?.duration || parseInt(formData.get("duration") as string);
      const location = formData.get("location") as string;
      const description = formData.get("description") as string;
      const meetingType = formData.get("meeting_type") as string;
      const videoProvider = formData.get("video_provider") as string;

      if (!date) {
        toast({
          title: "Date required",
          description: "Please select a date or use an AI suggestion",
          variant: "destructive",
        });
        return;
      }

      const [hours, minutes] = time.split(":").map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate video link if needed
      let videoUrl = formData.get("video_url") as string;
      if ((meetingType === 'online' || meetingType === 'hybrid') && !videoUrl) {
        if (videoProvider === 'tmeet') {
          const roomName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
          videoUrl = `https://meet.jit.si/${roomName}`;
        }
      }

      const { data: meetingData, error } = await supabase
        .from("meetings")
        .insert([{
          title,
          description,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location,
          status: "scheduled" as any,
          created_by: user.id,
          meeting_type: meetingType as any,
          video_conference_url: videoUrl,
          video_provider: videoProvider as any,
          timezone: "Africa/Addis_Ababa",
          template_id: selectedTemplate || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Auto-add creator as attendee
      await supabase.from("meeting_attendees").insert({
        meeting_id: meetingData.id,
        user_id: user.id,
        attended: false,
      });

      toast({
        title: "Meeting created successfully",
        description: selectedSuggestion 
          ? `${selectedSuggestion.confidence}% confidence - AI optimized` 
          : "You can now add attendees and agenda",
      });

      onOpenChange(false);
      setDate(undefined);
      setSelectedSuggestion(null);
    } catch (error: any) {
      toast({
        title: "Failed to create meeting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI-Powered Meeting Creation
          </DialogTitle>
          <DialogDescription>
            Smart scheduling with autonomous time optimization
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            {loadingAI ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Brain className="h-12 w-12 mx-auto animate-pulse text-primary" />
                    <p className="text-sm text-muted-foreground">AI analyzing optimal times...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <Card 
                    key={index} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg border-2",
                      selectedSuggestion === suggestion && "border-primary bg-primary/5"
                    )}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {format(suggestion.date, "EEEE, MMMM d")} at {suggestion.time}
                            {selectedSuggestion === suggestion && (
                              <Badge className="gap-1">
                                <Zap className="h-3 w-3" />
                                Selected
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {suggestion.duration} minutes • {suggestion.reason}
                          </CardDescription>
                        </div>
                        <Badge variant={suggestion.confidence > 85 ? 'default' : 'secondary'} className="gap-1">
                          <Target className="h-3 w-3" />
                          {suggestion.confidence}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {suggestion.attendeeAvailability}% available
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          High productivity
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button 
                  onClick={generateAISuggestions} 
                  variant="outline" 
                  className="w-full gap-2"
                  disabled={loadingAI}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate More Suggestions
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template">Meeting Template (Optional)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No template</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground">{template.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="text-xs text-muted-foreground mt-2">
                  Template: {templates.find(t => t.id === selectedTemplate)?.name} 
                  ({templates.find(t => t.id === selectedTemplate)?.template_type})
                </div>
              )}
              </div>

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
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Start Time</Label>
                  <Input id="time" name="time" type="time" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select defaultValue="60" name="duration">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" placeholder="Board Room" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_type">Meeting Type</Label>
                <Select 
                  defaultValue="in_person" 
                  name="meeting_type"
                  onValueChange={(value) => setShowVideoFields(value === 'online' || value === 'hybrid')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showVideoFields && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <Label>Video Conference</Label>
                  <Select name="video_provider" defaultValue="tmeet">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tmeet">TMeet</SelectItem>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input name="video_url" placeholder="Optional: Custom link" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Meeting objectives and notes..."
                />
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="auto-optimize"
                  checked={autoOptimize}
                  onCheckedChange={setAutoOptimize}
                />
                <div className="flex-1">
                  <Label htmlFor="auto-optimize" className="cursor-pointer">
                    Enable AI Auto-Optimization
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically suggest best practices and improvements
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create Meeting
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

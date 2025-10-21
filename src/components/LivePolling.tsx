import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Plus, X, CheckCircle2, Circle } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  poll_type: string;
  options: Array<{ id: string; text: string }>;
  allow_multiple: boolean;
  anonymous: boolean;
  status: string;
  created_by: string;
  responses?: PollResponse[];
}

interface PollResponse {
  id: string;
  user_id: string;
  selected_options: string[];
  profiles?: {
    full_name: string;
  };
}

interface LivePollingProps {
  meetingId: string;
  isHost: boolean;
}

export function LivePolling({ meetingId, isHost }: LivePollingProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pollType, setPollType] = useState("multiple_choice");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolls();

    const channel = supabase
      .channel('polls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_polls',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchPolls();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_responses',
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchPolls = async () => {
    const { data: pollsData, error } = await supabase
      .from("meeting_polls")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching polls:", error);
      return;
    }

    if (!pollsData) return;

    // Fetch responses for each poll
    const pollsWithResponses = await Promise.all(
      pollsData.map(async (poll) => {
        const { data: responses } = await supabase
          .from("poll_responses")
          .select("id, user_id, selected_options")
          .eq("poll_id", poll.id);

        // Parse options from Json to proper format
        let parsedOptions: Array<{ id: string; text: string }> = [];
        if (Array.isArray(poll.options)) {
          parsedOptions = poll.options.map((opt: any) => ({
            id: opt.id || '',
            text: opt.text || '',
          }));
        }

        return {
          ...poll,
          options: parsedOptions,
          responses: responses || [],
        };
      })
    );

    setPolls(pollsWithResponses as Poll[]);
  };

  const createPoll = async () => {
    if (!question.trim() || options.filter((o) => o.trim()).length < 2) {
      toast({
        title: "Invalid poll",
        description: "Please provide a question and at least 2 options",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const pollOptions = options
      .filter((o) => o.trim())
      .map((text, index) => ({
        id: `opt_${index}`,
        text: text.trim(),
      }));

    const { error } = await supabase
      .from("meeting_polls")
      .insert({
        meeting_id: meetingId,
        created_by: user.id,
        question,
        poll_type: pollType,
        options: pollOptions,
        allow_multiple: allowMultiple,
        anonymous,
        status: "active",
        started_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Poll created",
      description: "Participants can now vote",
    });

    setIsCreateOpen(false);
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setAnonymous(false);
  };

  const submitVote = async (pollId: string, selectedOptions: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("poll_responses")
      .upsert({
        poll_id: pollId,
        user_id: user.id,
        selected_options: selectedOptions,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Vote submitted",
      description: "Your response has been recorded",
    });
  };

  const closePoll = async (pollId: string) => {
    const { error } = await supabase
      .from("meeting_polls")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", pollId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to close poll",
        variant: "destructive",
      });
    }
  };

  const calculateResults = (poll: Poll) => {
    const results: Record<string, number> = {};
    poll.options.forEach((opt) => {
      results[opt.id] = 0;
    });

    poll.responses?.forEach((response) => {
      response.selected_options.forEach((optId) => {
        results[optId] = (results[optId] || 0) + 1;
      });
    });

    return results;
  };

  const getUserVote = (poll: Poll, userId: string) => {
    return poll.responses?.find((r) => r.user_id === userId)?.selected_options || [];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Live Polling
            </CardTitle>
            <CardDescription>Create and respond to polls during the meeting</CardDescription>
          </div>
          {isHost && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Poll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Poll</DialogTitle>
                  <DialogDescription>Ask a question and let participants vote</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question">Question</Label>
                    <Input
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What should we prioritize next?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pollType">Poll Type</Label>
                    <Select value={pollType} onValueChange={setPollType}>
                      <SelectTrigger id="pollType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="yes_no">Yes/No</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {pollType === "multiple_choice" && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...options];
                              newOptions[index] = e.target.value;
                              setOptions(newOptions);
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                          {options.length > 2 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setOptions(options.filter((_, i) => i !== index))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOptions([...options, ""])}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowMultiple">Allow multiple selections</Label>
                    <Switch
                      id="allowMultiple"
                      checked={allowMultiple}
                      onCheckedChange={setAllowMultiple}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="anonymous">Anonymous responses</Label>
                    <Switch
                      id="anonymous"
                      checked={anonymous}
                      onCheckedChange={setAnonymous}
                    />
                  </div>

                  <Button onClick={createPoll} className="w-full">
                    Create Poll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {polls.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No polls yet. {isHost && "Create one to get started!"}
              </p>
            )}
            {polls.map((poll) => {
              const results = calculateResults(poll);
              const totalVotes = poll.responses?.length || 0;
              const userVote = getUserVote(poll, "");

              return (
                <Card key={poll.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{poll.question}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={poll.status === "active" ? "default" : "secondary"}>
                            {poll.status}
                          </Badge>
                          <Badge variant="outline">{totalVotes} votes</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {poll.options.map((option) => {
                      const votes = results[option.id] || 0;
                      const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                      const isSelected = userVote.includes(option.id);

                      return (
                        <div key={option.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span>{option.text}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {votes} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}

                    {poll.status === "active" && (
                      <div className="flex gap-2 pt-2">
                        {isHost && (
                          <Button onClick={() => closePoll(poll.id)} size="sm" variant="outline">
                            Close Poll
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

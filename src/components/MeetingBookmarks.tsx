import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Plus, Trash2, Clock } from "lucide-react";

interface MeetingBookmark {
  id: string;
  title: string;
  timestamp_seconds: number;
  description: string | null;
  bookmark_type: string;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface MeetingBookmarksProps {
  meetingId: string;
  currentTimestamp?: number;
  onSeek?: (seconds: number) => void;
}

export function MeetingBookmarks({ meetingId, currentTimestamp = 0, onSeek }: MeetingBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<MeetingBookmark[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bookmarkType, setBookmarkType] = useState("general");
  const [timestamp, setTimestamp] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserId();
    fetchBookmarks();

    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_bookmarks',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  useEffect(() => {
    setTimestamp(Math.floor(currentTimestamp));
  }, [currentTimestamp]);

  const fetchUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchBookmarks = async () => {
    const { data, error } = await supabase
      .from("meeting_bookmarks")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("timestamp_seconds", { ascending: true });

    if (error) {
      console.error("Error fetching bookmarks:", error);
      return;
    }

    if (!data) return;

    // Fetch profile for each bookmark
    const bookmarksWithProfiles = await Promise.all(
      data.map(async (bookmark) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", bookmark.created_by)
          .single();

        return {
          ...bookmark,
          profiles: profile,
        };
      })
    );

    setBookmarks(bookmarksWithProfiles);
  };

  const createBookmark = async () => {
    if (!title.trim() || !userId) return;

    const { error } = await supabase
      .from("meeting_bookmarks")
      .insert({
        meeting_id: meetingId,
        created_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        timestamp_seconds: timestamp,
        bookmark_type: bookmarkType,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create bookmark",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Bookmark added",
      description: "You can now quickly navigate to this moment",
    });

    setIsCreateOpen(false);
    setTitle("");
    setDescription("");
    setBookmarkType("general");
  };

  const deleteBookmark = async (bookmarkId: string) => {
    const { error } = await supabase
      .from("meeting_bookmarks")
      .delete()
      .eq("id", bookmarkId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete bookmark",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getBookmarkTypeColor = (type: string) => {
    switch (type) {
      case "decision": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "action": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "highlight": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Meeting Bookmarks
            </CardTitle>
            <CardDescription>
              Mark important moments for easy navigation
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bookmark
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Bookmark</DialogTitle>
                <DialogDescription>
                  Mark this moment in the meeting recording
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timestamp">Timestamp</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="timestamp"
                      type="number"
                      value={timestamp}
                      onChange={(e) => setTimestamp(parseInt(e.target.value) || 0)}
                      placeholder="Seconds"
                    />
                    <Badge variant="outline">{formatTimestamp(timestamp)}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Key decision made"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional context..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookmarkType">Type</Label>
                  <Select value={bookmarkType} onValueChange={setBookmarkType}>
                    <SelectTrigger id="bookmarkType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="decision">Decision</SelectItem>
                      <SelectItem value="action">Action Item</SelectItem>
                      <SelectItem value="highlight">Highlight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createBookmark} className="w-full" disabled={!title.trim()}>
                  Create Bookmark
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {bookmarks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No bookmarks yet. Add one to mark important moments!
              </p>
            )}
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getBookmarkTypeColor(bookmark.bookmark_type)}>
                          {bookmark.bookmark_type}
                        </Badge>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimestamp(bookmark.timestamp_seconds)}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm">{bookmark.title}</h4>
                      {bookmark.description && (
                        <p className="text-xs text-muted-foreground">{bookmark.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Added by {bookmark.profiles?.full_name}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {onSeek && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSeek(bookmark.timestamp_seconds)}
                        >
                          Go to
                        </Button>
                      )}
                      {bookmark.created_by === userId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteBookmark(bookmark.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StickyNote, Pin, ThumbsUp, Heart, HelpCircle, AlertCircle, Trash2 } from "lucide-react";

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_by: string;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  reactions?: NoteReaction[];
}

interface NoteReaction {
  id: string;
  user_id: string;
  reaction_type: string;
}

interface CollaborativeNotesProps {
  meetingId: string;
}

export function CollaborativeNotes({ meetingId }: CollaborativeNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserId();
    fetchNotes();

    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_notes',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchNotes();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_reactions',
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchNotes = async () => {
    const { data: notesData, error } = await supabase
      .from("meeting_notes")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }

    if (!notesData) return;

    // Fetch profile and reactions for each note
    const notesWithDetails = await Promise.all(
      notesData.map(async (note) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", note.created_by)
          .single();

        const { data: reactions } = await supabase
          .from("note_reactions")
          .select("*")
          .eq("note_id", note.id);

        return {
          ...note,
          profiles: profile,
          reactions: reactions || [],
        };
      })
    );

    setNotes(notesWithDetails);
  };

  const createNote = async () => {
    if (!newNote.trim() || !userId) return;

    const { error } = await supabase
      .from("meeting_notes")
      .insert({
        meeting_id: meetingId,
        created_by: userId,
        content: newNote.trim(),
        note_type: noteType,
        timestamp_reference: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
      return;
    }

    setNewNote("");
    toast({
      title: "Note added",
      description: "Your note has been shared with participants",
    });
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from("meeting_notes")
      .update({ is_pinned: !currentPinned })
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("meeting_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const toggleReaction = async (noteId: string, reactionType: string) => {
    if (!userId) return;

    const existingReaction = notes
      .find((n) => n.id === noteId)
      ?.reactions?.find((r) => r.user_id === userId && r.reaction_type === reactionType);

    if (existingReaction) {
      await supabase
        .from("note_reactions")
        .delete()
        .eq("id", existingReaction.id);
    } else {
      await supabase
        .from("note_reactions")
        .insert({
          note_id: noteId,
          user_id: userId,
          reaction_type: reactionType,
        });
    }
  };

  const getReactionIcon = (type: string) => {
    switch (type) {
      case "thumbs_up": return <ThumbsUp className="h-4 w-4" />;
      case "heart": return <Heart className="h-4 w-4" />;
      case "question": return <HelpCircle className="h-4 w-4" />;
      case "important": return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case "action": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "decision": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "question": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Collaborative Notes
        </CardTitle>
        <CardDescription>
          Share notes and thoughts with all participants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Note</SelectItem>
              <SelectItem value="action">Action Item</SelectItem>
              <SelectItem value="decision">Decision</SelectItem>
              <SelectItem value="question">Question</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note to share with everyone..."
            rows={3}
          />
          <Button onClick={createNote} className="w-full" disabled={!newNote.trim()}>
            Add Note
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No notes yet. Be the first to add one!
              </p>
            )}
            {notes.map((note) => (
              <Card key={note.id} className={note.is_pinned ? "border-primary" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getNoteTypeColor(note.note_type)}>
                          {note.note_type}
                        </Badge>
                        {note.is_pinned && (
                          <Badge variant="secondary">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.profiles?.full_name} • {new Date(note.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {note.created_by === userId && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => togglePin(note.id, note.is_pinned)}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {["thumbs_up", "heart", "question", "important"].map((type) => {
                      const count = note.reactions?.filter((r) => r.reaction_type === type).length || 0;
                      const isActive = note.reactions?.some(
                        (r) => r.user_id === userId && r.reaction_type === type
                      );

                      return (
                        <Button
                          key={type}
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          onClick={() => toggleReaction(note.id, type)}
                          className="gap-1"
                        >
                          {getReactionIcon(type)}
                          {count > 0 && <span className="text-xs">{count}</span>}
                        </Button>
                      );
                    })}
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

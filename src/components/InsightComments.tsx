import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

interface InsightCommentsProps {
  insightId: string;
}

interface CommentRow {
  id: string;
  insight_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export const InsightComments = ({ insightId }: InsightCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("notebook_comments")
      .select("*")
      .eq("insight_id", insightId)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`comments-${insightId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notebook_comments', filter: `insight_id=eq.${insightId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [insightId]);

  const add = async () => {
    if (!newComment.trim() || !user?.id) return;
    setLoading(true);
    await supabase.from("notebook_comments").insert({
      insight_id: insightId,
      user_id: user.id,
      content: newComment.trim(),
    });
    setNewComment("");
    setLoading(false);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="space-y-2">
        {comments.map((c) => (
          <Card key={c.id} className="p-3 bg-muted/30">
            <div className="text-sm">{c.content}</div>
            <div className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</div>
          </Card>
        ))}
        {comments.length === 0 && (
          <div className="text-xs text-muted-foreground">No comments yet</div>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button onClick={add} disabled={loading || !newComment.trim()}>Comment</Button>
      </div>
    </div>
  );
};

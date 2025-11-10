import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SummaryRatingWidgetProps {
  summaryId: string;
  currentRating?: number;
}

export const SummaryRatingWidget = ({ summaryId, currentRating }: SummaryRatingWidgetProps) => {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('summary_quality_metrics')
        .update({
          user_rating: rating,
          feedback_text: feedback || null,
          rated_at: new Date().toISOString()
        })
        .eq('summary_id', summaryId);

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "Your feedback helps improve our AI summaries"
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Failed to submit",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Star className={`h-4 w-4 ${currentRating ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {currentRating ? `${currentRating}/5` : 'Rate'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Rate this summary</h4>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Additional feedback (optional)
            </label>
            <Textarea
              placeholder="What did you like or what could be improved?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleRatingSubmit}
            disabled={isSubmitting || rating === 0}
            className="w-full"
          >
            Submit Feedback
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

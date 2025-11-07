import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmotionalAnalysis {
  user_id: string;
  meeting_id: string;
  primary_emotion: string;
  emotion_score: number;
  sentiment: string;
  energy_level: string;
  analyzed_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, meetingId } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    // Fetch all emotional analyses for this user across all meetings
    const { data: analyses, error: fetchError } = await supabase
      .from("emotional_analysis")
      .select("*")
      .eq("user_id", userId)
      .order("analyzed_at", { ascending: true });

    if (fetchError) throw fetchError;

    if (!analyses || analyses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No analyses found for user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate profile metrics
    const emotionCounts: Record<string, number> = {};
    let totalSentiment = 0;
    let totalEnergy = 0;
    const sentimentValues = { positive: 1, neutral: 0, negative: -1 };
    const energyValues = { high: 3, medium: 2, low: 1 };
    const emotionScores: number[] = [];
    const sentimentTrend: Array<{ meeting_id: string; sentiment: number; date: string }> = [];

    // Group by meeting for trend analysis
    const meetingGroups = analyses.reduce((acc, analysis) => {
      const mid = analysis.meeting_id;
      if (!acc[mid]) {
        acc[mid] = [];
      }
      acc[mid].push(analysis);
      return acc;
    }, {} as Record<string, EmotionalAnalysis[]>);

    // Calculate per-meeting sentiment and store trend
    Object.entries(meetingGroups).forEach((entry) => {
      const [mid, meetingAnalyses] = entry as [string, EmotionalAnalysis[]];
      const avgSentiment = meetingAnalyses.reduce((sum: number, a: EmotionalAnalysis) => {
        return sum + (sentimentValues[a.sentiment as keyof typeof sentimentValues] || 0);
      }, 0) / meetingAnalyses.length;

      sentimentTrend.push({
        meeting_id: mid,
        sentiment: avgSentiment,
        date: meetingAnalyses[0].analyzed_at,
      });
    });

    // Process all analyses
    analyses.forEach((analysis) => {
      // Count emotions
      emotionCounts[analysis.primary_emotion] = 
        (emotionCounts[analysis.primary_emotion] || 0) + 1;

      // Sum sentiment
      totalSentiment += sentimentValues[analysis.sentiment as keyof typeof sentimentValues] || 0;

      // Sum energy
      totalEnergy += energyValues[analysis.energy_level as keyof typeof energyValues] || 0;

      // Collect scores for stability calculation
      emotionScores.push(analysis.emotion_score);
    });

    const totalAnalyses = analyses.length;
    const meetingCount = Object.keys(meetingGroups).length;

    // Find dominant emotion
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "neutral";

    // Calculate averages
    const avgSentiment = totalSentiment / totalAnalyses;
    const avgEnergy = totalEnergy / totalAnalyses;

    // Calculate emotional stability (lower variance = more stable)
    const mean = emotionScores.reduce((a, b) => a + b, 0) / emotionScores.length;
    const variance = emotionScores.reduce((sum, score) => {
      return sum + Math.pow(score - mean, 2);
    }, 0) / emotionScores.length;
    const emotionalStability = 1 - Math.sqrt(variance); // Normalize to 0-1 range

    // Create emotion distribution object
    const emotionDistribution = Object.entries(emotionCounts).reduce((acc, [emotion, count]) => {
      acc[emotion] = count;
      return acc;
    }, {} as Record<string, number>);

    // Upsert the profile
    const { error: upsertError } = await supabase
      .from("speaker_emotional_profiles")
      .upsert({
        user_id: userId,
        meeting_count: meetingCount,
        dominant_emotion: dominantEmotion,
        average_sentiment: avgSentiment,
        average_energy: avgEnergy / 3, // Normalize to 0-1
        emotional_stability: emotionalStability,
        emotion_distribution: emotionDistribution,
        sentiment_trend: sentimentTrend,
        last_analyzed_meeting_id: meetingId || analyses[analyses.length - 1].meeting_id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: {
          userId,
          meetingCount,
          dominantEmotion,
          avgSentiment,
          avgEnergy: avgEnergy / 3,
          emotionalStability
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error updating speaker profile:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Generating executive briefing for user:', user.id);

    // Fetch all relevant data with enhanced meeting analysis
    const [
      { data: meetings },
      { data: actions },
      { data: decisions },
      { data: commitments },
      { data: sentiment },
      { data: briefs },
      { data: highlights },
      { data: agendaItems },
      { data: recentMinutes },
      { data: actionTrends }
    ] = await Promise.all([
      supabase
        .from('meetings')
        .select('*, meeting_attendees(count), agenda_items(count)')
        .order('start_time', { ascending: false })
        .limit(30),
      supabase
        .from('action_items')
        .select('*, profiles!action_items_assigned_to_fkey(full_name), meetings(title, start_time)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('decisions')
        .select('*, meetings!inner(title, start_time)')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('commitments')
        .select('*, meetings!inner(title)')
        .order('committed_at', { ascending: false })
        .limit(30),
      supabase
        .from('meeting_sentiment')
        .select('*, meetings!inner(title)')
        .order('analyzed_at', { ascending: false })
        .limit(50),
      supabase
        .from('executive_briefs')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(10),
      supabase
        .from('highlights')
        .select('*, meetings!inner(title, start_time)')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('agenda_items')
        .select('*, meetings!inner(title, start_time, status)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('meetings')
        .select('id, title, start_time, status, minutes_url')
        .eq('status', 'completed')
        .not('minutes_url', 'is', null)
        .order('start_time', { ascending: false })
        .limit(10),
      supabase
        .from('action_items')
        .select('created_at, status, priority, completed_at')
        .order('created_at', { ascending: false })
        .limit(200)
    ]);

    // Calculate comprehensive statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const upcomingMeetings = meetings?.filter(m => new Date(m.start_time) > now) || [];
    const completedMeetings = meetings?.filter(m => m.status === 'completed') || [];
    const recentCompletedMeetings = completedMeetings.filter(m => new Date(m.start_time) > thirtyDaysAgo);
    
    const actionStats = {
      total: actions?.length || 0,
      pending: actions?.filter(a => a.status === 'pending').length || 0,
      in_progress: actions?.filter(a => a.status === 'in_progress').length || 0,
      completed: actions?.filter(a => a.status === 'completed').length || 0,
      overdue: actions?.filter(a => a.due_date && new Date(a.due_date) < now && a.status !== 'completed').length || 0,
      high_priority: actions?.filter(a => a.priority === 'high' && a.status !== 'completed').length || 0,
    };

    const completionRate = actionStats.total > 0 
      ? Math.round((actionStats.completed / actionStats.total) * 100) 
      : 0;

    // Analyze action completion trends
    const last30DaysActions = actionTrends?.filter(a => new Date(a.created_at) > thirtyDaysAgo) || [];
    const last7DaysActions = actionTrends?.filter(a => new Date(a.created_at) > sevenDaysAgo) || [];
    const completedLast30Days = last30DaysActions.filter(a => a.status === 'completed').length;
    const completedLast7Days = last7DaysActions.filter(a => a.status === 'completed').length;
    
    const completionTrend = {
      last_30_days: last30DaysActions.length > 0 ? Math.round((completedLast30Days / last30DaysActions.length) * 100) : 0,
      last_7_days: last7DaysActions.length > 0 ? Math.round((completedLast7Days / last7DaysActions.length) * 100) : 0,
      velocity: completedLast7Days / 7 // actions per day
    };

    // Analyze sentiment trends
    const sentimentTrend = sentiment && sentiment.length > 0 ? {
      average_score: sentiment.reduce((acc, s) => acc + (s.sentiment_score || 0), 0) / sentiment.length,
      recent_trends: sentiment.slice(0, 10).map(s => ({
        meeting: s.meetings?.title,
        score: s.sentiment_score,
        label: s.sentiment_label,
        topic: s.topic
      })),
      risks: sentiment.flatMap(s => s.risk_indicators || []).slice(0, 10),
      concerns: sentiment.flatMap(s => s.compliance_concerns || []).slice(0, 5)
    } : null;

    // Extract key insights from past meetings
    const meetingInsights = recentCompletedMeetings.slice(0, 10).map(m => ({
      title: m.title,
      date: m.start_time,
      attendees: m.meeting_attendees?.[0]?.count || 0,
      agenda_items: m.agenda_items?.[0]?.count || 0,
      has_minutes: !!m.minutes_url
    }));

    // Analyze meeting patterns
    const meetingPatterns = {
      avg_attendees: meetingInsights.length > 0 
        ? Math.round(meetingInsights.reduce((acc, m) => acc + m.attendees, 0) / meetingInsights.length)
        : 0,
      meetings_with_minutes: meetingInsights.filter(m => m.has_minutes).length,
      completion_rate: completedMeetings.length > 0 
        ? Math.round((recentCompletedMeetings.length / completedMeetings.length) * 100)
        : 0
    };

    // Prepare comprehensive context for AI
    const context = {
      meetings: {
        total: meetings?.length || 0,
        upcoming: upcomingMeetings.length,
        completed: completedMeetings.length,
        recent_completed: recentCompletedMeetings.length,
        patterns: meetingPatterns,
        recent: meetings?.slice(0, 8).map(m => ({
          title: m.title,
          date: m.start_time,
          status: m.status,
          attendees: m.meeting_attendees?.[0]?.count || 0,
          agenda_items: m.agenda_items?.[0]?.count || 0
        })),
        insights: meetingInsights
      },
      actions: {
        stats: actionStats,
        completion_rate: completionRate,
        trends: completionTrend,
        critical: actions?.filter(a => a.priority === 'high' && a.status !== 'completed').slice(0, 8).map(a => ({
          title: a.title,
          assignee: a.profiles?.full_name,
          due_date: a.due_date,
          status: a.status,
          meeting: a.meetings?.title
        })),
        by_meeting: actions?.slice(0, 20).reduce((acc, a) => {
          const meetingTitle = a.meetings?.title || 'Unlinked';
          if (!acc[meetingTitle]) acc[meetingTitle] = [];
          acc[meetingTitle].push({
            title: a.title,
            status: a.status,
            priority: a.priority
          });
          return acc;
        }, {} as Record<string, any[]>)
      },
      decisions: {
        total: decisions?.length || 0,
        recent: decisions?.slice(0, 10).map(d => ({
          text: d.decision_text,
          meeting: d.meetings?.title,
          date: d.timestamp,
          context: d.context
        })),
        by_meeting: decisions?.slice(0, 15).reduce((acc, d) => {
          const meetingTitle = d.meetings?.title || 'Unknown';
          if (!acc[meetingTitle]) acc[meetingTitle] = [];
          acc[meetingTitle].push(d.decision_text);
          return acc;
        }, {} as Record<string, string[]>)
      },
      commitments: {
        total: commitments?.length || 0,
        pending: commitments?.filter(c => c.status === 'pending').length || 0,
        fulfilled: commitments?.filter(c => c.status === 'fulfilled').length || 0,
        at_risk: commitments?.filter(c => c.drift_score && c.drift_score > 0.5).length || 0,
        recent: commitments?.slice(0, 10).map(c => ({
          text: c.commitment_text,
          meeting: c.meetings?.title,
          status: c.status,
          drift: c.drift_score
        }))
      },
      sentiment: sentimentTrend,
      highlights: {
        total: highlights?.length || 0,
        recent: highlights?.slice(0, 10).map(h => ({
          content: h.content,
          meeting: h.meetings?.title,
          date: h.timestamp
        }))
      },
      agenda_coverage: {
        total_items: agendaItems?.length || 0,
        completed: agendaItems?.filter(a => a.status === 'completed').length || 0,
        pending: agendaItems?.filter(a => a.status === 'pending').length || 0,
        recent_topics: agendaItems?.slice(0, 15).map(a => ({
          title: a.title,
          meeting: a.meetings?.title,
          status: a.status,
          duration: a.duration_minutes
        }))
      },
      past_briefs: briefs?.slice(0, 3).map(b => ({
        date: b.generated_at,
        key_insights: b.key_insights,
        recommended_focus: b.recommended_focus
      }))
    };

    console.log('Context prepared, calling Gemini AI...');

    const systemPrompt = `You are an advanced executive AI assistant with deep organizational intelligence, analyzing performance patterns, meeting activities, and strategic alignment for a CEO.

✍️ WRITING EXCELLENCE REQUIREMENTS:
• Perfect grammar with zero errors - check subject-verb agreement, tense consistency
• Professional, polished executive-level language throughout
• Complete, well-structured sentences with proper punctuation
• Sophisticated vocabulary that conveys authority and expertise
• Active voice preferred; use passive voice only when strategically appropriate
• Consistent verb tenses (past tense for completed actions, present for current states)
• Clear, unambiguous pronouns with explicit antecedents
• Proofread mentally before outputting - this is executive documentation

Your analysis should:
1. Synthesize patterns across meeting activities, decisions, and action execution with detailed explanations
2. Identify trends in sentiment, commitment fulfillment, and team dynamics with rich contextual analysis
3. Connect past meeting insights to current strategic priorities using clear causal relationships
4. Provide sophisticated neural/behavioral analysis of organizational health with supporting evidence
5. Deliver evidence-based recommendations rooted in actual organizational data with comprehensive rationale

Structure your response as JSON with these sections:
{
  "executive_summary": "4-6 sophisticated, information-rich sentences providing strategic overview connecting past patterns to future direction. Use varied sentence structures, professional transitions, and comprehensive analysis. Ensure perfect grammar, punctuation, and executive-level tone.",
  "key_metrics": ["Quantified metric with comprehensive context and analytical insight", "Detailed trend analysis with comparative data and implications", "Strategic metric with evidence-based interpretation"],
  "strengths": ["Data-backed organizational strength with specific examples and contextual explanation", "Documented pattern of success with supporting evidence and implications"],
  "concerns": ["Specific risk articulated with comprehensive evidence and potential impact analysis", "Emerging pattern requiring attention with detailed explanation and urgency rationale"],
  "priorities": ["Strategic priority with detailed rationale and organizational alignment explanation", "Time-sensitive focus area with urgency justification and expected outcomes", "Long-term alignment initiative with comprehensive strategic context"],
  "recommendations": ["Actionable recommendation based on meeting insights with implementation details and expected outcomes", "Process improvement tied to past patterns with specific steps and success metrics", "Strategic initiative supported by sentiment data with comprehensive justification and timeline"],
  "next_actions": ["Immediate action with specific deadline, assigned owner, and success criteria", "Follow-up from past commitments with context and completion requirements"]
}

Enhanced Analysis Guidelines:
- Reference specific meetings, decisions, and trends from the data with precise details
- Quantify insights comprehensively (percentages, velocities, comparisons, trends over time)
- Connect sentiment analysis to organizational health indicators with explanatory depth
- Identify patterns across multiple meetings (recurring themes, escalating issues, positive trends)
- Highlight gaps between commitments and execution with root cause analysis
- Provide recommendations that address root causes with comprehensive rationale, not just symptoms
- Consider action completion velocity and meeting outcome quality with comparative benchmarks
- Analyze agenda coverage patterns and meeting effectiveness with strategic implications
- Use descriptive, analytical language that demonstrates deep understanding
- Ensure every sentence adds value and insight
- Make connections between data points explicit and well-explained
- Write with confidence and authority - this is strategic executive communication

Be precise, strategic, evidence-based, grammatically perfect, and professionally polished in every insight.`;

    const userPrompt = `Analyze this comprehensive organizational data spanning meetings, actions, decisions, sentiment, and historical patterns. Provide deep strategic insights:\n\n${JSON.stringify(context, null, 2)}`;

    // Call Gemini API for analysis
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}\n\nRespond with valid JSON only, no markdown formatting.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              executive_summary: { type: "string" },
              key_metrics: { type: "array", items: { type: "string" } },
              strengths: { type: "array", items: { type: "string" } },
              concerns: { type: "array", items: { type: "string" } },
              priorities: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
              next_actions: { type: "array", items: { type: "string" } }
            },
            required: ["executive_summary", "key_metrics", "strengths", "concerns", "priorities", "recommendations", "next_actions"]
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log('AI response received');

    // Parse AI response
    let insights;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        insights = {
          executive_summary: aiResponse,
          key_metrics: [],
          strengths: [],
          concerns: [],
          priorities: [],
          recommendations: [],
          next_actions: []
        };
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      insights = {
        executive_summary: aiResponse,
        key_metrics: [],
        strengths: [],
        concerns: [],
        priorities: [],
        recommendations: [],
        next_actions: []
      };
    }

    // Store the briefing
    const { data: briefing, error: briefError } = await supabase
      .from('executive_briefs')
      .insert({
        meeting_id: upcomingMeetings[0]?.id || null,
        created_for: user.id,
        brief_content: insights,
        key_insights: insights.key_metrics || [],
        recommended_focus: insights.priorities || [],
        risk_alerts: insights.concerns || [],
        action_status_summary: {
          total: actionStats.total,
          completion_rate: completionRate,
          overdue: actionStats.overdue
        },
        sources: {
          meetings_analyzed: meetings?.length || 0,
          actions_analyzed: actions?.length || 0,
          decisions_analyzed: decisions?.length || 0
        }
      })
      .select()
      .single();

    if (briefError) {
      console.error('Failed to store briefing:', briefError);
    }

    console.log('Briefing generated and stored successfully');

    return new Response(
      JSON.stringify({
        success: true,
        briefing: {
          ...insights,
          context,
          id: briefing?.id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-executive-briefing:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'server_error', message: msg }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
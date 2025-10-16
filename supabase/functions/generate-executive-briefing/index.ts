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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    // Fetch all relevant data
    const [
      { data: meetings },
      { data: actions },
      { data: decisions },
      { data: commitments },
      { data: sentiment },
      { data: briefs }
    ] = await Promise.all([
      supabase
        .from('meetings')
        .select('*, meeting_attendees(count), agenda_items(count)')
        .order('start_time', { ascending: false })
        .limit(20),
      supabase
        .from('action_items')
        .select('*, profiles!action_items_assigned_to_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('decisions')
        .select('*, meetings!inner(title)')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('commitments')
        .select('*')
        .order('committed_at', { ascending: false })
        .limit(20),
      supabase
        .from('meeting_sentiment')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(10),
      supabase
        .from('executive_briefs')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(5)
    ]);

    // Calculate statistics
    const now = new Date();
    const upcomingMeetings = meetings?.filter(m => new Date(m.start_time) > now) || [];
    const completedMeetings = meetings?.filter(m => m.status === 'completed') || [];
    
    const actionStats = {
      total: actions?.length || 0,
      pending: actions?.filter(a => a.status === 'pending').length || 0,
      in_progress: actions?.filter(a => a.status === 'in_progress').length || 0,
      completed: actions?.filter(a => a.status === 'completed').length || 0,
      overdue: actions?.filter(a => a.due_date && new Date(a.due_date) < now && a.status !== 'completed').length || 0,
    };

    const completionRate = actionStats.total > 0 
      ? Math.round((actionStats.completed / actionStats.total) * 100) 
      : 0;

    // Prepare context for AI
    const context = {
      meetings: {
        total: meetings?.length || 0,
        upcoming: upcomingMeetings.length,
        completed: completedMeetings.length,
        recent: meetings?.slice(0, 5).map(m => ({
          title: m.title,
          date: m.start_time,
          status: m.status,
          attendees: m.meeting_attendees?.[0]?.count || 0,
          agenda_items: m.agenda_items?.[0]?.count || 0
        }))
      },
      actions: {
        stats: actionStats,
        completion_rate: completionRate,
        critical: actions?.filter(a => a.priority === 'high' && a.status !== 'completed').slice(0, 5).map(a => ({
          title: a.title,
          assignee: a.profiles?.full_name,
          due_date: a.due_date,
          status: a.status
        }))
      },
      decisions: {
        total: decisions?.length || 0,
        recent: decisions?.slice(0, 5).map(d => ({
          text: d.decision_text,
          meeting: d.meetings?.title,
          date: d.timestamp
        }))
      },
      commitments: {
        total: commitments?.length || 0,
        pending: commitments?.filter(c => c.status === 'pending').length || 0,
        fulfilled: commitments?.filter(c => c.status === 'fulfilled').length || 0,
      },
      sentiment: sentiment && sentiment.length > 0 ? {
        average_score: sentiment.reduce((acc, s) => acc + (s.sentiment_score || 0), 0) / sentiment.length,
        risks: sentiment.flatMap(s => s.risk_indicators || []).slice(0, 5)
      } : null
    };

    console.log('Context prepared, calling AI...');

    // Call Lovable AI for analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an executive AI assistant analyzing organizational performance for a CEO. 
Provide concise, actionable insights in a professional executive summary format.
Structure your response as JSON with these sections:
{
  "executive_summary": "2-3 sentence overview",
  "key_metrics": ["metric1", "metric2", "metric3"],
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "priorities": ["priority1", "priority2", "priority3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "next_actions": ["action1", "action2"]
}

Be direct, data-driven, and focus on what matters most to executive decision-making.`
          },
          {
            role: 'user',
            content: `Analyze this organizational data and provide executive insights:\n\n${JSON.stringify(context, null, 2)}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content;

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
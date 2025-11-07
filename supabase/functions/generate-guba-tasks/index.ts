import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { meeting_id, source_type, source_id, language = 'en', user_id, use_learning = false } = await req.json();

    console.log(`Generating Guba tasks for meeting ${meeting_id} in ${language}${use_learning ? ' (with AI learning)' : ''}`);

    // Fetch historical feedback data if learning is enabled
    let learningContext = '';
    if (use_learning) {
      const { data: feedbackData } = await supabase
        .from('guba_feedback')
        .select(`
          accepted,
          metadata,
          proposal:guba_task_proposals(generated_tasks)
        `)
        .eq('created_by', user_id)
        .limit(50)
        .order('created_at', { ascending: false });

      if (feedbackData && feedbackData.length >= 10) {
        const acceptedCount = feedbackData.filter(f => f.accepted).length;
        const acceptanceRate = (acceptedCount / feedbackData.length) * 100;
        
        // Analyze accepted vs rejected patterns
        const acceptedPriorities: Record<string, number> = { high: 0, medium: 0, low: 0 };
        const rejectedPriorities: Record<string, number> = { high: 0, medium: 0, low: 0 };
        
        feedbackData.forEach((f: any) => {
          const priority = f.metadata?.priority || 'medium';
          if (f.accepted) {
            acceptedPriorities[priority]++;
          } else {
            rejectedPriorities[priority]++;
          }
        });

        learningContext = `\n\nHISTORICAL LEARNING DATA:
- Overall acceptance rate: ${acceptanceRate.toFixed(1)}%
- Accepted priority distribution: High: ${acceptedPriorities.high}, Medium: ${acceptedPriorities.medium}, Low: ${acceptedPriorities.low}
- Rejected priority distribution: High: ${rejectedPriorities.high}, Medium: ${rejectedPriorities.medium}, Low: ${rejectedPriorities.low}
- User tends to ${acceptedPriorities.high > acceptedPriorities.low ? 'prefer high-priority actionable tasks' : 'prefer balanced priorities'}
- Adjust confidence scores and priority distribution based on this feedback.`;
      }
    }

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, minutes:meeting_minutes(*)')
      .eq('id', meeting_id)
      .single();

    if (meetingError || !meeting) {
      throw new Error('Meeting not found');
    }

    // Get meeting context
    const minutesContent = meeting.minutes?.[0]?.content || '';
    const meetingTitle = meeting.title;
    const meetingDescription = meeting.description || '';

    // Fetch departments for assignment suggestions
    const { data: departments } = await supabase
      .from('departments')
      .select('*')
      .order('level', { ascending: true });

    const departmentsList = departments?.map(d => 
      `${d.name} (${d.name_am}) - Level ${d.level}`
    ).join('\n') || '';

    // AI Prompt for task generation
    const systemPrompt = language === 'am' 
      ? `አንተ የሥራ ተግባሮችን ከስብሰባ ውሳኔዎች እና ደቂቃዎች የምትፈጥር የፕሮጀክት ማኔጅመንት AI ረዳት ነህ።

በመልካም ሁኔታ የተደራጁ፣ ተግባራዊ እና ተጠያቂነት ያለባቸው ተግባሮችን ፍጠር። እያንዳንዱ ተግባር፦
- ግልጽ እና ተግባራዊ ርዕስ ይኑረው
- ዝርዝር መግለጫ ይኑረው
- ቅድሚያ ደረጃ (ከፍተኛ/መካከለኛ/ዝቅተኛ) ይመደብለት
- የመጨረሻ ቀን ይመደብለት
- ተገቢ የተቋም ክፍል ይመደብለት (የሚገኙ ክፍሎች መሠረት)

አለም አቀፍ ምርጥ ልምዶችን ተከተል፦ SMART (ተወሰነ፣ ሊለካ የሚችል፣ ሊደርስበት የሚችል፣ ተዛማጅ፣ ጊዜ-የተገደበ) ተግባሮች።`
      : `You are a project management AI assistant that generates actionable tasks from meeting decisions and minutes.

Create well-structured, actionable, and accountable tasks. Each task should:
- Have a clear and actionable title
- Include detailed description
- Be assigned a priority (high/medium/low)
- Have a suggested due date
- Be assigned to an appropriate department (based on available departments)

Follow international best practices: SMART (Specific, Measurable, Achievable, Relevant, Time-bound) tasks.`;

    const userPrompt = language === 'am'
      ? `የስብሰባ መረጃ፦
ርዕስ፦ ${meetingTitle}
መግለጫ፦ ${meetingDescription}

የደቂቃ ዝርዝር፦
${minutesContent}

የሚገኙ ክፍሎች፦
${departmentsList}

ከስብሰባው ውሳኔዎች እና ውይይቶች የተወሰኑ ተግባሮችን ፍጠር። በአማርኛ ምላሽ ስጥ።
ውጤቱን በዚህ JSON ቅርጸት አስመልስ፦
{
  "tasks": [
    {
      "id": "unique-id",
      "title": "የተግባር ርዕስ",
      "description": "ዝርዝር መግለጫ",
      "priority": "high|medium|low",
      "suggested_assignee_department": "ክፍል ስም",
      "suggested_due_days": 7,
      "reasoning": "ለምን ይህ ተግባር አስፈላጊ ነው",
      "confidence": 0.95
    }
  ]
}`
      : `Meeting Information:
Title: ${meetingTitle}
Description: ${meetingDescription}

Minutes Content:
${minutesContent}

Available Departments:
${departmentsList}

Generate specific actionable tasks from the meeting decisions and discussions. Respond in English.${learningContext}
Return the result in this JSON format:
{
  "tasks": [
    {
      "id": "unique-id",
      "title": "Task Title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "suggested_assignee_department": "Department Name",
      "suggested_due_days": 7,
      "reasoning": "Why this task is important",
      "confidence": 0.95
    }
  ]
}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://api.lovable.app/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI response error:', await aiResponse.text());
      throw new Error('Failed to generate tasks from AI');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log('AI Response:', aiContent);

    // Parse JSON from AI response
    let tasksData;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : aiContent;
      tasksData = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Failed to parse AI generated tasks');
    }

    // Save task proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('guba_task_proposals')
      .insert({
        meeting_id,
        source_type,
        source_id,
        generated_tasks: tasksData,
        language,
        created_by: user_id,
        status: 'pending'
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Error saving proposal:', proposalError);
      throw proposalError;
    }

    console.log(`Created task proposal ${proposal.id} with ${tasksData.tasks.length} tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: proposal.id,
        tasks: tasksData.tasks,
        language
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-guba-tasks:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

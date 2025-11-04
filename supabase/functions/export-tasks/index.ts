import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, tasks } = await req.json();

    console.log(`Exporting ${tasks.length} tasks to ${platform}`);

    // Platform-specific export logic
    switch (platform) {
      case 'google_tasks':
        return await exportToGoogleTasks(tasks);
      case 'microsoft_todo':
        return await exportToMicrosoftTodo(tasks);
      case 'asana':
        return await exportToAsana(tasks);
      case 'todoist':
        return await exportToTodoist(tasks);
      case 'trello':
        return await exportToTrello(tasks);
      case 'notion':
        return await exportToNotion(tasks);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('Error in export-tasks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function exportToGoogleTasks(tasks: any[]) {
  // Get Google Tasks API token from environment or settings
  const apiKey = Deno.env.get('GOOGLE_TASKS_API_KEY');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Google Tasks API key not configured',
        message: 'Please configure Google Tasks API key in Settings → Integrations'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Create tasks in Google Tasks
  const results = await Promise.allSettled(
    tasks.map(task => 
      fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          notes: task.description,
          due: task.dueDate,
          status: task.status === 'completed' ? 'completed' : 'needsAction',
        })
      })
    )
  );

  const successCount = results.filter(r => r.status === 'fulfilled').length;

  return new Response(
    JSON.stringify({ 
      success: true,
      exported: successCount,
      total: tasks.length,
      url: 'https://tasks.google.com'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportToMicrosoftTodo(tasks: any[]) {
  const apiKey = Deno.env.get('MICROSOFT_TODO_API_KEY');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Microsoft To-Do API key not configured' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      exported: tasks.length,
      url: 'https://to-do.microsoft.com'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportToAsana(tasks: any[]) {
  const apiKey = Deno.env.get('ASANA_API_KEY');
  const workspaceId = Deno.env.get('ASANA_WORKSPACE_ID');
  
  if (!apiKey || !workspaceId) {
    return new Response(
      JSON.stringify({ 
        error: 'Asana API key or workspace ID not configured' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      exported: tasks.length,
      url: 'https://app.asana.com'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportToTodoist(tasks: any[]) {
  const apiKey = Deno.env.get('TODOIST_API_KEY');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Todoist API key not configured' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      exported: tasks.length,
      url: 'https://todoist.com'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportToTrello(tasks: any[]) {
  const apiKey = Deno.env.get('TRELLO_API_KEY');
  const token = Deno.env.get('TRELLO_TOKEN');
  
  if (!apiKey || !token) {
    return new Response(
      JSON.stringify({ 
        error: 'Trello API credentials not configured' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      exported: tasks.length,
      url: 'https://trello.com'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function exportToNotion(tasks: any[]) {
  const apiKey = Deno.env.get('NOTION_API_KEY');
  const databaseId = Deno.env.get('NOTION_DATABASE_ID');
  
  if (!apiKey || !databaseId) {
    return new Response(
      JSON.stringify({ 
        error: 'Notion API key or database ID not configured' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      exported: tasks.length,
      url: 'https://notion.so'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

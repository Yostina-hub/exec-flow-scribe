import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { conversationId, format = 'pdf' } = await req.json();

    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation details
    const { data: conversation, error: convError } = await supabase
      .from('advisor_conversations')
      .select(`
        *,
        meetings (
          title,
          start_time,
          created_by
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from('advisor_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (msgError) throw msgError;

    // Fetch user info
    const { data: userData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', conversation.user_id)
      .single();

    // Generate HTML content
    const htmlContent = generateHTMLReport(conversation, messages, userData);

    if (format === 'html') {
      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      });
    }

    // Generate PDF using jsPDF-like approach
    const pdfContent = await generatePDF(htmlContent, conversation);

    return new Response(JSON.stringify({ 
      success: true,
      content: pdfContent,
      filename: `advisor-session-${new Date(conversation.started_at).toISOString().split('T')[0]}.pdf`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error generating advisor report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateHTMLReport(conversation: any, messages: any[], userData: any) {
  const meetingTitle = conversation.meetings?.title || 'Unknown Meeting';
  const sessionDate = new Date(conversation.started_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const duration = conversation.ended_at 
    ? Math.round((new Date(conversation.ended_at).getTime() - new Date(conversation.started_at).getTime()) / 60000)
    : 'Ongoing';

  const insights = Array.isArray(conversation.key_insights) ? conversation.key_insights : [];

  const messagesHTML = messages.map(msg => `
    <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${msg.role === 'user' ? '#3b82f6' : '#8b5cf6'}; background: ${msg.role === 'user' ? '#eff6ff' : '#f5f3ff'}; border-radius: 8px;">
      <div style="font-weight: 600; color: ${msg.role === 'user' ? '#1e40af' : '#6d28d9'}; margin-bottom: 8px; font-size: 14px;">
        ${msg.role === 'user' ? '👤 User' : '🤖 AI Advisor'}
      </div>
      <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">
        ${escapeHtml(msg.content)}
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        ${new Date(msg.timestamp).toLocaleTimeString()}
      </div>
    </div>
  `).join('');

  const insightsHTML = insights.length > 0 ? `
    <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #dbeafe 0%, #e9d5ff 100%); border-radius: 12px; border: 2px solid #3b82f6;">
      <h2 style="color: #1e40af; margin-bottom: 15px; font-size: 20px; display: flex; align-items: center;">
        ✨ Key Insights
      </h2>
      ${insights.map((insight: any) => `
        <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <span style="display: inline-block; padding: 4px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 8px;">
            ${insight.category}
          </span>
          <p style="color: #374151; margin: 0; line-height: 1.6;">
            ${escapeHtml(insight.content)}
          </p>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: #f9fafb;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        }
        .metadata {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid #e5e7eb;
        }
        .metadata-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .metadata-item:last-child {
          border-bottom: none;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0 0 10px 0; font-size: 32px;">🧠 Executive Meeting Advisor Report</h1>
        <p style="margin: 0; opacity: 0.9; font-size: 16px;">Session Analysis & Conversation History</p>
      </div>

      <div class="metadata">
        <div class="metadata-item">
          <span style="font-weight: 600; color: #6b7280;">Meeting:</span>
          <span style="color: #111827;">${meetingTitle}</span>
        </div>
        <div class="metadata-item">
          <span style="font-weight: 600; color: #6b7280;">Advisor Session:</span>
          <span style="color: #111827;">${sessionDate}</span>
        </div>
        <div class="metadata-item">
          <span style="font-weight: 600; color: #6b7280;">Duration:</span>
          <span style="color: #111827;">${duration} minutes</span>
        </div>
        <div class="metadata-item">
          <span style="font-weight: 600; color: #6b7280;">Participant:</span>
          <span style="color: #111827;">${userData?.full_name || userData?.email || 'Unknown'}</span>
        </div>
        <div class="metadata-item">
          <span style="font-weight: 600; color: #6b7280;">Total Messages:</span>
          <span style="color: #111827;">${messages.length}</span>
        </div>
      </div>

      ${insightsHTML}

      <div style="margin-top: 30px;">
        <h2 style="color: #111827; margin-bottom: 20px; font-size: 24px;">📝 Conversation Transcript</h2>
        ${messagesHTML}
      </div>

      <div style="margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Generated on ${new Date().toLocaleString()}</p>
        <p style="margin: 5px 0 0 0;">Executive Meeting Advisor System</p>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function generatePDF(htmlContent: string, conversation: any): Promise<string> {
  // For now, return base64 encoded HTML that can be converted client-side
  // In production, you'd use a proper PDF generation service
  return btoa(unescape(encodeURIComponent(htmlContent)));
}

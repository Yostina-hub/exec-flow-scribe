import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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

    const { accessToken, title, content, meetingId } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Create Google Doc
    const createResponse = await fetch(
      'https://docs.googleapis.com/v1/documents',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
        }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Doc creation failed: ${await createResponse.text()}`);
    }

    const doc = await createResponse.json();

    // Add content to the doc
    if (content) {
      await fetch(
        `https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: content,
                },
              },
            ],
          }),
        }
      );
    }

    // Make doc shareable
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.documentId}/permissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'writer',
          type: 'anyone',
        }),
      }
    );

    // Store in database
    const { data: dbRecord, error: dbError } = await supabase
      .from('meeting_drive_files')
      .insert({
        meeting_id: meetingId,
        drive_file_id: doc.documentId,
        drive_file_name: title,
        drive_file_type: 'document',
        drive_file_url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
        mime_type: 'application/vnd.google-apps.document',
        uploaded_by: user.id,
        file_category: 'minutes',
        auto_generated: true,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        doc: dbRecord,
        documentId: doc.documentId,
        docUrl: `https://docs.google.com/document/d/${doc.documentId}/edit`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Google Doc:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
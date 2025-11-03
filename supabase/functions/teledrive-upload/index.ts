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

    const { accessToken, apiHost, fileName, fileContent, mimeType, meetingId, fileCategory } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Convert fileContent to blob
    const blob = new Blob([fileContent], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);

    // Upload to TeleDrive
    const uploadResponse = await fetch(
      `${apiHost}/api/files`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`TeleDrive upload failed: ${await uploadResponse.text()}`);
    }

    const teledriveFile = await uploadResponse.json();

    // Store in database
    const { data: dbRecord, error: dbError } = await supabase
      .from('meeting_drive_files')
      .insert({
        meeting_id: meetingId,
        drive_file_id: teledriveFile.id,
        drive_file_name: fileName,
        drive_file_type: mimeType.split('/')[0],
        drive_file_url: `${apiHost}/view/${teledriveFile.id}`,
        mime_type: mimeType,
        file_size: fileContent.length,
        uploaded_by: user.id,
        file_category: fileCategory,
        auto_generated: fileCategory === 'recording' || fileCategory === 'minutes',
        storage_provider: 'teledrive',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        file: dbRecord,
        teledriveFileId: teledriveFile.id,
        teledriveUrl: `${apiHost}/view/${teledriveFile.id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error uploading to TeleDrive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

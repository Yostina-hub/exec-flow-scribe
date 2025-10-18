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

    const { accessToken, fileName, fileContent, mimeType, meetingId, fileCategory } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Upload to Google Drive
    const metadata = {
      name: fileName,
      mimeType: mimeType,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: mimeType }));

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Drive upload failed: ${await uploadResponse.text()}`);
    }

    const driveFile = await uploadResponse.json();

    // Make file accessible via link
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );

    // Store in database
    const { data: dbRecord, error: dbError } = await supabase
      .from('meeting_drive_files')
      .insert({
        meeting_id: meetingId,
        drive_file_id: driveFile.id,
        drive_file_name: fileName,
        drive_file_type: mimeType.split('/')[0],
        drive_file_url: `https://drive.google.com/file/d/${driveFile.id}/view`,
        mime_type: mimeType,
        file_size: fileContent.length,
        uploaded_by: user.id,
        file_category: fileCategory,
        auto_generated: fileCategory === 'recording' || fileCategory === 'minutes',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        file: dbRecord,
        driveFileId: driveFile.id,
        driveUrl: `https://drive.google.com/file/d/${driveFile.id}/view`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error uploading to Drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
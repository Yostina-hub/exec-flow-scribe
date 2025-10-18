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

    const { accessToken, folderId, query } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Build Drive API query
    let driveQuery = "trashed=false";
    if (folderId) {
      driveQuery += ` and '${folderId}' in parents`;
    }
    if (query) {
      driveQuery += ` and name contains '${query}'`;
    }

    // List files from Google Drive
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(driveQuery)}&fields=files(id,name,mimeType,createdTime,modifiedTime,size,webViewLink,iconLink,thumbnailLink)&orderBy=modifiedTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Drive list failed: ${await listResponse.text()}`);
    }

    const driveFiles = await listResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        files: driveFiles.files || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error listing Drive files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
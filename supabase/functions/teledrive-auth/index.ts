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

    const { action, apiHost, phoneNumber, password, apiId, apiHash } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    if (action === 'login') {
      // Authenticate with TeleDrive
      const loginResponse = await fetch(`${apiHost}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          password,
          apiId,
          apiHash,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error(`TeleDrive authentication failed: ${await loginResponse.text()}`);
      }

      const authData = await loginResponse.json();

      // Store TeleDrive credentials in user metadata or settings
      const { error: updateError } = await supabase
        .from('drive_sync_settings')
        .upsert({
          user_id: user.id,
          teledrive_api_host: apiHost,
          teledrive_access_token: authData.accessToken,
          teledrive_enabled: true,
        });

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true,
          accessToken: authData.accessToken,
          message: 'Successfully authenticated with TeleDrive'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TeleDrive auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

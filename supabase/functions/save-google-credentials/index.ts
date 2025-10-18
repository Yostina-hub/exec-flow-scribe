import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, clientSecret } = await req.json();

    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    // Store credentials in Supabase secrets/environment
    // This will store them in the Deno.env for use by other functions
    // Note: In production, these should be set via Supabase dashboard or CLI
    // For now, we'll store them in a secure table
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store in a secure settings table
    const { data, error } = await supabase
      .from('system_settings');

    // Ensure we either update or insert without relying on onConflict (works even if no unique constraint)
    const { data: existingSetting, error: fetchErr } = await supabase
      .from('system_settings')
      .select('key')
      .eq('key', 'google_oauth_credentials')
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

    let upsertError: any = null;
    if (existingSetting) {
      const { error: updErr } = await supabase
        .from('system_settings')
        .update({
          value: {
            clientId,
            clientSecret,
            updatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'google_oauth_credentials');
      if (updErr) upsertError = updErr;
    } else {
      const { error: insErr } = await supabase
        .from('system_settings')
        .insert({
          key: 'google_oauth_credentials',
          value: {
            clientId,
            clientSecret,
            updatedAt: new Date().toISOString()
          }
        });
      if (insErr) upsertError = insErr;
    }

    if (upsertError) throw upsertError;

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Credentials saved successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving Google credentials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    const { action, code } = await req.json();

    // Get stored Google credentials (try database first, then env vars)
    const { data: credentials } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'google_oauth_credentials')
      .single();

    let clientId: string;
    let clientSecret: string;

    if (!credentials?.value) {
      // Fallback to environment variables
      clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
      clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
      console.log('Using Google OAuth credentials from env vars');
    } else {
      clientId = credentials.value.clientId;
      clientSecret = credentials.value.clientSecret;
      console.log('Using Google OAuth credentials from database');
    }

    console.log('Client ID format check:', clientId?.includes('.apps.googleusercontent.com') ? 'Valid' : 'Invalid');

    // Use the app URL for redirect, not the Supabase URL
    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const redirectUri = `${appUrl}/google-oauth-callback`;

    if (action === 'getAuthUrl') {
      // Build OAuth URL with Drive scopes
      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'openid',
        'profile',
        'email'
      ];
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=drive_auth`;

      console.log('Generated Drive auth URL with redirect:', redirectUri);
      console.log('Scopes:', scopes.join(', '));

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchangeCode') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Successfully exchanged code for Drive tokens');

      return new Response(
        JSON.stringify({ success: true, tokens }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Google Drive auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
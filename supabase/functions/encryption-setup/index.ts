import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  password: string;
  hint?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { password, hint }: SetupRequest = await req.json();

    if (!password || password.length < 12) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 12 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Setting up encryption key for user:', user.id);

    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

    // Derive key from password using PBKDF2
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      256
    );

    // Generate actual encryption key
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const encryptionKeyHex = Array.from(encryptionKey).map(b => b.toString(16).padStart(2, '0')).join('');

    // Encrypt the encryption key with the derived key
    const derivedKey = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      encryptionKey
    );

    const encryptedKeyHex = Array.from(new Uint8Array(encryptedKey))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in database
    const { error: dbError } = await supabase
      .from('user_encryption_keys')
      .upsert({
        user_id: user.id,
        encrypted_key: `${ivHex}:${encryptedKeyHex}`,
        key_salt: saltHex,
        key_hint: hint || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Log setup action
    await supabase.from('encryption_audit_log').insert({
      user_id: user.id,
      action: 'key_setup',
      resource_type: 'encryption_key',
      metadata: { hint: hint || null },
    });

    console.log('Encryption key setup successful');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Encryption key setup successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Encryption setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

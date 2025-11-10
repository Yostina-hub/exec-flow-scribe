import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecryptRequest {
  encrypted_data: string;
  iv: string;
  password: string;
  resource_type: 'transcription' | 'recording' | 'meeting';
  resource_id: string;
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

    const { encrypted_data, iv, password, resource_type, resource_id }: DecryptRequest = await req.json();

    // Get user's encryption key
    const { data: keyData, error: keyError } = await supabase
      .from('user_encryption_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Encryption key not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Derive key from password
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const salt = new Uint8Array(keyData.key_salt.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
    
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

    const derivedKey = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the encryption key
    const [keyIvHex, encryptedKeyHex] = keyData.encrypted_key.split(':');
    const keyIv = new Uint8Array(keyIvHex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
    const encryptedKey = new Uint8Array(encryptedKeyHex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));

    let encryptionKeyBytes;
    try {
      encryptionKeyBytes = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: keyIv },
        derivedKey,
        encryptedKey
      );
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      encryptionKeyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const ivMatches = iv.match(/.{1,2}/g);
    if (!ivMatches) throw new Error('Invalid IV format');
    const dataIv = new Uint8Array(ivMatches.map((byte: string) => parseInt(byte, 16)));
    
    const dataMatches = encrypted_data.match(/.{1,2}/g);
    if (!dataMatches) throw new Error('Invalid encrypted data format');
    const encryptedDataBytes = new Uint8Array(dataMatches.map((byte: string) => parseInt(byte, 16)));

    let decryptedData;
    try {
      decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: dataIv },
        encryptionKey,
        encryptedDataBytes
      );
    } catch {
      return new Response(
        JSON.stringify({ error: 'Decryption failed. Data may be corrupted.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const decryptedText = decoder.decode(decryptedData);

    // Update last used timestamp
    await supabase
      .from('user_encryption_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // Log decryption action
    await supabase.from('encryption_audit_log').insert({
      user_id: user.id,
      action: 'decrypt',
      resource_type: resource_type,
      resource_id: resource_id,
    });

    return new Response(
      JSON.stringify({ 
        decrypted_data: decryptedText,
        success: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Decryption error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

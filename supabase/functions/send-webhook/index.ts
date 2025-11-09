import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event, data } = await req.json();

    console.log('Processing webhook for event:', event);

    // Get all active webhooks that listen to this event
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('distribution_webhooks')
      .select('*')
      .eq('is_active', true)
      .contains('events', [event]);

    if (webhooksError) {
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No active webhooks found for event:', event);
      return new Response(
        JSON.stringify({ message: 'No webhooks configured for this event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${webhooks.length} webhooks to trigger`);

    // Send webhooks in background
    const deliveryPromises = webhooks.map(async (webhook) => {
      const deliveryId = crypto.randomUUID();
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      try {
        // Log delivery attempt
        await supabaseClient.from('webhook_deliveries').insert({
          id: deliveryId,
          webhook_id: webhook.id,
          event_type: event,
          payload,
          attempts: 1,
        });

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Lovable-Webhooks/1.0',
          ...(webhook.headers || {}),
        };

        // Add signature if secret is configured
        if (webhook.secret) {
          const signature = await generateSignature(JSON.stringify(payload), webhook.secret);
          headers['X-Webhook-Signature'] = signature;
        }

        // Send webhook with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), (webhook.timeout_seconds || 30) * 1000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text();

        // Update delivery log
        await supabaseClient
          .from('webhook_deliveries')
          .update({
            response_status: response.status,
            response_body: responseBody.substring(0, 1000), // Limit stored response
            delivered_at: response.ok ? new Date().toISOString() : null,
            failed_at: !response.ok ? new Date().toISOString() : null,
            error_message: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : null,
            next_retry_at: !response.ok && webhook.retry_count > 1 
              ? new Date(Date.now() + 5 * 60 * 1000).toISOString() // Retry in 5 minutes
              : null,
          })
          .eq('id', deliveryId);

        console.log(`Webhook ${webhook.name} delivered:`, response.status);
      } catch (error: any) {
        console.error(`Failed to deliver webhook ${webhook.name}:`, error);

        // Update delivery log with error
        await supabaseClient
          .from('webhook_deliveries')
          .update({
            failed_at: new Date().toISOString(),
            error_message: error.message,
            next_retry_at: webhook.retry_count > 1
              ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
              : null,
          })
          .eq('id', deliveryId);
      }
    });

    // Don't wait for all webhooks to complete
    Promise.all(deliveryPromises).catch(console.error);

    return new Response(
      JSON.stringify({ 
        message: 'Webhooks triggered',
        count: webhooks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in send-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const url = new URL(req.url);
    const meetingId = url.searchParams.get('meeting_id');

    if (!meetingId) {
      throw new Error('meeting_id is required');
    }

    console.log('Upgrading to WebSocket for meeting:', meetingId);

    // Upgrade to WebSocket
    const upgrade = req.headers.get('upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    // Connect to OpenAI Realtime API
    let openaiSocket: WebSocket | null = null;

    clientSocket.onopen = async () => {
      console.log('Client connected');
      
      try {
        const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
        openaiSocket = new WebSocket(wsUrl, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        openaiSocket.onopen = () => {
          console.log('Connected to OpenAI');
        };

        openaiSocket.onmessage = (event) => {
          // Forward messages from OpenAI to client
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(event.data);
          }
        };

        openaiSocket.onerror = (error) => {
          console.error('OpenAI WebSocket error:', error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
              type: 'error',
              message: 'OpenAI connection error'
            }));
          }
        };

        openaiSocket.onclose = () => {
          console.log('OpenAI WebSocket closed');
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close();
          }
        };
      } catch (error: any) {
        console.error('Error connecting to OpenAI:', error);
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Connection failed'
          }));
          clientSocket.close();
        }
      }
    };

    clientSocket.onmessage = (event) => {
      // Forward messages from client to OpenAI
      if (openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.send(event.data);
      }
    };

    clientSocket.onclose = () => {
      console.log('Client disconnected');
      if (openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.close();
      }
    };

    clientSocket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
      if (openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.close();
      }
    };

    return response;
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

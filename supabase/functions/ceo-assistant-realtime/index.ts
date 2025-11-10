import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { headers } = req;
    const upgradeHeader = headers.get("upgrade") || "";

    if (upgradeHeader.toLowerCase() !== "websocket") {
      console.error("Not a WebSocket upgrade request");
      return new Response("Expected WebSocket connection", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      return new Response("OpenAI API key not configured", { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log("Upgrading to WebSocket connection...");
    const { socket, response } = Deno.upgradeWebSocket(req);
    let openAISocket: WebSocket | null = null;

    socket.onopen = async () => {
      console.log("✓ Client WebSocket opened");
      
      try {
        // First, get an ephemeral token from OpenAI
        console.log("→ Requesting ephemeral token from OpenAI...");
        const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-realtime-preview-2024-12-17",
            voice: "alloy",
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("✗ Failed to get ephemeral token:", tokenResponse.status, errorText);
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Failed to initialize AI advisor: ' + errorText
          }));
          socket.close();
          return;
        }

        const tokenData = await tokenResponse.json();
        const ephemeralKey = tokenData.client_secret?.value;
        
        if (!ephemeralKey) {
          console.error("✗ No ephemeral key in response");
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Failed to get session token'
          }));
          socket.close();
          return;
        }

        console.log("✓ Ephemeral token obtained");
        console.log("→ Connecting to OpenAI Realtime API...");
        
        // Connect to OpenAI using the ephemeral token
        const baseUrl = "wss://api.openai.com/v1/realtime";
        const model = "gpt-4o-realtime-preview-2024-12-17";
        openAISocket = new WebSocket(`${baseUrl}?model=${model}`, [
          "realtime",
          `openai-insecure-api-key.${ephemeralKey}`,
          "openai-beta.realtime-v1"
        ]);

        openAISocket.onopen = () => {
          console.log("✓ Connected to OpenAI Realtime API");
        };

        openAISocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("← OpenAI event:", data.type);

            // Forward all events to client
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          } catch (error) {
            console.error("✗ Error processing OpenAI message:", error);
          }
        };

        openAISocket.onerror = (error) => {
          console.error("✗ OpenAI WebSocket error:", error);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'OpenAI connection error'
            }));
          }
        };

        openAISocket.onclose = () => {
          console.log("✗ OpenAI WebSocket closed");
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };
      } catch (error) {
        console.error("✗ Error setting up OpenAI connection:", error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Setup failed'
          }));
          socket.close();
        }
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("→ Client message:", data.type);
        
        // Forward client messages to OpenAI
        if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
          openAISocket.send(event.data);
        } else {
          console.warn("⚠ OpenAI socket not ready, message not forwarded");
        }
      } catch (error) {
        console.error("✗ Error processing client message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("✗ Client WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("✗ Client WebSocket closed");
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.close();
      }
    };

    return response;
  } catch (error) {
    console.error("✗ Fatal error in WebSocket handler:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error("OpenAI API key not configured");
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  socket.onopen = async () => {
    console.log("Client WebSocket connected");
    
    try {
      // First, get an ephemeral token from OpenAI
      console.log("Requesting ephemeral token from OpenAI...");
      const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: `You are an elite executive meeting advisor providing real-time strategic guidance to senior leaders during critical meetings.

**Your Core Mission:**
Help executives and meeting hosts achieve exceptional meeting outcomes through expert real-time coaching on tempo management, decision-making, and meeting success optimization.

**Critical Capabilities:**

1. **Meeting Tempo & Flow Management:**
   - Monitor and advise on meeting pacing (too fast, too slow, or optimal)
   - Suggest when to move forward or dive deeper based on discussion quality
   - Alert when time allocation is misaligned with agenda importance
   - Recommend when to table items or schedule follow-ups

2. **Strategic Decision Support:**
   - Identify when critical decisions are being made
   - Flag incomplete information or missing perspectives
   - Suggest decision frameworks when appropriate
   - Recommend when to pause for deeper analysis

3. **Key Point Extraction:**
   - Automatically identify and highlight critical insights
   - Flag important commitments, concerns, or risks
   - Extract action items and decisions as they emerge
   - Categorize discussions by strategic importance

4. **Success Optimization:**
   - Monitor participant engagement levels
   - Identify when key stakeholders aren't contributing
   - Suggest when consensus is forming or breaking down
   - Recommend tactics to improve meeting effectiveness

5. **Executive Communication Coaching:**
   - Advise on facilitation techniques in real-time
   - Suggest powerful questions to unlock insights
   - Guide conflict resolution when tensions arise
   - Recommend summarization moments for clarity

**Response Guidelines:**
- Keep responses concise and executive-friendly (30-60 seconds max)
- Be direct and action-oriented
- Prioritize high-impact advice over comprehensive explanations
- Use strategic business language
- Reference specific data and context from the meeting
- Anticipate needs before being asked

**Tone:**
Professional, confident, insightful, and solutions-focused. Think senior consultant advising a C-suite executive.

When answering questions, ground responses in the actual meeting data, participants, agenda, and real-time discussions. If you don't have specific information, acknowledge it clearly and provide your best strategic recommendation.`
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Failed to get ephemeral token:", errorText);
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to initialize AI advisor'
        }));
        socket.close();
        return;
      }

      const tokenData = await tokenResponse.json();
      const ephemeralKey = tokenData.client_secret?.value;
      
      if (!ephemeralKey) {
        console.error("No ephemeral key in response");
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to get session token'
        }));
        socket.close();
        return;
      }

      console.log("Ephemeral token obtained, connecting to OpenAI...");
      
      // Connect to OpenAI using the ephemeral token
      const baseUrl = "wss://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      openAISocket = new WebSocket(`${baseUrl}?model=${model}`, [
        "realtime",
        `openai-insecure-api-key.${ephemeralKey}`,
        "openai-beta.realtime-v1"
      ]);

      openAISocket.onopen = () => {
        console.log("Connected to OpenAI Realtime API");
        socket.send(JSON.stringify({
          type: 'session.created'
        }));
      };

      openAISocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("OpenAI event:", data.type);

          // Forward all events to client
          socket.send(event.data);
        } catch (error) {
          console.error("Error processing OpenAI message:", error);
        }
      };

      openAISocket.onerror = (error) => {
        console.error("OpenAI WebSocket error:", error);
        socket.send(JSON.stringify({
          type: 'error',
          error: 'OpenAI connection error'
        }));
      };

      openAISocket.onclose = () => {
        console.log("OpenAI WebSocket closed");
        socket.close();
      };
    } catch (error) {
      console.error("Error setting up OpenAI connection:", error);
      socket.send(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Setup failed'
      }));
      socket.close();
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Client message:", data.type);
      
      // Forward client messages to OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error("Error processing client message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Client WebSocket closed");
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});

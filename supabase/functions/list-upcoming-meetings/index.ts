// List meetings starting within the next 2 hours (or a provided window)
// Returns minimal fields for the guest dropdown

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Optional body with custom window
    let fromIso: string;
    let toIso: string;
    try {
      const body = await req.json().catch(() => ({}));
      const now = new Date();
      const defaultTo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      fromIso = body?.from ?? now.toISOString();
      toIso = body?.to ?? defaultTo.toISOString();
    } catch {
      const now = new Date();
      const defaultTo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      fromIso = now.toISOString();
      toIso = defaultTo.toISOString();
    }

    const { data, error } = await supabase
      .from("meetings")
      .select("id, title, start_time")
      .gte("start_time", fromIso)
      .lte("start_time", toIso)
      .order("start_time", { ascending: true })
      .limit(50);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
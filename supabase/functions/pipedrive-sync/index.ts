import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meeting_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) throw new Error("Unauthorized");

    // Get Pipedrive configuration
    const { data: config, error: configError } = await supabase
      .from("crm_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "pipedrive")
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      throw new Error("Pipedrive integration not configured");
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, meeting_attendees(user_id, profiles(*))")
      .eq("id", meeting_id)
      .single();

    if (meetingError) throw meetingError;

    const syncedContacts = [];

    // Sync attendees to Pipedrive as persons
    for (const attendee of meeting.meeting_attendees || []) {
      const profile = attendee.profiles;
      if (!profile) continue;

      const pdPerson = await createPipedrivePerson(
        config.api_key,
        config.domain,
        profile.email,
        profile.full_name
      );

      // Store in our CRM contacts table
      const { data: crmContact } = await supabase
        .from("crm_contacts")
        .upsert({
          user_id: user.id,
          external_id: String(pdPerson.id),
          provider: "pipedrive",
          name: profile.full_name || profile.email,
          email: profile.email,
          metadata: pdPerson,
        }, {
          onConflict: "user_id,provider,external_id"
        })
        .select()
        .single();

      if (crmContact) {
        await supabase.from("contact_meeting_history").insert({
          contact_id: crmContact.id,
          meeting_id: meeting.id,
          role: "attendee",
        });

        syncedContacts.push(crmContact);
      }
    }

    // Create activity in Pipedrive
    await createPipedriveActivity(
      config.api_key,
      config.domain,
      meeting,
      syncedContacts.map(c => Number(c.external_id))
    );

    // Update last sync time
    await supabase
      .from("crm_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", config.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced_contacts: syncedContacts.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Pipedrive sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function createPipedrivePerson(
  apiKey: string,
  domain: string,
  email: string,
  name: string
) {
  const response = await fetch(
    `https://${domain}.pipedrive.com/v1/persons?api_token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || email,
        email: [{ value: email, primary: true }],
      }),
    }
  );

  if (!response.ok) {
    // Try to find existing person
    const searchResponse = await fetch(
      `https://${domain}.pipedrive.com/v1/persons/search?term=${encodeURIComponent(email)}&api_token=${apiKey}`
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data?.items?.length > 0) {
        return { id: searchData.data.items[0].item.id };
      }
    }

    throw new Error(`Pipedrive API error: ${response.statusText}`);
  }

  const data = await response.json();
  return { id: data.data.id };
}

async function createPipedriveActivity(
  apiKey: string,
  domain: string,
  meeting: any,
  personIds: number[]
) {
  const response = await fetch(
    `https://${domain}.pipedrive.com/v1/activities?api_token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: meeting.title,
        note: meeting.description,
        due_date: meeting.start_time.split("T")[0],
        due_time: meeting.start_time.split("T")[1]?.substring(0, 5),
        duration: "01:00",
        person_id: personIds[0],
        type: "meeting",
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to create Pipedrive activity:", response.statusText);
  }
}
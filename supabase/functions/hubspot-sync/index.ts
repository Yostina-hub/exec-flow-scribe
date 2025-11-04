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

    // Get HubSpot configuration
    const { data: config, error: configError } = await supabase
      .from("crm_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "hubspot")
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      throw new Error("HubSpot integration not configured");
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, meeting_attendees(user_id, profiles(*))")
      .eq("id", meeting_id)
      .single();

    if (meetingError) throw meetingError;

    // Sync attendees to HubSpot as contacts
    const syncedContacts = [];

    for (const attendee of meeting.meeting_attendees || []) {
      const profile = attendee.profiles;
      if (!profile) continue;

      // Create or update contact in HubSpot
      const hubspotContact = await createHubSpotContact(
        config.api_key,
        profile.email,
        profile.full_name
      );

      // Store in our CRM contacts table
      const { data: crmContact } = await supabase
        .from("crm_contacts")
        .upsert({
          user_id: user.id,
          external_id: hubspotContact.id,
          provider: "hubspot",
          name: profile.full_name || profile.email,
          email: profile.email,
          metadata: hubspotContact,
        }, {
          onConflict: "user_id,provider,external_id"
        })
        .select()
        .single();

      if (crmContact) {
        // Record meeting history
        await supabase.from("contact_meeting_history").insert({
          contact_id: crmContact.id,
          meeting_id: meeting.id,
          role: "attendee",
        });

        syncedContacts.push(crmContact);
      }
    }

    // Create engagement in HubSpot for the meeting
    await createHubSpotEngagement(
      config.api_key,
      meeting,
      syncedContacts.map(c => c.external_id)
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
    console.error("HubSpot sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function createHubSpotContact(apiKey: string, email: string, name: string) {
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email,
        firstname: name?.split(" ")[0] || "",
        lastname: name?.split(" ").slice(1).join(" ") || "",
      },
    }),
  });

  if (!response.ok) {
    // Try to update existing contact
    const searchResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{ propertyName: "email", operator: "EQ", value: email }],
          }],
        }),
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.results?.length > 0) {
        return searchData.results[0];
      }
    }

    throw new Error(`HubSpot API error: ${response.statusText}`);
  }

  return await response.json();
}

async function createHubSpotEngagement(
  apiKey: string,
  meeting: any,
  contactIds: string[]
) {
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/meetings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        hs_meeting_title: meeting.title,
        hs_meeting_body: meeting.description,
        hs_meeting_start_time: new Date(meeting.start_time).getTime(),
        hs_meeting_end_time: new Date(meeting.end_time).getTime(),
        hs_meeting_location: meeting.location,
      },
      associations: contactIds.map(id => ({
        to: { id },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 200 }],
      })),
    }),
  });

  if (!response.ok) {
    console.error("Failed to create HubSpot engagement:", response.statusText);
  }
}
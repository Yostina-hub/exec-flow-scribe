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

    // Get Salesforce configuration
    const { data: config, error: configError } = await supabase
      .from("crm_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "salesforce")
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      throw new Error("Salesforce integration not configured");
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, meeting_attendees(user_id, profiles(*))")
      .eq("id", meeting_id)
      .single();

    if (meetingError) throw meetingError;

    const syncedContacts = [];

    // Sync attendees to Salesforce as contacts
    for (const attendee of meeting.meeting_attendees || []) {
      const profile = attendee.profiles;
      if (!profile) continue;

      const sfContact = await createSalesforceContact(
        config.access_token,
        config.domain,
        profile.email,
        profile.full_name
      );

      // Store in our CRM contacts table
      const { data: crmContact } = await supabase
        .from("crm_contacts")
        .upsert({
          user_id: user.id,
          external_id: sfContact.id,
          provider: "salesforce",
          name: profile.full_name || profile.email,
          email: profile.email,
          metadata: sfContact,
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

    // Create event in Salesforce
    await createSalesforceEvent(
      config.access_token,
      config.domain,
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
    console.error("Salesforce sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function createSalesforceContact(
  accessToken: string,
  domain: string,
  email: string,
  name: string
) {
  const [firstName, ...lastNameParts] = (name || email).split(" ");
  const lastName = lastNameParts.join(" ") || "Unknown";

  const response = await fetch(
    `https://${domain}.my.salesforce.com/services/data/v58.0/sobjects/Contact`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        FirstName: firstName,
        LastName: lastName,
        Email: email,
      }),
    }
  );

  if (!response.ok) {
    // Try to find existing contact
    const searchResponse = await fetch(
      `https://${domain}.my.salesforce.com/services/data/v58.0/query?q=SELECT+Id+FROM+Contact+WHERE+Email='${email}'`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.records?.length > 0) {
        return { id: searchData.records[0].Id };
      }
    }

    throw new Error(`Salesforce API error: ${response.statusText}`);
  }

  const data = await response.json();
  return { id: data.id };
}

async function createSalesforceEvent(
  accessToken: string,
  domain: string,
  meeting: any,
  contactIds: string[]
) {
  const response = await fetch(
    `https://${domain}.my.salesforce.com/services/data/v58.0/sobjects/Event`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Subject: meeting.title,
        Description: meeting.description,
        StartDateTime: meeting.start_time,
        EndDateTime: meeting.end_time,
        Location: meeting.location,
        WhoId: contactIds[0], // Primary contact
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to create Salesforce event:", response.statusText);
  }
}
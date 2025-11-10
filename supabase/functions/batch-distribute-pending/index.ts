import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchDistributeRequest {
  pending_distribution_ids: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting batch distribution process');

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pending_distribution_ids }: BatchDistributeRequest = await req.json();

    if (!pending_distribution_ids || pending_distribution_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No distribution IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pending_distribution_ids.length} distributions`);

    // Fetch all pending distributions
    const { data: pendingDistributions, error: fetchError } = await supabase
      .from('pending_distributions')
      .select('*')
      .in('id', pending_distribution_ids)
      .eq('created_by', user.id)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching pending distributions:', fetchError);
      throw fetchError;
    }

    if (!pendingDistributions || pendingDistributions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid pending distributions found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    
    for (const distribution of pendingDistributions) {
      try {
        console.log(`Processing distribution ${distribution.id} for meeting ${distribution.meeting_id}`);

        // Fetch meeting attendees
        const { data: attendees, error: attendeesError } = await supabase
          .from('meeting_attendees')
          .select('user_id')
          .eq('meeting_id', distribution.meeting_id);

        if (attendeesError) {
          console.error(`Error fetching attendees for meeting ${distribution.meeting_id}:`, attendeesError);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'Failed to fetch attendees',
          });
          continue;
        }

        if (!attendees || attendees.length === 0) {
          console.log(`No attendees found for meeting ${distribution.meeting_id}`);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'No attendees found',
          });
          continue;
        }

        // Fetch profiles for those user IDs
        const userIds = attendees.map(a => a.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('email')
          .in('id', userIds);

        if (profilesError) {
          console.error(`Error fetching profiles for meeting ${distribution.meeting_id}:`, profilesError);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'Failed to fetch recipient profiles',
          });
          continue;
        }

        const recipients = profiles
          ?.map((p: any) => p.email)
          .filter((email): email is string => !!email) || [];

        if (recipients.length === 0) {
          console.log(`No valid email recipients for meeting ${distribution.meeting_id}`);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'No valid email recipients',
          });
          continue;
        }

        // Get minutes version
        const { data: minutesData, error: minutesError } = await supabase
          .from('minutes_versions')
          .select('id')
          .eq('meeting_id', distribution.meeting_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (minutesError || !minutesData) {
          console.error(`Error fetching minutes for meeting ${distribution.meeting_id}:`, minutesError);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'No minutes found',
          });
          continue;
        }

        // Get brand kit
        const { data: brandKit } = await supabase
          .from('brand_kits')
          .select('id')
          .eq('is_default', true)
          .limit(1)
          .maybeSingle();

        // Generate PDF
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-branded-pdf', {
          body: {
            meeting_id: distribution.meeting_id,
            minutes_version_id: minutesData.id,
            brand_kit_id: brandKit?.id,
            signature_request_id: distribution.signature_request_id,
            include_watermark: false,
          },
        });

        if (pdfError) {
          console.error(`Error generating PDF for meeting ${distribution.meeting_id}:`, pdfError);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'Failed to generate PDF',
          });
          continue;
        }

        // Distribute PDF
        const { data: distributionData, error: distError } = await supabase.functions.invoke('distribute-pdf', {
          body: {
            pdf_generation_id: pdfData.pdf_generation_id,
            custom_recipients: recipients,
          },
        });

        if (distError) {
          console.error(`Error distributing PDF for meeting ${distribution.meeting_id}:`, distError);
          results.push({
            distribution_id: distribution.id,
            status: 'failed',
            error: 'Failed to distribute PDF',
          });
          continue;
        }

        const sentCount = distributionData.results?.filter((r: any) => r.status === 'sent').length || 0;
        const failedCount = distributionData.results?.filter((r: any) => r.status === 'failed').length || 0;

        // Log distribution to history
        await supabase.from('distribution_history').insert({
          meeting_id: distribution.meeting_id,
          pdf_generation_id: pdfData.pdf_generation_id,
          status: failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed',
          total_recipients: recipients.length,
          successful_count: sentCount,
          failed_count: failedCount,
          recipient_details: distributionData.results,
          distribution_type: 'batch',
        });

        // Update pending distribution status
        await supabase
          .from('pending_distributions')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', distribution.id);

        // Trigger webhook
        supabase.functions.invoke('send-webhook', {
          body: {
            event: failedCount === 0 ? 'distribution.sent' : 'distribution.failed',
            data: {
              meeting_id: distribution.meeting_id,
              recipient_count: recipients.length,
              success_count: sentCount,
              failed_count: failedCount,
              timestamp: new Date().toISOString(),
            },
          },
        }).catch(console.error);

        console.log(`Successfully distributed for meeting ${distribution.meeting_id}: ${sentCount} sent, ${failedCount} failed`);
        
        results.push({
          distribution_id: distribution.id,
          meeting_id: distribution.meeting_id,
          status: failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed',
          sent_count: sentCount,
          failed_count: failedCount,
        });
      } catch (error: any) {
        console.error(`Error processing distribution ${distribution.id}:`, error);
        results.push({
          distribution_id: distribution.id,
          status: 'failed',
          error: error.message || 'Unknown error',
        });
      }
    }

    const totalSuccess = results.filter(r => r.status === 'success').length;
    const totalPartial = results.filter(r => r.status === 'partial').length;
    const totalFailed = results.filter(r => r.status === 'failed').length;

    console.log(`Batch distribution complete: ${totalSuccess} success, ${totalPartial} partial, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          success: totalSuccess,
          partial: totalPartial,
          failed: totalFailed,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Batch distribution error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

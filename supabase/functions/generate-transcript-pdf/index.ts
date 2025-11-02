import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { meetingId } = await req.json();

    if (!meetingId) {
      throw new Error('Meeting ID is required');
    }

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('title, start_time, end_time')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Fetch transcriptions
    const { data: transcriptions, error: transError } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('timestamp', { ascending: true });

    if (transError) throw transError;

    if (!transcriptions || transcriptions.length === 0) {
      throw new Error('No transcriptions found for this meeting');
    }

    const html = generateTranscriptHTML(meeting, transcriptions);

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error generating transcript PDF:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function generateTranscriptHTML(meeting: any, transcriptions: any[]): string {
  const startDate = new Date(meeting.start_time);
  const endDate = new Date(meeting.end_time);

  let speakerBlocks: Array<{ speaker: string; timestamp: string; content: string; confidence?: number }> = [];
  let currentSpeaker = '';
  let currentBlock = '';
  let currentTimestamp = '';
  let currentConfidence: number | undefined;

  transcriptions.forEach((trans, index) => {
    const speaker = trans.speaker_name || 'Unknown Speaker';
    const timestamp = formatTimestamp(trans.timestamp);
    const content = trans.content || '';
    const confidence = trans.confidence;

    if (speaker !== currentSpeaker) {
      if (currentBlock) {
        speakerBlocks.push({
          speaker: currentSpeaker,
          timestamp: currentTimestamp,
          content: currentBlock,
          confidence: currentConfidence,
        });
      }
      currentSpeaker = speaker;
      currentBlock = content;
      currentTimestamp = timestamp;
      currentConfidence = confidence;
    } else {
      currentBlock += ' ' + content;
    }

    if (index === transcriptions.length - 1) {
      speakerBlocks.push({
        speaker: currentSpeaker,
        timestamp: currentTimestamp,
        content: currentBlock,
        confidence: currentConfidence,
      });
    }
  });

  const speakerBlocksHtml = speakerBlocks
    .map(
      (block) => `
    <div class="speaker-block">
      <div class="speaker-header">
        <span class="speaker-name">${block.speaker}</span>
        <span class="timestamp">${block.timestamp}</span>
        ${block.confidence ? `<span class="confidence">Confidence: ${(block.confidence * 100).toFixed(0)}%</span>` : ''}
      </div>
      <div class="speaker-content">${block.content}</div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      color: #1e40af;
      margin-bottom: 10px;
    }
    
    .header h2 {
      font-size: 20px;
      color: #4b5563;
      font-weight: 500;
      margin-bottom: 15px;
    }
    
    .metadata {
      display: flex;
      justify-content: center;
      gap: 30px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .metadata-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .metadata-label {
      font-weight: 600;
      margin-bottom: 3px;
    }
    
    .speaker-block {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .speaker-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 8px;
      padding: 10px 15px;
      background: #f3f4f6;
      border-left: 4px solid #2563eb;
      border-radius: 4px;
    }
    
    .speaker-name {
      font-weight: 700;
      color: #1e40af;
      font-size: 16px;
    }
    
    .timestamp {
      color: #6b7280;
      font-size: 13px;
      font-family: 'Courier New', monospace;
    }
    
    .confidence {
      color: #059669;
      font-size: 12px;
      margin-left: auto;
    }
    
    .speaker-content {
      padding: 15px 20px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.8;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    
    .stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 10px;
    }
    
    .stat-item {
      font-weight: 600;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Complete Meeting Transcription</h1>
      <h2>${meeting.title}</h2>
      <div class="metadata">
        <div class="metadata-item">
          <span class="metadata-label">Date</span>
          <span>${startDate.toLocaleDateString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Time</span>
          <span>${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Segments</span>
          <span>${transcriptions.length}</span>
        </div>
      </div>
    </div>
    
    <div class="transcript-content">
      ${speakerBlocksHtml}
    </div>
    
    <div class="footer">
      <p>Document generated on: ${new Date().toLocaleString()}</p>
      <div class="stats">
        <span class="stat-item">Total segments: ${transcriptions.length}</span>
        <span class="stat-item">Speakers: ${new Set(speakerBlocks.map(b => b.speaker)).size}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

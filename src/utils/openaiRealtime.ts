import { supabase } from "@/integrations/supabase/client";

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = new Float32Array(inputData);
        this.onAudioData(audioData);
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// Convert Float32 PCM to WAV and return base64 string
export const float32ToWavBase64 = (float32Array: Float32Array, sampleRate = 24000): string => {
  const numOfChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  // Convert Float32 to 16-bit PCM
  const buffer = new ArrayBuffer(44 + float32Array.length * bytesPerSample);
  const view = new DataView(buffer);

  // Write WAV header
  let offset = 0;
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + float32Array.length * bytesPerSample, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4; // PCM chunk size
  view.setUint16(offset, 1, true); offset += 2; // PCM format
  view.setUint16(offset, numOfChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2; // bits per sample
  writeString('data');
  view.setUint32(offset, float32Array.length * bytesPerSample, true); offset += 4;

  // PCM samples
  let idx = 44;
  for (let i = 0; i < float32Array.length; i++, idx += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  // Base64 encode
  const uint8Array = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

interface RealtimeMessage {
  type: string;
  transcript?: string;
  speaker?: string;
  delta?: string;
  item_id?: string;
  [key: string]: any;
}

// Clean up transcription: remove non-speech tags, add punctuation
const cleanTranscript = (text: string): string => {
  if (!text) return '';
  
  let cleaned = text
    .replace(/\[MUSIC\]/gi, '')
    .replace(/\[music\]/gi, '')
    .replace(/\(breathing heavily\)/gi, '')
    .replace(/\(breathing\)/gi, '')
    .replace(/\[NOISE\]/gi, '')
    .replace(/\[noise\]/gi, '')
    .replace(/\[SOUND\]/gi, '')
    .replace(/\[sound\]/gi, '')
    .replace(/\[APPLAUSE\]/gi, '')
    .replace(/\[applause\]/gi, '')
    .replace(/\[LAUGHTER\]/gi, '')
    .replace(/\[laughter\]/gi, '')
    .replace(/\(coughing\)/gi, '')
    .replace(/\(sighs\)/gi, '')
    .replace(/\(clears throat\)/gi, '')
    .trim();
  
  if (!cleaned) return '';
  
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  if (cleaned.length > 3 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  return cleaned;
};

export class OpenAIRealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private recorder: AudioRecorder | null = null;
  private audioEl: HTMLAudioElement;
  private onTranscript: (text: string, speaker?: string) => void;
  private onError: (error: string) => void;
  private sessionCreated = false;
  private currentMeetingId: string | null = null;
  private audioChunks: Float32Array[] = [];
  private isCollectingAudio: boolean = false;

  constructor(
    onTranscript: (text: string, speaker?: string) => void,
    onError: (error: string) => void
  ) {
    this.onTranscript = onTranscript;
    this.onError = onError;
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async connect(meetingId: string) {
    this.currentMeetingId = meetingId;
    try {
      console.log('Getting ephemeral token...');
      
      // Get ephemeral token from our edge function
      const { data, error } = await supabase.functions.invoke('openai-realtime-token');
      
      if (error || !data?.client_secret?.value) {
        throw new Error(error?.message || 'Failed to get ephemeral token');
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      console.log('Token received, creating peer connection...');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = e => {
        console.log('Received remote audio track');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.addEventListener("message", (e) => {
        const event: RealtimeMessage = JSON.parse(e.data);
        console.log("Received event:", event.type, event);

        if (event.type === 'session.created') {
          this.sessionCreated = true;
          console.log('Session created, sending configuration...');
          
          // Send session update to enable transcription
          if (this.dc && this.dc.readyState === 'open') {
            this.dc.send(JSON.stringify({
              type: "session.update",
              session: {
                modalities: ["text", "audio"],
                instructions: "You are a meeting transcription assistant. Auto-detect language, identify speakers as Speaker 1, Speaker 2, etc., and maintain speaker consistency.",
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: null, // Disable built-in transcription
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.7,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 2000,
                  idle_timeout_ms: null,
                  create_response: false,
                  interrupt_response: true
                },
                temperature: 0.8
              }
            }));
            console.log('Session configuration sent');
          }
        } else if (event.type === 'session.updated') {
          console.log('Session updated successfully');
        } else if (event.type === 'input_audio_buffer.speech_started') {
          console.log('🎤 User started speaking');
          this.isCollectingAudio = true;
          this.audioChunks = [];
        } else if (event.type === 'input_audio_buffer.speech_stopped') {
          console.log('🎤 User stopped speaking');
          this.isCollectingAudio = false;
          // Transcribe collected audio with proper Amharic script preservation
          if (this.audioChunks.length > 0 && this.currentMeetingId) {
            this.transcribeCollectedAudio(this.currentMeetingId);
          }
        } else if (event.type === 'response.audio_transcript.delta') {
          if (event.delta) {
            const cleaned = cleanTranscript(event.delta);
            if (cleaned) {
              this.onTranscript(cleaned, 'Assistant');
            }
          }
        } else if (event.type === 'response.done') {
          try {
            const status = event?.response?.status;
            const details = event?.response?.status_details?.error;
            if (status === 'failed') {
              const code = details?.code;
              const message = details?.message || 'Realtime response failed';
              const finalMsg = code ? `${code}: ${message}` : message;
              console.error('Realtime response failed:', finalMsg);
              this.onError(finalMsg);
            }
          } catch (e) {
            console.warn('Failed to parse response.done event', e);
          }
        } else if (event.type === 'error') {
          console.error('Realtime API error:', event);
          this.onError(event.message || 'Unknown error');
        }
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      console.log('Connecting to OpenAI Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`OpenAI connection failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log("WebRTC connection established successfully");

      // Start audio recording for transcription
      console.log('Starting audio recorder for transcription...');
      this.recorder = new AudioRecorder((audioData) => {
        // Collect audio chunks when user is speaking
        if (this.isCollectingAudio) {
          this.audioChunks.push(new Float32Array(audioData));
        }
      });
      await this.recorder.start();
      console.log('Audio recorder started');

    } catch (error: any) {
      console.error('Connection error:', error);
      this.onError(error.message || 'Failed to connect');
      throw error;
    }
  }

  disconnect() {
    this.currentMeetingId = null;
    this.isCollectingAudio = false;
    this.audioChunks = [];
    this.recorder?.stop();
    this.recorder = null;
    
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    if (this.audioEl.srcObject) {
      const tracks = (this.audioEl.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      this.audioEl.srcObject = null;
    }
  }

  sendText(text: string) {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('Data channel not ready');
      return;
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.dc.send(JSON.stringify(event));
    this.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  private async transcribeCollectedAudio(meetingId: string) {
    try {
      console.log(`Transcribing ${this.audioChunks.length} audio chunks...`);
      
      // Merge audio chunks into single Float32Array
      const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedAudio = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        mergedAudio.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Convert collected PCM to WAV base64 to ensure valid audio container
      const audioBase64 = float32ToWavBase64(mergedAudio, 24000);
      
      // Get user's language preference
      const { data: userData } = await supabase.auth.getUser();
      let language = 'auto';
      if (userData?.user?.id) {
        const { data: prefs } = await supabase
          .from('transcription_preferences')
          .select('language')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (prefs?.language) {
          language = prefs.language;
        }
      }
      
      // Transcribe using Whisper API with proper Amharic support
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioBase64,
          meetingId,
          language,
          contentType: 'audio/wav'
        }
      });
      
      if (error) {
        console.error('Transcription error:', error);
        this.onError('Transcription failed');
        return;
      }
      
      if (data?.transcription) {
        const cleaned = cleanTranscript(data.transcription);
        if (cleaned) {
          console.log('✅ Transcribed with Amharic support:', cleaned);
          this.onTranscript(cleaned, 'User');
          const detected = data.detectedLanguage || 'auto';
          await this.saveTranscription(meetingId, cleaned, 'User', detected);
        }
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      this.audioChunks = [];
    }
  }

  private async saveTranscription(meetingId: string, content: string, speaker: string, detectedLanguage: string = 'auto') {
    try {
      const { error } = await supabase.functions.invoke('save-transcription', {
        body: {
          meetingId,
          content,
          speaker,
          detectedLanguage,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        console.error('Failed to save transcription:', error);
      } else {
        console.log(`Saved transcription: ${speaker} (${detectedLanguage}): ${content.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('Error saving transcription:', error);
    }
  }
}

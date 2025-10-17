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
  private onProcessingChange?: (isProcessing: boolean) => void;
  private sessionCreated = false;
  private currentMeetingId: string | null = null;
  private audioChunks: Float32Array[] = [];
  private isCollectingAudio: boolean = false;
  private speakerCount: number = 0;
  private lastSpeaker: string = 'User';
  private sessionLanguage: string | null = null;
  private pendingTranscriptionTimer: number | null = null;
  private builtinTranscriptionReceived: boolean = false;

  constructor(
    onTranscript: (text: string, speaker?: string) => void,
    onError: (error: string) => void,
    onProcessingChange?: (isProcessing: boolean) => void,
    language: string = 'en'
  ) {
    this.onTranscript = onTranscript;
    this.onError = onError;
    this.onProcessingChange = onProcessingChange;
    this.sessionLanguage = language;
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async connect(meetingId: string) {
    this.currentMeetingId = meetingId;
    try {
      console.log('Getting ephemeral token for language:', this.sessionLanguage);
      
      // Get ephemeral token from our edge function with language
      const { data, error } = await supabase.functions.invoke('openai-realtime-token', {
        body: { language: this.sessionLanguage }
      });
      
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
            const instructions = this.sessionLanguage === 'am'
              ? "You are a silent meeting transcription system for AMHARIC language. CRITICAL RULES FOR AMHARIC:\n1. ALWAYS write in Ge'ez script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ በ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ)\n2. NEVER use Latin letters (a-z)\n3. NEVER transliterate or romanize\n4. Example correct: 'ሰላም ነው' NOT 'selam new'\n5. Identify speakers as ተናጋሪ 1, ተናጋሪ 2, etc.\n6. Include proper Amharic punctuation (።፣፤፥፦)\n7. DO NOT respond or speak back. Only transcribe silently."
              : this.sessionLanguage === 'ar'
              ? "You are a silent meeting transcription system for ARABIC language. CRITICAL: Always write in Arabic script (ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي). Never use Latin letters. Identify speakers as متحدث 1, متحدث 2, etc. DO NOT respond or speak back. Only transcribe silently."
              : "You are a silent meeting transcription system. CRITICAL: Always transcribe speech in its ORIGINAL SCRIPT - never transliterate or romanize. For Amharic, use Ge'ez script (አማርኛ), not Latin letters. For Arabic, use Arabic script. For Chinese, use Chinese characters. Automatically detect language and identify different speakers as Speaker 1, Speaker 2, etc. DO NOT respond or speak back. Only transcribe silently.";
            
            this.dc.send(JSON.stringify({
              type: "session.update",
              session: {
                modalities: ["text"],
                instructions,
                input_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "whisper-1"
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                  create_response: false
                }
              }
            }));
            console.log('Session configuration sent with language:', this.sessionLanguage, 'instructions length:', instructions.length);
          }
        } else if (event.type === 'session.updated') {
          console.log('Session updated successfully');
        } else if (event.type === 'input_audio_buffer.speech_started') {
          console.log('🎤 User started speaking');
          this.isCollectingAudio = true;
          this.audioChunks = [];
          this.builtinTranscriptionReceived = false;
          if (this.pendingTranscriptionTimer) {
            clearTimeout(this.pendingTranscriptionTimer);
            this.pendingTranscriptionTimer = null;
          }
          this.onProcessingChange?.(true);
        } else if (event.type === 'input_audio_buffer.speech_stopped') {
          console.log('🎤 User stopped speaking - waiting for transcription...');
          this.isCollectingAudio = false;
          
          // Set a fallback timer in case built-in transcription doesn't arrive
          this.pendingTranscriptionTimer = window.setTimeout(() => {
            if (!this.builtinTranscriptionReceived && this.audioChunks.length > 0 && this.currentMeetingId) {
              console.log('⚠️ Built-in transcription timeout, using fallback transcription');
              this.transcribeCollectedAudio(this.currentMeetingId);
            } else {
              this.onProcessingChange?.(false);
            }
          }, 5000); // 5 second timeout
        } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
          // This is the built-in Whisper transcription from OpenAI
          this.builtinTranscriptionReceived = true;
          if (this.pendingTranscriptionTimer) {
            clearTimeout(this.pendingTranscriptionTimer);
            this.pendingTranscriptionTimer = null;
          }
          // Clear collected chunks now that built-in transcript arrived
          this.audioChunks = [];
          
          const transcript = event.transcript?.trim();
          if (transcript) {
            console.log('✅ Built-in transcription received:', transcript.substring(0, 100));
            this.onTranscript(transcript, 'User');
            // Save to database
            if (this.currentMeetingId) {
              this.saveTranscription(this.currentMeetingId, transcript, 'User', 'auto');
            }
            this.onProcessingChange?.(false);
          } else {
            console.warn('⚠️ Empty built-in transcription received');
            this.onProcessingChange?.(false);
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
    this.speakerCount = 0;
    this.lastSpeaker = 'User';
    this.sessionLanguage = null;
    if (this.pendingTranscriptionTimer) {
      clearTimeout(this.pendingTranscriptionTimer);
      this.pendingTranscriptionTimer = null;
    }
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
      console.log(`📝 Transcribing ${this.audioChunks.length} audio chunks...`);
      
      // Validate audio data
      if (this.audioChunks.length === 0) {
        console.warn('No audio chunks to transcribe');
        return;
      }
      
      // Merge audio chunks into single Float32Array
      const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedAudio = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        mergedAudio.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Validate merged audio
      const duration = mergedAudio.length / 24000; // at 24kHz
      console.log(`📊 Audio duration: ${duration.toFixed(2)}s (${this.audioChunks.length} chunks)`);
      
      if (duration < 0.1) {
        console.warn('⚠️ Audio too short to transcribe (<0.1s)');
        this.onProcessingChange?.(false);
        return;
      }
      
      // Allow up to 30 seconds of audio (Whisper API limit)
      let finalAudio = mergedAudio;
      if (duration > 30) {
        console.warn(`⚠️ Audio too long (${duration.toFixed(2)}s), truncating to last 30 seconds`);
        const maxSamples = 24000 * 30; // 30 seconds at 24kHz
        finalAudio = mergedAudio.slice(-maxSamples); // Take last 30 seconds
      }
      
      this.onProcessingChange?.(true);
      
      // Convert collected PCM to WAV base64
      const audioBase64 = float32ToWavBase64(finalAudio, 24000);
      
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
      
      // Transcribe using Whisper API with script preservation
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioBase64,
          meetingId,
          language,
          contentType: 'audio/wav'
        }
      });
      
      if (error) {
        console.error('❌ Transcription error:', error);
        this.onError('Transcription failed. Please try again.');
        return;
      }
      
      if (data?.transcription) {
        const cleaned = cleanTranscript(data.transcription);
        if (cleaned) {
          const detectedLang = data.detectedLanguage || 'auto';
          
          // Track session language for consistency
          if (this.sessionLanguage === null && detectedLang !== 'auto') {
            this.sessionLanguage = detectedLang;
            console.log(`📍 Session language set to: ${detectedLang}`);
          }
          
          console.log(`✅ Transcribed (${detectedLang}):`, cleaned.substring(0, 100) + (cleaned.length > 100 ? '...' : ''));
          
          // Display immediately
          this.onTranscript(cleaned, this.lastSpeaker);
          
          // Save to database with all metadata
          await this.saveTranscription(meetingId, cleaned, this.lastSpeaker, detectedLang);
          
          // Signal processing complete
          this.onProcessingChange?.(false);
        } else {
          console.warn('⚠️ Transcription result was empty after cleaning');
          this.onProcessingChange?.(false);
        }
      } else {
        console.warn('⚠️ No transcription data returned from API');
        this.onProcessingChange?.(false);
      }
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      this.onError('Transcription system error');
      this.onProcessingChange?.(false);
    } finally {
      // Always clear chunks to prevent memory buildup
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
        console.error('❌ Failed to save transcription:', error);
        // Don't throw - we don't want to break the user experience
        // The transcript is already displayed
      } else {
        console.log(`💾 Saved: ${speaker} (${detectedLanguage})`);
      }
    } catch (error) {
      console.error('❌ Error saving transcription:', error);
      // Silently fail - transcript is still displayed to user
    }
  }
}

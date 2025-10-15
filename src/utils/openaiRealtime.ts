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
        this.onAudioData(new Float32Array(inputData));
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

interface RealtimeMessage {
  type: string;
  transcript?: string;
  speaker?: string;
  delta?: string;
  item_id?: string;
  [key: string]: any;
}

export class OpenAIRealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private recorder: AudioRecorder | null = null;
  private audioEl: HTMLAudioElement;
  private onTranscript: (text: string, speaker?: string) => void;
  private onError: (error: string) => void;
  private sessionCreated = false;

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
                instructions: "You are a helpful meeting assistant. Transcribe all speech accurately and identify speakers.",
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "whisper-1"
                },
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
        } else if (event.type === 'input_audio_buffer.speech_stopped') {
          console.log('🎤 User stopped speaking');
        } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
          if (event.transcript) {
            console.log('User transcript:', event.transcript);
            this.onTranscript(event.transcript, 'User');
          }
        } else if (event.type === 'conversation.item.input_audio_transcription.failed') {
          const msg = event?.error?.message || 'Transcription rate limited, retrying soon.';
          console.warn('User transcription failed:', msg);
          this.onError(msg);
        } else if (event.type === 'response.audio_transcript.delta') {
          if (event.delta) {
            this.onTranscript(event.delta, 'Assistant');
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
      const model = "gpt-4o-realtime-preview-2024-10-01";
      
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

    } catch (error: any) {
      console.error('Connection error:', error);
      this.onError(error.message || 'Failed to connect');
      throw error;
    }
  }

  disconnect() {
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
}

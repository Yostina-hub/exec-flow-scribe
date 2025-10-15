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
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private onTranscript: (text: string, speaker?: string) => void;
  private onError: (error: string) => void;
  private sessionCreated = false;

  constructor(
    onTranscript: (text: string, speaker?: string) => void,
    onError: (error: string) => void
  ) {
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async connect(meetingId: string) {
    try {
      const wsUrl = `wss://xtqsvwhwzxcutwdbxzyn.supabase.co/functions/v1/openai-realtime?meeting_id=${meetingId}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };

      this.ws.onmessage = async (event) => {
        const data: RealtimeMessage = JSON.parse(event.data);
        console.log('Received:', data.type, data);

        if (data.type === 'session.created') {
          this.sessionCreated = true;
          // Send session configuration AFTER session.created
          this.sendSessionUpdate();
          // Start recording
          await this.startRecording();
        } else if (data.type === 'input_audio_buffer.speech_started') {
          console.log('🎤 User started speaking');
        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          console.log('🎤 User stopped speaking');
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          if (data.transcript) {
            this.onTranscript(data.transcript, 'User');
          }
        } else if (data.type === 'response.audio_transcript.delta') {
          if (data.delta) {
            this.onTranscript(data.delta, 'Assistant');
          }
        } else if (data.type === 'error') {
          console.error('Realtime API error:', data);
          this.onError(data.message || 'Unknown error');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError('Connection failed');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.stopRecording();
      };
    } catch (error: any) {
      console.error('Connection error:', error);
      this.onError(error.message || 'Failed to connect');
    }
  }

  private sendSessionUpdate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful meeting assistant. Transcribe speech accurately and respond naturally.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        },
        temperature: 0.8,
        max_response_output_tokens: 'inf'
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    console.log('Session config sent');
  }

  private async startRecording() {
    this.recorder = new AudioRecorder((audioData) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const encoded = encodeAudioForAPI(audioData);
        this.ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: encoded
        }));
      }
    });

    await this.recorder.start();
    console.log('Recording started');
  }

  private stopRecording() {
    this.recorder?.stop();
    this.recorder = null;
  }

  disconnect() {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

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

    this.ws.send(JSON.stringify(event));
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }
}

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

const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  return wavArray;
};

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(
        wavData.buffer.slice(0) as ArrayBuffer
      );
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext();
    }
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
  }
}

let audioQueueInstance: AudioQueue | null = null;

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  await audioQueueInstance.addToQueue(audioData);
};

export const clearAudioQueue = () => {
  if (audioQueueInstance) {
    audioQueueInstance.clear();
  }
};

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class RealtimeAssistant {
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private audioContext: AudioContext;
  private projectId: string;
  private onMessage: (message: ConversationMessage) => void;
  private onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  private onAISpeaking: (speaking: boolean) => void;
  private currentTranscript = '';
  private briefingContext: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private shouldReconnect = true;
  private sessionReady = false;

  constructor(
    projectId: string,
    onMessage: (message: ConversationMessage) => void,
    onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
    onAISpeaking: (speaking: boolean) => void
  ) {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.projectId = projectId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.onAISpeaking = onAISpeaking;
  }

  async connect(briefingContext: any) {
    this.shouldReconnect = true;
    this.briefingContext = briefingContext;
    this.onStatusChange('connecting');
    this.sessionReady = false;
    
    const wsUrl = `wss://${this.projectId}.supabase.co/functions/v1/ceo-assistant-realtime`;
    console.log('→ Connecting to WebSocket:', wsUrl, `(Attempt ${this.reconnectAttempts + 1})`);
    
    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!this.sessionReady && this.ws) {
        console.error('✗ Connection timeout - session not ready after 30s');
        this.ws.close();
        this.onStatusChange('error');
      }
    }, 30000); // 30 second timeout

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✓ WebSocket connection established, waiting for session...');
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('← Received event:', data.type);
          
          switch (data.type) {
            case 'error':
              console.error('✗ Server error:', data.error);
              clearTimeout(connectionTimeout);
              this.onStatusChange('error');
              this.ws?.close();
              break;
          case 'session.created':
            console.log('✓ Session created, configuring...');
            // Send session configuration
            this.ws!.send(JSON.stringify({
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: 'You are an elite executive meeting advisor providing real-time strategic guidance.',
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
            }));
            break;

          case 'session.updated':
            console.log('✓ Session configured successfully');
            clearTimeout(connectionTimeout);
            this.sessionReady = true;
            this.reconnectAttempts = 0;
            this.onStatusChange('connected');
            
            // Now start recording
            console.log('→ Starting audio recording...');
            this.recorder = new AudioRecorder((audioData) => {
              if (this.ws?.readyState === WebSocket.OPEN && this.sessionReady) {
                const base64Audio = encodeAudioForAPI(audioData);
                this.ws.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: base64Audio
                }));
              }
            });

            this.recorder.start().then(() => {
              console.log('✓ Audio recording active');
              
              // Send briefing context after session is ready
              if (this.briefingContext) {
                setTimeout(() => this.sendContext(this.briefingContext), 1000);
              }
            }).catch(error => {
              console.error('✗ Failed to start audio recording:', error);
              this.onStatusChange('error');
            });
            break;

          case 'conversation.item.input_audio_transcription.completed':
            const userText = data.transcript;
            this.onMessage({
              role: 'user',
              content: userText,
              timestamp: new Date()
            });
            break;

          case 'response.audio_transcript.delta':
            this.currentTranscript += data.delta;
            break;

          case 'response.audio_transcript.done':
            if (this.currentTranscript) {
              this.onMessage({
                role: 'assistant',
                content: this.currentTranscript,
                timestamp: new Date()
              });
              this.currentTranscript = '';
            }
            break;

          case 'response.audio.delta':
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            await playAudioData(this.audioContext, bytes);
            break;

          case 'response.created':
            this.onAISpeaking(true);
            break;

          case 'response.done':
            this.onAISpeaking(false);
            break;
        }
      } catch (error) {
        console.error('✗ Error processing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('✗ WebSocket error:', error);
      clearTimeout(connectionTimeout);
      this.onStatusChange('error');
    };

    this.ws.onclose = () => {
      console.log('✗ WebSocket closed');
      clearTimeout(connectionTimeout);
      this.sessionReady = false;
      this.cleanup();
      
      // Attempt to reconnect if we should and haven't exceeded max attempts
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
        console.log(`→ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        this.onStatusChange('connecting');
        this.reconnectTimeout = window.setTimeout(() => {
          this.connect(this.briefingContext);
        }, delay);
      } else {
        this.onStatusChange('disconnected');
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('✗ Max reconnection attempts reached');
        }
      }
    };
    } catch (error) {
      console.error('✗ Failed to create WebSocket:', error);
      clearTimeout(connectionTimeout);
      this.onStatusChange('error');
    }
  }

  sendContext(briefingContext: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const contextMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Here is the current briefing context: ${JSON.stringify(briefingContext, null, 2)}`
        }]
      }
    };

    this.ws.send(JSON.stringify(contextMessage));
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
    this.ws.send(JSON.stringify({ type: 'response.create' }));

    this.onMessage({
      role: 'user',
      content: text,
      timestamp: new Date()
    });
  }

  disconnect() {
    this.shouldReconnect = false; // Prevent reconnection when user explicitly disconnects
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    clearAudioQueue();
  }
}

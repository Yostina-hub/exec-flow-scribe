import { pipeline } from '@huggingface/transformers';

let transcriber: any = null;
let transcriberPromise: Promise<any> | null = null;

export const initBrowserWhisper = async () => {
  if (transcriber) return transcriber;
  if (transcriberPromise) return transcriberPromise;
  transcriberPromise = (async () => {
    console.log('Initializing browser-based Whisper model...');
    try {
      const pipe = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { device: 'webgpu' }
      );
      console.log('Browser Whisper model initialized');
      transcriber = pipe;
      return pipe;
    } finally {
      transcriberPromise = null; // clear promise after resolve/reject
    }
  })();
  return transcriberPromise; 
};

export const transcribeAudioBrowser = async (audioBlob: Blob): Promise<string> => {
  let ctx: AudioContext | null = null;
  try {
    const model = await initBrowserWhisper();

    // Use default AudioContext (don’t force sampleRate to avoid decode failures)
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Decode full buffer, then take only the most recent window to avoid duplicates
    const decoded = await ctx.decodeAudioData(await audioBlob.arrayBuffer());
    const pcm = decoded.getChannelData(0); // Float32Array

    const windowSeconds = 8; // analyze last N seconds for stability
    const sampleRate = decoded.sampleRate;
    const windowSamples = Math.min(pcm.length, Math.max(1, Math.floor(sampleRate * windowSeconds)));
    const start = pcm.length - windowSamples;
    const segment = pcm.slice(Math.max(0, start));

    const result = await model(segment);
    return result.text as string;
  } catch (error) {
    console.error('Browser transcription error:', error);
    throw error;
  } finally {
    try { await ctx?.close(); } catch {}
  }
};

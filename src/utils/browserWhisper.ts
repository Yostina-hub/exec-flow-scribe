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

// Clean up transcription: remove non-speech tags, add punctuation
const cleanTranscript = (text: string): string => {
  if (!text) return '';
  
  // Remove common non-speech patterns
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
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Add period if missing and text is substantial
  if (cleaned.length > 3 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  return cleaned;
};

export const transcribeAudioBrowser = async (audioBlob: Blob): Promise<string> => {
  let ctx: AudioContext | null = null;
  let url: string | null = null;
  try {
    if (!audioBlob || audioBlob.size < 8192) {
      // Too small to reliably decode, skip silently
      return '';
    }

    const model = await initBrowserWhisper();

    // Primary path: decode with WebAudio and pass Float32 PCM
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await ctx.decodeAudioData(await audioBlob.arrayBuffer());
      const pcm = decoded.getChannelData(0); // Float32Array

      const windowSeconds = 8; // analyze last N seconds for stability
      const sampleRate = decoded.sampleRate;
      const windowSamples = Math.min(pcm.length, Math.max(1, Math.floor(sampleRate * windowSeconds)));
      const start = pcm.length - windowSamples;
      const segment = pcm.slice(Math.max(0, start));

      const result = await model(segment);
      const rawText = (result?.text as string) || '';
      return cleanTranscript(rawText);
    } catch (primaryErr) {
      console.warn('Primary decode failed, trying pipeline URL fallback...', primaryErr);
      // Fallback: let transformers.js handle decoding from a Blob URL
      url = URL.createObjectURL(audioBlob);
      const result = await model(url);
      const rawText = (result?.text as string) || '';
      return cleanTranscript(rawText);
    }
  } catch (error) {
    console.error('Browser transcription error:', error);
    throw error;
  } finally {
    try { await ctx?.close(); } catch {}
    if (url) URL.revokeObjectURL(url);
  }
};

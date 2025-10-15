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
  try {
    const model = await initBrowserWhisper();

    // Decode compressed audio (e.g., webm/opus) to PCM using WebAudio
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const decoded = await ctx.decodeAudioData(await audioBlob.arrayBuffer());
    const pcm = decoded.getChannelData(0); // Float32Array

    const result = await model(pcm);
    await ctx.close();
    return result.text as string;
  } catch (error) {
    console.error('Browser transcription error:', error);
    throw error;
  }
};

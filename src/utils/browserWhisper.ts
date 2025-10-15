import { pipeline } from '@huggingface/transformers';

let transcriber: any = null;

export const initBrowserWhisper = async () => {
  if (!transcriber) {
    console.log('Initializing browser-based Whisper model...');
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny.en',
      { device: 'webgpu' }
    );
    console.log('Browser Whisper model initialized');
  }
  return transcriber;
};

export const transcribeAudioBrowser = async (audioBlob: Blob): Promise<string> => {
  try {
    const model = await initBrowserWhisper();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const result = await model(arrayBuffer);
    return result.text;
  } catch (error) {
    console.error('Browser transcription error:', error);
    throw error;
  }
};

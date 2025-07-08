/**
 * Configuration management for the application
 */
export const Config = {
  audio: {
    constraints: {
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: true
      }
    },
    recording: {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 16000
    }
  },
  
  whisper: {
    model: 'Xenova/whisper-tiny.en',
    quantized: true,
    subtask: 'transcribe',
    language: 'english',
    chunk_length_s: 30,
    stride_length_s: 5,
    temperature: 0.0,
    no_repeat_ngram_size: 3,
    suppress_tokens: []
  },
  
  vad: {
    model: 'Xenova/silero-vad',
    quantized: true,
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 3,
    preSpeechPadFrames: 10,
    frameSamples: 1536,
    sampleRate: 16000
  },
  
  ui: {
    updateInterval: 100, // Timer update interval in ms
    maxRecordingDuration: 300000, // 5 minutes in ms
    transcriptionDebounce: 500, // ms
    animationDuration: 300 // ms
  },
  
  api: {
    endpoints: {
      upload: '/upload',
      recordings: '/recordings',
      delete: '/delete'
    },
    timeout: 30000 // 30 seconds
  }
};

// Allow runtime configuration overrides
export function updateConfig(path, value) {
  const keys = path.split('.');
  let target = Config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in target)) {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }
  
  target[keys[keys.length - 1]] = value;
}
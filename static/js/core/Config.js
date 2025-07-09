/**
 * Configuration management for the application
 */
export const Config = {
  audio: {
    constraints: {
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: false,       // Keep disabled for raw audio
        noiseSuppression: false,       // Disable to preserve voice quality
        autoGainControl: false,        // Disable to preserve dynamics
        sampleSize: 16,                // 16-bit audio for better quality
        // Browser-specific optimizations
        googEchoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googHighpassFilter: false,
        googTypingNoiseDetection: false
      }
    },
    recording: {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 128000      // Increase bitrate for better quality
    }
  },
  
  whisper: {
    model: 'Xenova/whisper-small.en',
    quantized: true,
    subtask: 'transcribe',
    language: 'english',
    chunk_length_s: 30,
    stride_length_s: 5,
    temperature: 0.0,
    no_repeat_ngram_size: 3,
    suppress_tokens: [],
    beam_size: 5,  // Enable beam search for better accuracy
    patience: 1.0,
    suppress_blank: true
  },
  
  vad: {
    model: 'Xenova/silero-vad',
    quantized: true,
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 3,
    preSpeechPadFrames: 10,
    frameSamples: 2048,          // Increased from 1536 for more stable detection
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
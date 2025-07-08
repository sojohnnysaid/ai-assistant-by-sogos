/**
 * Migration script to transition from old to new architecture
 * This creates compatibility shims for the old recorder.js and transcription-mic.js
 */

// Create global references that old code might expect
window.mediaRecorder = null;
window.audioChunks = [];
window.recordingInterval = null;
window.microphoneTranscription = null;

// Shim for old recorder.js functionality
window.startRecording = function() {
  if (window.app && window.app.manager) {
    window.app.manager.handleRecordClick();
  }
};

window.stopRecording = function() {
  if (window.app && window.app.manager) {
    window.app.manager.handleRecordClick();
  }
};

// Shim for old transcription functionality  
window.MicrophoneTranscription = class {
  constructor() {
    console.log('Using compatibility shim for MicrophoneTranscription');
  }
  
  async start() {
    if (window.app && window.app.manager) {
      await window.app.manager.startTranscription();
    }
  }
  
  async stop() {
    if (window.app && window.app.manager) {
      await window.app.manager.stopTranscription();
    }
  }
};

console.log('Migration shims loaded - old code should continue to work while you transition to the new architecture');
/**
 * Main application entry point with dependency injection
 */

// Import all modules
import { EventBus } from './core/EventBus.js';
import { State } from './core/State.js';
import { Config } from './core/Config.js';
import { ErrorHandler } from './core/ErrorHandler.js';
import { ConsoleFilter } from './utils/ConsoleFilter.js';
import { AudioRecorder } from './services/AudioRecorder.js';
import { RecordingService } from './services/RecordingService.js';
import { TranscriptionWorker } from './services/TranscriptionWorker.js';
import { SimpleVAD } from './services/SimpleVAD.js';
import { SimpleTranscriptionManager } from './services/SimpleTranscriptionManager.js';
import { UIController } from './components/UIController.js';
import { RecordingManager } from './components/RecordingManager.js';

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Set up console filtering
    const consoleFilter = ConsoleFilter.createWithPresets({
      onnx: true,
      dev: false,
      autoStart: true
    });
    
    // Create core instances
    const eventBus = new EventBus();
    const state = new State({
      recording: {
        isActive: false,
        duration: 0,
        startTime: null
      },
      transcription: {
        isActive: false,
        text: '',
        isSpeaking: false
      },
      audio: {
        constraints: Config.audio.constraints
      }
    });
    const errorHandler = new ErrorHandler(eventBus);
    
    // Create UI controller
    const ui = new UIController();
    
    // Create services
    const recorder = new AudioRecorder(Config.audio.recording);
    const service = new RecordingService(Config.api);
    
    // Create transcription components
    const transcriptionWorker = new TranscriptionWorker();
    const vadManager = new SimpleVAD();  // Use simplified VAD
    const transcriptionManager = new SimpleTranscriptionManager({
      worker: transcriptionWorker,
      vad: vadManager,
      eventBus
    });
    
    // Create main manager
    const recordingManager = new RecordingManager({
      recorder,
      service,
      ui,
      transcription: transcriptionManager,
      state,
      eventBus,
      errorHandler
    });
    
    // Initialize the application
    await recordingManager.initialize();
    
    // Make app instance available globally for debugging
    window.app = {
      manager: recordingManager,
      state,
      eventBus,
      config: Config,
      
      // Debug helpers
      debug: {
        getState: () => state.get(),
        getRecorderState: () => recorder.getState(),
        getTranscriptionStatus: () => transcriptionManager.getStatus(),
        
        // Manual controls
        startRecording: () => recordingManager.startRecording(),
        stopRecording: () => recordingManager.stopRecording(),
        startTranscription: () => recordingManager.startTranscription(),
        stopTranscription: () => recordingManager.stopTranscription()
      }
    };
    
    console.log('Application initialized successfully');
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      recordingManager.destroy();
      consoleFilter.stop();
    });
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed inset-0 bg-red-100 flex items-center justify-center p-4';
    errorDiv.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-xl max-w-md">
        <h2 class="text-xl font-bold text-red-600 mb-2">Initialization Error</h2>
        <p class="text-gray-700 mb-4">${error.message}</p>
        <button onclick="location.reload()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Reload Page
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
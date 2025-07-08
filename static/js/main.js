/**
 * Main application entry point - Live Transcription Only
 */

// Import all modules
import { EventBus } from './core/EventBus.js';
import { State } from './core/State.js';
import { ErrorHandler } from './core/ErrorHandler.js';
import { ConsoleFilter } from './utils/ConsoleFilter.js';
import { TranscriptionWorker } from './services/TranscriptionWorker.js';
import { SimpleVAD } from './services/SimpleVAD.js';
import { SimpleTranscriptionManager } from './services/SimpleTranscriptionManager.js';
import { UIController } from './components/UIController.js';

/**
 * TranscriptionApp - Main application class for transcription
 */
class TranscriptionApp {
  constructor() {
    // Core instances
    this.eventBus = new EventBus();
    this.state = new State({
      transcription: {
        isActive: false,
        text: '',
        isSpeaking: false
      }
    });
    this.errorHandler = new ErrorHandler(this.eventBus);
    
    // UI controller
    this.ui = new UIController();
    
    // Transcription components
    this.transcriptionWorker = new TranscriptionWorker();
    this.vadManager = new SimpleVAD();
    this.transcriptionManager = new SimpleTranscriptionManager({
      worker: this.transcriptionWorker,
      vad: this.vadManager,
      eventBus: this.eventBus
    });
    
    // Bind methods
    this.startTranscription = this.startTranscription.bind(this);
    this.stopTranscription = this.stopTranscription.bind(this);
    this.clearTranscription = this.clearTranscription.bind(this);
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('Initializing transcription app...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up transcription event handlers
    this.setupTranscriptionHandlers();
    
    // Initialize UI
    this.ui.clearTranscription();
    
    console.log('Transcription app initialized');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Transcription button
    const transcriptionBtn = this.ui.elements.startTranscriptionBtn;
    if (transcriptionBtn) {
      transcriptionBtn.addEventListener('click', () => {
        const isActive = this.state.get('transcription.isActive');
        if (isActive) {
          this.stopTranscription();
        } else {
          this.startTranscription();
        }
      });
    }
    
    // Clear button
    const clearBtn = this.ui.elements.clearTranscriptionBtn;
    if (clearBtn) {
      clearBtn.addEventListener('click', this.clearTranscription);
    }
  }

  /**
   * Set up transcription event handlers
   */
  setupTranscriptionHandlers() {
    // Transcription started
    this.eventBus.on('transcription:started', () => {
      this.state.set('transcription.isActive', true);
      this.ui.updateTranscriptionButton('active');
    });
    
    // Transcription stopped
    this.eventBus.on('transcription:stopped', () => {
      this.state.set('transcription.isActive', false);
      this.state.set('transcription.isSpeaking', false);
      this.ui.updateTranscriptionButton('idle');
      this.ui.updateTranscriptionStatus('Ready to transcribe', false, false);
    });
    
    // Status updates
    this.eventBus.on('transcription:status', (data) => {
      const isActive = this.state.get('transcription.isActive');
      const isSpeaking = data.type === 'speaking';
      
      this.state.set('transcription.isSpeaking', isSpeaking);
      this.ui.updateTranscriptionStatus(data.message, isActive, isSpeaking);
    });
    
    // Transcription received
    this.eventBus.on('transcription:transcription', (data) => {
      if (data.text && data.text.trim()) {
        this.ui.appendTranscription(data.text.trim());
      }
    });
    
    // Errors
    this.eventBus.on('transcription:error', (data) => {
      console.error('Transcription error:', data);
      this.ui.showError(data.message || 'Transcription error occurred');
      this.ui.updateTranscriptionButton('idle');
    });
  }

  /**
   * Start transcription
   */
  async startTranscription() {
    try {
      this.ui.updateTranscriptionButton('loading');
      await this.transcriptionManager.start();
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.ui.showError('Failed to start transcription. Please check microphone permissions.');
      this.ui.updateTranscriptionButton('idle');
    }
  }

  /**
   * Stop transcription
   */
  async stopTranscription() {
    try {
      await this.transcriptionManager.stop();
    } catch (error) {
      console.error('Failed to stop transcription:', error);
      this.ui.showError('Failed to stop transcription');
    }
  }

  /**
   * Clear transcription
   */
  clearTranscription() {
    this.ui.clearTranscription();
    this.state.set('transcription.text', '');
  }

  /**
   * Destroy the application
   */
  async destroy() {
    await this.transcriptionManager.destroy();
  }
}

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
    
    // Create and initialize app
    const app = new TranscriptionApp();
    await app.initialize();
    
    // Make app instance available globally for debugging
    window.app = {
      instance: app,
      state: app.state,
      eventBus: app.eventBus,
      
      // Debug helpers
      debug: {
        getState: () => app.state.get(),
        getTranscriptionStatus: () => app.transcriptionManager.getStatus?.() || {
          isActive: app.state.get('transcription.isActive'),
          isSpeaking: app.state.get('transcription.isSpeaking')
        },
        
        // Manual controls
        startTranscription: () => app.startTranscription(),
        stopTranscription: () => app.stopTranscription(),
        clearTranscription: () => app.clearTranscription()
      }
    };
    
    console.log('Application initialized successfully');
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      app.destroy();
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
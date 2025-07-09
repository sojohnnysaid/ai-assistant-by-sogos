/**
 * Main application entry point - AI Voice Chat
 */

// Import all modules
import { EventBus } from './core/EventBus.js';
import { State } from './core/State.js';
import { ErrorHandler } from './core/ErrorHandler.js';
import { ConsoleFilter } from './utils/ConsoleFilter.js';
import { TranscriptionWorker } from './services/TranscriptionWorker.js';
import { SimpleVAD } from './services/SimpleVAD.js';
import { SimpleTranscriptionManager } from './services/SimpleTranscriptionManager.js';
import { AIChatService } from './services/AIChatService.js';
import { UIController } from './components/UIController.js';

/**
 * VoiceChatApp - Main application class for AI voice chat
 */
class VoiceChatApp {
  constructor() {
    // Core instances
    this.eventBus = new EventBus();
    this.state = new State({
      transcription: {
        isActive: false,
        text: '',
        isSpeaking: false
      },
      chat: {
        mode: 'ai', // 'ai' or 'transcription'
        isProcessing: false
      }
    });
    this.errorHandler = new ErrorHandler(this.eventBus);
    
    // UI controller
    this.ui = new UIController(this.eventBus);
    
    // Services
    this.transcriptionWorker = new TranscriptionWorker();
    this.vadManager = new SimpleVAD();
    this.transcriptionManager = new SimpleTranscriptionManager({
      worker: this.transcriptionWorker,
      vad: this.vadManager,
      eventBus: this.eventBus
    });
    this.aiChatService = new AIChatService();
    
    // Bind methods
    this.startTranscription = this.startTranscription.bind(this);
    this.stopTranscription = this.stopTranscription.bind(this);
    this.clearChat = this.clearChat.bind(this);
    this.handleChatModeToggle = this.handleChatModeToggle.bind(this);
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('Initializing voice chat app...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up transcription event handlers
    this.setupTranscriptionHandlers();
    
    // Initialize UI based on mode
    this.updateUIMode();
    
    console.log('Voice chat app initialized');
  }
  
  /**
   * Warm up audio context (call after user interaction)
   */
  async warmUpAudioContext() {
    if (this.audioContextWarmedUp) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      // Create a silent buffer to prime the audio system
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      console.log('Audio context warmed up');
      this.audioContextWarmedUp = true;
    } catch (e) {
      console.warn('Could not warm up audio context:', e);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Audio playback events
    this.eventBus.on('audio:playback:start', () => {
      console.log('[VoiceChatApp] AI audio playback started, pausing transcription');
      if (this.transcriptionManager && this.state.get('transcription.isActive')) {
        this.transcriptionManager.pause();
      }
    });
    
    this.eventBus.on('audio:playback:end', () => {
      console.log('[VoiceChatApp] AI audio playback ended, resuming transcription');
      if (this.transcriptionManager && this.state.get('transcription.isActive')) {
        this.transcriptionManager.resume();
      }
    });
    
    // Transcription button
    const transcriptionBtn = this.ui.elements.startTranscriptionBtn;
    if (transcriptionBtn) {
      console.log('[VoiceChatApp] Setting up transcription button listener');
      transcriptionBtn.addEventListener('click', () => {
        console.log('[VoiceChatApp] Transcription button clicked');
        const isActive = this.state.get('transcription.isActive');
        console.log('[VoiceChatApp] Current active state:', isActive);
        if (isActive) {
          this.stopTranscription();
        } else {
          this.startTranscription();
        }
      });
    } else {
      console.error('[VoiceChatApp] Transcription button not found!');
    }
    
    // Clear button
    const clearBtn = this.ui.elements.clearChatBtn;
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearChat());
    }
    
    // Chat mode toggle
    const chatToggle = this.ui.elements.chatModeToggle;
    if (chatToggle) {
      chatToggle.addEventListener('change', (e) => this.handleChatModeToggle(e));
    }
  }

  /**
   * Set up transcription event handlers
   */
  setupTranscriptionHandlers() {
    // Speech events - handle audio pause/resume
    this.eventBus.on('speech:start', () => {
      this.state.set('transcription.isSpeaking', true);
      // Stop AI audio completely when user starts speaking
      if (this.ui.isAudioPlaying()) {
        console.log('[VoiceChatApp] User started speaking, stopping AI audio');
        this.ui.stopAudio();
      }
    });
    
    this.eventBus.on('speech:end', () => {
      this.state.set('transcription.isSpeaking', false);
      // No need to resume since we stopped the audio completely
    });
    
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
      this.ui.updateTranscriptionStatus('Ready', false, false);
    });
    
    // Status updates
    this.eventBus.on('transcription:status', (data) => {
      const isActive = this.state.get('transcription.isActive');
      const isSpeaking = data.type === 'speaking';
      
      this.state.set('transcription.isSpeaking', isSpeaking);
      this.ui.updateTranscriptionStatus(data.message, isActive, isSpeaking);
    });
    
    // Transcription received
    this.eventBus.on('transcription:transcription', async (data) => {
      if (data.text && data.text.trim()) {
        const cleanText = data.text.trim();
        
        if (this.isAIChatMode()) {
          // Add user message to chat
          this.ui.addChatMessage(cleanText, 'user');
          
          // Process with AI
          await this.processAIResponse(cleanText);
        } else {
          // Just show transcription
          this.ui.appendTranscription(cleanText);
        }
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
   * Process AI response for a user message
   * @param {string} userMessage - User's transcribed message
   */
  async processAIResponse(userMessage) {
    if (this.state.get('chat.isProcessing')) {
      return;
    }
    
    this.state.set('chat.isProcessing', true);
    this.ui.showAIThinking();
    
    try {
      // Get AI response with voice
      const response = await this.aiChatService.sendMessage(userMessage);
      
      // Hide thinking indicator
      this.ui.hideAIThinking();
      
      // Add AI message to chat
      this.ui.addChatMessage(response.text, 'assistant');
      
      // Play AI voice response if available
      if (response.audio) {
        try {
          await this.ui.playAudio(response.audio, response.audioFormat, response.sampleRate);
        } catch (audioError) {
          console.warn('Could not play audio:', audioError);
          // Continue without audio - text is already shown
        }
      }
      
    } catch (error) {
      console.error('AI chat error:', error);
      this.ui.hideAIThinking();
      this.ui.showError('Failed to get AI response. Please try again.');
    } finally {
      this.state.set('chat.isProcessing', false);
    }
  }

  /**
   * Handle chat mode toggle
   */
  handleChatModeToggle(event) {
    const isAIMode = event.target.checked;
    this.state.set('chat.mode', isAIMode ? 'ai' : 'transcription');
    this.updateUIMode();
    this.clearChat();
  }

  /**
   * Update UI based on current mode
   */
  updateUIMode() {
    const isAIMode = this.isAIChatMode();
    this.ui.setChatMode(isAIMode);
  }

  /**
   * Check if in AI chat mode
   * @returns {boolean}
   */
  isAIChatMode() {
    return this.state.get('chat.mode') === 'ai';
  }

  /**
   * Start transcription
   */
  async startTranscription() {
    try {
      console.log('[VoiceChatApp] Starting transcription...');
      
      // Warm up audio context on first user interaction
      await this.warmUpAudioContext();
      
      this.ui.updateTranscriptionButton('loading');
      await this.transcriptionManager.start();
      console.log('[VoiceChatApp] Transcription started successfully');
    } catch (error) {
      console.error('Failed to start transcription:', error);
      this.ui.showError('Failed to start listening. Please check microphone permissions.');
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
      this.ui.showError('Failed to stop listening');
    }
  }

  /**
   * Clear chat/transcription
   */
  clearChat() {
    if (this.isAIChatMode()) {
      this.ui.clearChat();
      this.aiChatService.clearHistory();
    } else {
      this.ui.clearTranscription();
    }
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
    const app = new VoiceChatApp();
    await app.initialize();
    
    // Make app instance available globally for debugging
    window.app = {
      instance: app,
      state: app.state,
      eventBus: app.eventBus,
      
      // Debug helpers
      debug: {
        getState: () => app.state.get(),
        getChatHistory: () => app.aiChatService.getHistory(),
        getTranscriptionStatus: () => ({
          isActive: app.state.get('transcription.isActive'),
          isSpeaking: app.state.get('transcription.isSpeaking')
        }),
        
        // Manual controls
        startTranscription: () => app.startTranscription(),
        stopTranscription: () => app.stopTranscription(),
        clearChat: () => app.clearChat(),
        sendMessage: (text) => app.processAIResponse(text)
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
/**
 * TranscriptionManager - Orchestrates VAD and Whisper for live transcription
 */
export class TranscriptionManager {
  constructor(dependencies = {}) {
    this.worker = dependencies.worker || null;
    this.vad = dependencies.vad || null;
    this.eventBus = dependencies.eventBus || null;
    this.errorHandler = dependencies.errorHandler || null;
    
    this.isActive = false;
    this.isProcessing = false;
    this.audioQueue = [];
    this.unsubscribers = [];
  }

  /**
   * Initialize transcription manager
   * @returns {Promise<void>}
   */
  async initialize() {
    // Initialize worker if needed
    if (this.worker && !this.worker.isReady) {
      await this.worker.initialize();
    }
    
    // Initialize VAD if needed
    if (this.vad && !this.vad.vad) {
      await this.vad.initialize();
    }
    
    // Set up VAD event handlers
    if (this.vad) {
      const unsubscribe = this.vad.on('speechend', (audioData) => {
        this.handleSpeechEnd(audioData);
      });
      this.unsubscribers.push(unsubscribe);
    }
  }

  /**
   * Start live transcription
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isActive) return;
    
    try {
      this.emit('status', { type: 'loading', message: 'Initializing transcription...' });
      
      // Initialize components
      await this.initialize();
      
      // Start VAD
      if (this.vad) {
        await this.vad.start();
      }
      
      this.isActive = true;
      this.emit('started');
      this.emit('status', { type: 'ready', message: 'Listening...' });
      
    } catch (error) {
      this.handleError(error, 'Failed to start transcription');
      throw error;
    }
  }

  /**
   * Stop live transcription
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isActive) return;
    
    try {
      // Stop VAD
      if (this.vad) {
        await this.vad.stop();
      }
      
      // Clear audio queue
      this.audioQueue = [];
      this.isActive = false;
      this.isProcessing = false;
      
      this.emit('stopped');
      this.emit('status', { type: 'idle', message: 'Transcription stopped' });
      
    } catch (error) {
      this.handleError(error, 'Failed to stop transcription');
      throw error;
    }
  }

  /**
   * Handle speech end event from VAD
   * @param {Float32Array} audioData - Captured audio
   */
  async handleSpeechEnd(audioData) {
    if (!this.isActive) return;
    
    // Add to queue
    this.audioQueue.push(audioData);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processAudioQueue();
    }
  }

  /**
   * Process queued audio segments
   */
  async processAudioQueue() {
    if (this.isProcessing || this.audioQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.audioQueue.length > 0 && this.isActive) {
      const audioData = this.audioQueue.shift();
      
      try {
        this.emit('status', { type: 'processing', message: 'Processing speech...' });
        
        // Send to worker for transcription
        const result = await this.worker.transcribe(audioData);
        
        if (result && result.text && result.text.trim()) {
          this.emit('transcription', {
            text: result.text,
            timestamp: Date.now(),
            confidence: result.confidence
          });
        }
        
        this.emit('status', { type: 'ready', message: 'Listening...' });
        
      } catch (error) {
        this.handleError(error, 'Transcription failed');
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Get current status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isActive: this.isActive,
      isProcessing: this.isProcessing,
      queueLength: this.audioQueue.length,
      vadActive: this.vad?.getIsActive() || false,
      workerReady: this.worker?.isReady || false
    };
  }

  /**
   * Handle errors
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  handleError(error, context) {
    console.error(`TranscriptionManager: ${context}`, error);
    
    if (this.errorHandler) {
      const message = this.errorHandler.handle(error, 'TranscriptionManager');
      this.emit('error', { error, message, context });
    } else {
      this.emit('error', { error, message: error.message, context });
    }
  }

  /**
   * Emit events
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(`transcription:${event}`, data);
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    await this.stop();
    
    // Remove event listeners
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
    
    // Destroy components
    if (this.vad) {
      await this.vad.destroy();
    }
    
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
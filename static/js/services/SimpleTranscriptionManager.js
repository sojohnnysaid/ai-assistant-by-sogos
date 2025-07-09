/**
 * SimpleTranscriptionManager - Clean implementation connecting VAD to Whisper
 */
export class SimpleTranscriptionManager {
  constructor(dependencies = {}) {
    this.vad = dependencies.vad;
    this.worker = dependencies.worker;
    this.eventBus = dependencies.eventBus;
    
    this.isActive = false;
    this.isRunning = false;
    this.isTranscribing = false;
    this.isPaused = false;
    this.unsubscribers = [];
  }

  /**
   * Initialize and set up event handlers
   */
  async initialize() {
    console.log('[SimpleTranscriptionManager] Initializing...');
    
    // Initialize worker if needed
    if (this.worker && !this.worker.isReady) {
      console.log('[SimpleTranscriptionManager] Initializing worker...');
      await this.worker.initialize();
    }
    
    // Set up VAD event handlers
    if (this.vad) {
      console.log('[SimpleTranscriptionManager] Setting up VAD handlers...');
      
      // When speech starts
      const unsubscribe1 = this.vad.on('speechstart', () => {
        console.log('[SimpleTranscriptionManager] Speech started');
        this.eventBus.emit('speech:start');
        this.eventBus.emit('transcription:status', {
          type: 'speaking',
          message: 'Listening to speech...'
        });
      });
      this.unsubscribers.push(unsubscribe1);
      
      // When speech ends
      const unsubscribe2 = this.vad.on('speechend', async (audioData) => {
        console.log('[SimpleTranscriptionManager] Speech ended, processing audio...');
        this.eventBus.emit('speech:end');
        
        // Update status
        this.eventBus.emit('transcription:status', {
          type: 'processing',
          message: 'Processing speech...'
        });
        
        // Process the audio
        await this.transcribeAudio(audioData);
        
        // Back to listening
        this.eventBus.emit('transcription:status', {
          type: 'ready',
          message: 'Listening...'
        });
      });
      this.unsubscribers.push(unsubscribe2);
      
      // VAD misfire
      const unsubscribe3 = this.vad.on('misfire', () => {
        console.log('[SimpleTranscriptionManager] VAD misfire');
        this.eventBus.emit('transcription:status', {
          type: 'ready',
          message: 'Listening...'
        });
      });
      this.unsubscribers.push(unsubscribe3);
    }
  }

  /**
   * Start transcription
   */
  async start() {
    if (this.isRunning) {
      console.log('[SimpleTranscriptionManager] Already running');
      return;
    }
    
    try {
      console.log('[SimpleTranscriptionManager] Starting transcription...');
      
      // Update status
      this.eventBus.emit('transcription:status', {
        type: 'loading',
        message: 'Initializing transcription...'
      });
      
      // Initialize components
      await this.initialize();
      
      // Start VAD
      if (this.vad) {
        console.log('[SimpleTranscriptionManager] Starting VAD...');
        await this.vad.start();
      }
      
      this.isActive = true;
      this.isRunning = true;
      
      // Update status
      this.eventBus.emit('transcription:started');
      this.eventBus.emit('transcription:status', {
        type: 'ready',
        message: 'Listening... (Speak clearly into your microphone)'
      });
      
      console.log('[SimpleTranscriptionManager] Transcription started successfully');
      
    } catch (error) {
      console.error('[SimpleTranscriptionManager] Failed to start:', error);
      this.eventBus.emit('transcription:error', {
        error,
        message: error.message || 'Failed to start transcription'
      });
      throw error;
    }
  }

  /**
   * Stop transcription
   */
  async stop() {
    if (!this.isRunning) {
      console.log('[SimpleTranscriptionManager] Not running');
      return;
    }
    
    try {
      console.log('[SimpleTranscriptionManager] Stopping transcription...');
      
      // Stop VAD
      if (this.vad) {
        await this.vad.stop();
      }
      
      this.isActive = false;
      this.isRunning = false;
      this.isTranscribing = false;
      
      // Update status
      this.eventBus.emit('transcription:stopped');
      this.eventBus.emit('transcription:status', {
        type: 'idle',
        message: 'Transcription stopped'
      });
      
      console.log('[SimpleTranscriptionManager] Transcription stopped');
      
    } catch (error) {
      console.error('[SimpleTranscriptionManager] Failed to stop:', error);
      throw error;
    }
  }

  /**
   * Pause transcription (keep listening but don't process)
   */
  pause() {
    if (!this.isRunning) return;
    
    console.log('[SimpleTranscriptionManager] Pausing transcription...');
    this.isPaused = true;
    
    // Pause VAD if it has a pause method
    if (this.vad && this.vad.pause) {
      this.vad.pause();
    }
  }
  
  /**
   * Resume transcription
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    
    console.log('[SimpleTranscriptionManager] Resuming transcription...');
    this.isPaused = false;
    
    // Resume VAD if it has a resume method
    if (this.vad && this.vad.resume) {
      this.vad.resume();
    }
  }

  /**
   * Transcribe audio data
   */
  async transcribeAudio(audioData) {
    if (this.isTranscribing) {
      console.log('[SimpleTranscriptionManager] Already transcribing, skipping...');
      return;
    }
    
    if (this.isPaused) {
      console.log('[SimpleTranscriptionManager] Transcription is paused, skipping...');
      return;
    }
    
    this.isTranscribing = true;
    
    try {
      // Log audio info
      console.log('[SimpleTranscriptionManager] Transcribing audio:', {
        type: audioData.constructor.name,
        length: audioData.length,
        sampleRate: 16000,
        duration: `${(audioData.length / 16000).toFixed(2)}s`
      });
      
      // Send to worker
      const result = await this.worker.transcribe(audioData);
      
      console.log('[SimpleTranscriptionManager] Transcription result:', result);
      
      // Emit transcription if we got text
      if (result && result.text && result.text.trim()) {
        this.eventBus.emit('transcription:transcription', {
          text: result.text,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('[SimpleTranscriptionManager] Transcription error:', error);
      this.eventBus.emit('transcription:error', {
        error,
        message: 'Failed to transcribe audio'
      });
    } finally {
      this.isTranscribing = false;
    }
  }

  /**
   * Clean up
   */
  async destroy() {
    console.log('[SimpleTranscriptionManager] Destroying...');
    
    await this.stop();
    
    // Remove event listeners
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
    
    // Destroy VAD
    if (this.vad) {
      await this.vad.destroy();
    }
  }
}
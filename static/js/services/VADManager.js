/**
 * VADManager - Voice Activity Detection management
 */
export class VADManager {
  constructor(config = {}) {
    this.config = {
      model: 'Xenova/silero-vad',
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      minSpeechFrames: 3,
      preSpeechPadFrames: 10,
      frameSamples: 1536,
      sampleRate: 16000,
      ...config
    };
    
    this.vad = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isActive = false;
    this.speechFrames = [];
    this.speechPadding = [];
    this.isSpeaking = false;
    this.consecutiveSpeechFrames = 0;
  }

  /**
   * Initialize VAD
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.vad) return;
    
    // Dynamically import VAD
    const { MicVAD } = await import('https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.7/dist/bundle.min.js');
    
    this.vad = await MicVAD.new({
      onSpeechStart: () => {
        this.isSpeaking = true;
        this.emit('speechstart');
      },
      
      onSpeechEnd: (audio) => {
        this.isSpeaking = false;
        this.emit('speechend', audio);
      },
      
      onVADMisfire: () => {
        this.emit('misfire');
      },
      
      positiveSpeechThreshold: this.config.positiveSpeechThreshold,
      negativeSpeechThreshold: this.config.negativeSpeechThreshold,
      minSpeechFrames: this.config.minSpeechFrames,
      preSpeechPadFrames: this.config.preSpeechPadFrames,
      frameSamples: this.config.frameSamples
    });
  }

  /**
   * Start VAD
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isActive) return;
    
    if (!this.vad) {
      await this.initialize();
    }
    
    await this.vad.start();
    this.isActive = true;
    this.emit('started');
  }

  /**
   * Stop VAD
   */
  async stop() {
    if (!this.isActive || !this.vad) return;
    
    this.vad.pause();
    this.isActive = false;
    this.isSpeaking = false;
    this.emit('stopped');
  }

  /**
   * Destroy VAD and release resources
   */
  async destroy() {
    await this.stop();
    
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }
    
    this.listeners.clear();
  }

  /**
   * Get current speaking state
   * @returns {boolean} Speaking state
   */
  getIsSpeaking() {
    return this.isSpeaking;
  }

  /**
   * Check if VAD is active
   * @returns {boolean} Active state
   */
  getIsActive() {
    return this.isActive;
  }

  /**
   * Update VAD configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    
    // If VAD is initialized, update its config
    if (this.vad) {
      // Note: Some VAD implementations may require reinitializing
      console.warn('VAD config update may require restart');
    }
  }

  /**
   * Event handling
   */
  listeners = new Map();

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in VAD event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Alternative manual VAD implementation for fallback
   * @param {Float32Array} audioData - Audio samples
   * @returns {boolean} Speech detected
   */
  detectSpeechManual(audioData) {
    // Calculate RMS (Root Mean Square) for simple energy-based VAD
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    
    // Simple threshold-based detection
    const energyThreshold = 0.01;
    return rms > energyThreshold;
  }
}
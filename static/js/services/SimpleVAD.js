/**
 * SimpleVAD - Direct implementation of VAD following the documentation
 */
export class SimpleVAD {
  constructor() {
    this.vad = null;
    this.isActive = false;
    this.listeners = new Map();
  }

  /**
   * Initialize VAD with proper configuration
   */
  async initialize() {
    if (this.vad) return;
    
    console.log('[SimpleVAD] Initializing VAD...');
    
    try {
      // Check if vad is available globally (loaded via script tag)
      if (typeof vad === 'undefined') {
        throw new Error('VAD library not loaded. Make sure vad-web script is included.');
      }
      
      // Create VAD instance following the exact documentation pattern
      this.vad = await vad.MicVAD.new({
        onSpeechStart: () => {
          console.log('[SimpleVAD] Speech start detected');
          this.emit('speechstart');
        },
        
        onSpeechEnd: (audio) => {
          console.log('[SimpleVAD] Speech end detected, audio length:', audio.length);
          // audio is Float32Array of audio samples at 16000 Hz sample rate
          this.emit('speechend', audio);
        },
        
        // Optional: handle misfires
        onVADMisfire: () => {
          console.log('[SimpleVAD] VAD misfire');
          this.emit('misfire');
        },
        
        // Optimized thresholds for better interruption handling
        positiveSpeechThreshold: 0.6,    // Increased for faster detection
        negativeSpeechThreshold: 0.4,     // Increased for faster end detection
        minSpeechFrames: 2,               // Reduced from 3
        preSpeechPadFrames: 15,           // Increased to capture more pre-speech audio
        redemptionFrames: 5               // Reduced for faster response
      });
      
      console.log('[SimpleVAD] VAD initialized successfully');
      
    } catch (error) {
      console.error('[SimpleVAD] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Start VAD
   */
  async start() {
    if (this.isActive) {
      console.log('[SimpleVAD] Already active');
      return;
    }
    
    // Initialize if needed
    if (!this.vad) {
      await this.initialize();
    }
    
    console.log('[SimpleVAD] Starting VAD...');
    await this.vad.start();
    this.isActive = true;
    this.emit('started');
    console.log('[SimpleVAD] VAD started successfully');
  }

  /**
   * Stop VAD
   */
  async stop() {
    if (!this.isActive || !this.vad) {
      console.log('[SimpleVAD] Not active or not initialized');
      return;
    }
    
    console.log('[SimpleVAD] Stopping VAD...');
    this.vad.pause();
    this.isActive = false;
    this.emit('stopped');
    console.log('[SimpleVAD] VAD stopped');
  }

  /**
   * Destroy VAD and release resources
   */
  async destroy() {
    if (this.vad) {
      await this.stop();
      this.vad.destroy();
      this.vad = null;
      console.log('[SimpleVAD] VAD destroyed');
    }
  }

  /**
   * Simple event emitter
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[SimpleVAD] Error in ${event} handler:`, error);
        }
      });
    }
  }
}
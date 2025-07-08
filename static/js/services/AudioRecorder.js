/**
 * AudioRecorder - Handles audio recording logic
 */
export class AudioRecorder {
  constructor(config = {}) {
    this.config = {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 16000,
      ...config
    };
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.startTime = null;
    this.isRecording = false;
  }

  /**
   * Check if MediaRecorder is supported
   * @returns {boolean} Support status
   */
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }

  /**
   * Get available MIME types
   * @returns {string[]} Supported MIME types
   */
  static getSupportedMimeTypes() {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Start recording
   * @param {MediaStreamConstraints} constraints - Media constraints
   * @returns {Promise<void>}
   */
  async start(constraints = { audio: true }) {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    if (!AudioRecorder.isSupported()) {
      throw new Error('MediaRecorder not supported');
    }

    try {
      // Get audio stream
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Find supported MIME type
      const mimeType = this.findSupportedMimeType();
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond
      });
      
      // Reset state
      this.audioChunks = [];
      this.startTime = Date.now();
      this.isRecording = true;
      
      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start();
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording
   * @returns {Promise<Blob>} Recorded audio blob
   */
  async stop() {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('Not recording');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder.mimeType 
          });
          this.cleanup();
          resolve(blob);
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };
      
      this.mediaRecorder.onerror = (error) => {
        this.cleanup();
        reject(error);
      };
      
      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pause() {
    if (this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resume() {
    if (this.isRecording && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get recording state
   * @returns {string|null} Current state
   */
  getState() {
    return this.mediaRecorder?.state || null;
  }

  /**
   * Get elapsed recording time
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime() {
    if (!this.startTime || !this.isRecording) {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Check if currently recording
   * @returns {boolean} Recording status
   */
  getIsRecording() {
    return this.isRecording;
  }

  /**
   * Find supported MIME type
   * @returns {string} Supported MIME type
   */
  findSupportedMimeType() {
    const supportedTypes = AudioRecorder.getSupportedMimeTypes();
    
    if (supportedTypes.includes(this.config.mimeType)) {
      return this.config.mimeType;
    }
    
    if (supportedTypes.length > 0) {
      return supportedTypes[0];
    }
    
    throw new Error('No supported MIME types found');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Reset state
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.startTime = null;
    this.isRecording = false;
  }

  /**
   * Destroy recorder and release all resources
   */
  destroy() {
    if (this.isRecording) {
      this.stop().catch(() => {});
    }
    this.cleanup();
  }
}
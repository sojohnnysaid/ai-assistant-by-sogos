/**
 * TranscriptionWorker - Manages Web Worker for Whisper transcription
 */
export class TranscriptionWorker {
  constructor(workerPath = '/static/js/workers/whisper-worker-simple.js') {
    this.workerPath = workerPath;
    this.worker = null;
    this.isReady = false;
    this.messageQueue = [];
    this.messageHandlers = new Map();
    this.messageId = 0;
  }

  /**
   * Initialize the worker
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.worker) return;
    
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(this.workerPath);
        
        this.worker.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(error);
        };
        
        // Handle init message
        this.once('init', () => {
          // Now initialize the model
          this.send('init');
        });
        
        // Wait for ready signal
        this.once('ready', () => {
          this.isReady = true;
          this.processQueue();
          resolve();
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Transcribe audio data
   * @param {Float32Array} audioData - Audio samples
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioData, options = {}) {
    if (!this.isReady) {
      await this.initialize();
    }
    
    return this.sendAndWait('transcribe', { 
      audio: audioData,
      options: {
        return_timestamps: false,
        chunk_length_s: 30,
        stride_length_s: 5,
        ...options
      }
    });
  }

  /**
   * Send a message to the worker
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  send(type, data = {}) {
    const message = {
      id: this.messageId++,
      type,
      ...data
    };
    
    if (this.worker && this.isReady) {
      this.worker.postMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Send a message and wait for response
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {Promise<any>} Response data
   */
  sendAndWait(type, data = {}) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      
      const message = {
        id,
        type,
        ...data
      };
      
      // Set up response handler
      this.messageHandlers.set(id, { resolve, reject });
      
      if (this.worker && this.isReady) {
        this.worker.postMessage(message);
      } else {
        this.messageQueue.push(message);
      }
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.messageHandlers.has(id)) {
          this.messageHandlers.delete(id);
          reject(new Error('Worker response timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Handle messages from worker
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    const { id, type, status, result, error } = data;
    
    // Handle responses to sent messages
    if (id !== undefined && this.messageHandlers.has(id)) {
      const handler = this.messageHandlers.get(id);
      this.messageHandlers.delete(id);
      
      if (status === 'error' || error) {
        handler.reject(new Error(error || 'Worker error'));
      } else {
        handler.resolve(result);
      }
      return;
    }
    
    // Handle worker status messages
    switch (type) {
      case 'init':
        this.emit('init');
        break;
        
      case 'ready':
        this.emit('ready');
        break;
        
      case 'status':
        this.emit('status', data);
        break;
        
      case 'progress':
        this.emit('progress', data);
        break;
        
      case 'error':
        console.error('[Worker Error]', data.error);
        this.emit('error', data);
        break;
        
      case 'result':
        // This is handled by the response handler above
        break;
        
      default:
        this.emit(type, data);
    }
  }

  /**
   * Process queued messages
   */
  processQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.worker.postMessage(message);
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
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    this.on(event, wrapper);
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
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.messageQueue = [];
      this.messageHandlers.clear();
    }
  }
}
/**
 * Centralized error handling
 */
export class ErrorHandler {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.errorMessages = {
      NotAllowedError: 'Microphone access was denied. Please allow microphone access and try again.',
      NotFoundError: 'No microphone found. Please connect a microphone and try again.',
      NotSupportedError: 'Your browser does not support audio recording.',
      AbortError: 'Recording was aborted.',
      InvalidStateError: 'Invalid recorder state.',
      NetworkError: 'Network error occurred. Please check your connection.',
      TimeoutError: 'Operation timed out. Please try again.',
      ValidationError: 'Invalid input provided.',
      ModelLoadError: 'Failed to load AI model. Please refresh the page.',
      TranscriptionError: 'Failed to transcribe audio. Please try again.',
      FileUploadError: 'Failed to upload file. Please check your connection.',
      DeleteError: 'Failed to delete recording.',
      UnknownError: 'An unexpected error occurred.'
    };
  }

  /**
   * Handle an error with appropriate user messaging
   * @param {Error} error - The error to handle
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional error metadata
   * @returns {string} User-friendly error message
   */
  handle(error, context, metadata = {}) {
    console.error(`Error in ${context}:`, error, metadata);
    
    // Get user-friendly message
    const message = this.getUserMessage(error);
    
    // Emit error event if event bus is available
    if (this.eventBus) {
      this.eventBus.emit('error', {
        error,
        context,
        message,
        metadata,
        timestamp: new Date().toISOString()
      });
    }
    
    return message;
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error
   * @returns {string} User-friendly message
   */
  getUserMessage(error) {
    // Check for known error types
    if (error.name && this.errorMessages[error.name]) {
      return this.errorMessages[error.name];
    }
    
    // Check for custom error messages
    if (error.userMessage) {
      return error.userMessage;
    }
    
    // Check for network errors
    if (error.message && error.message.toLowerCase().includes('network')) {
      return this.errorMessages.NetworkError;
    }
    
    // Check for timeout errors
    if (error.message && error.message.toLowerCase().includes('timeout')) {
      return this.errorMessages.TimeoutError;
    }
    
    // Default message
    return this.errorMessages.UnknownError;
  }

  /**
   * Create a custom error with user message
   * @param {string} name - Error name
   * @param {string} message - Technical message
   * @param {string} userMessage - User-friendly message
   * @returns {Error} Custom error
   */
  createError(name, message, userMessage) {
    const error = new Error(message);
    error.name = name;
    error.userMessage = userMessage;
    return error;
  }

  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Error context
   * @returns {Function} Wrapped function
   */
  wrapAsync(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }

  /**
   * Wrap a promise with error handling
   * @param {Promise} promise - Promise to wrap
   * @param {string} context - Error context
   * @returns {Promise} Wrapped promise
   */
  wrapPromise(promise, context) {
    return promise.catch(error => {
      this.handle(error, context);
      throw error;
    });
  }
}
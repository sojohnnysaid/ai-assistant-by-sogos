/**
 * RecordingManager - Orchestrates all recording-related components
 */
export class RecordingManager {
  constructor(dependencies = {}) {
    // Core dependencies
    this.recorder = dependencies.recorder;
    this.service = dependencies.service;
    this.ui = dependencies.ui;
    this.transcription = dependencies.transcription;
    this.state = dependencies.state;
    this.eventBus = dependencies.eventBus;
    this.errorHandler = dependencies.errorHandler;
    
    // Internal state
    this.timerId = null;
    this.isInitialized = false;
    
    // Bind methods
    this.handleRecordClick = this.handleRecordClick.bind(this);
    this.handleTranscriptionClick = this.handleTranscriptionClick.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
  }

  /**
   * Initialize the recording manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Set initial state
      this.state.set('recording.isActive', false);
      this.state.set('recording.duration', 0);
      this.state.set('transcription.isActive', false);
      this.state.set('transcription.text', '');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Set up state subscriptions
      this.setupStateSubscriptions();
      
      // Load existing recordings
      await this.loadRecordings();
      
      this.isInitialized = true;
      this.eventBus.emit('app:initialized');
      
    } catch (error) {
      this.handleError(error, 'Failed to initialize');
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // UI events
    if (this.ui.elements.recordButton) {
      this.ui.elements.recordButton.addEventListener('click', this.handleRecordClick);
    }
    
    if (this.ui.elements.startTranscriptionBtn) {
      this.ui.elements.startTranscriptionBtn.addEventListener('click', this.handleTranscriptionClick);
    }
    
    // Delegate delete button clicks
    if (this.ui.elements.recordingsList) {
      this.ui.elements.recordingsList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
          const item = e.target.closest('[data-filename]');
          if (item) {
            this.handleDeleteClick(item.dataset.filename);
          }
        }
      });
    }
    
    // EventBus subscriptions
    this.eventBus.on('transcription:transcription', (data) => {
      this.ui.appendTranscription(data.text);
      this.state.update({
        'transcription.text': this.state.get('transcription.text') + data.text + ' '
      });
    });
    
    this.eventBus.on('transcription:status', (data) => {
      const isListening = data.type === 'ready' || data.type === 'speaking' || data.type === 'processing';
      const isSpeaking = data.type === 'speaking';
      this.ui.updateTranscriptionStatus(data.message, isListening, isSpeaking);
    });
    
    this.eventBus.on('transcription:error', (data) => {
      this.ui.showError(data.message);
    });
  }

  /**
   * Set up state subscriptions
   */
  setupStateSubscriptions() {
    // Recording state changes
    this.state.subscribe('recording.isActive', (isActive) => {
      this.ui.updateRecordButton(isActive ? 'recording' : 'idle');
      
      if (isActive) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });
    
    // Transcription state changes
    this.state.subscribe('transcription.isActive', (isActive) => {
      this.ui.updateTranscriptionButton(isActive ? 'active' : 'idle');
      
      if (!isActive) {
        this.ui.updateTranscriptionStatus('Transcription stopped', false);
      }
    });
  }

  /**
   * Handle record button click
   */
  async handleRecordClick() {
    const isRecording = this.state.get('recording.isActive');
    
    if (!isRecording) {
      await this.startRecording();
    } else {
      await this.stopRecording();
    }
  }

  /**
   * Start recording
   */
  async startRecording() {
    try {
      this.ui.updateRecordButton('recording');
      this.ui.updateRecordingStatus('Starting recording...', 'info');
      
      await this.recorder.start(this.state.get('audio.constraints'));
      
      this.state.set('recording.isActive', true);
      this.state.set('recording.startTime', Date.now());
      
      this.ui.updateRecordingStatus('Recording...', 'info');
      this.eventBus.emit('recording:started');
      
    } catch (error) {
      this.state.set('recording.isActive', false);
      this.handleError(error, 'Failed to start recording');
    }
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    try {
      this.ui.updateRecordButton('stopping');
      this.ui.updateRecordingStatus('Stopping recording...', 'info');
      
      const blob = await this.recorder.stop();
      
      this.state.set('recording.isActive', false);
      
      // Upload recording
      await this.uploadRecording(blob);
      
      this.eventBus.emit('recording:stopped');
      
    } catch (error) {
      this.handleError(error, 'Failed to stop recording');
    }
  }

  /**
   * Upload recording
   * @param {Blob} blob - Audio blob
   */
  async uploadRecording(blob) {
    try {
      this.ui.updateRecordingStatus('Uploading...', 'info');
      const spinner = this.ui.showLoading();
      
      const response = await this.service.upload(blob);
      
      this.ui.hideLoading(spinner);
      this.ui.updateRecordingStatus('Upload complete!', 'success');
      
      // Add to recordings list
      this.ui.addRecording({
        filename: response.filename,
        timestamp: new Date().toISOString(),
        duration: this.state.get('recording.duration') / 1000
      });
      
      this.ui.showSuccess('Recording saved successfully!');
      this.eventBus.emit('recording:uploaded', response);
      
      // Reset status after delay
      setTimeout(() => {
        this.ui.updateRecordingStatus('Ready to record', 'info');
      }, 2000);
      
    } catch (error) {
      this.handleError(error, 'Failed to upload recording');
    }
  }

  /**
   * Handle transcription button click
   */
  async handleTranscriptionClick() {
    const isActive = this.state.get('transcription.isActive');
    
    if (!isActive) {
      await this.startTranscription();
    } else {
      await this.stopTranscription();
    }
  }

  /**
   * Start transcription
   */
  async startTranscription() {
    try {
      this.ui.updateTranscriptionButton('loading');
      this.ui.clearTranscription();
      
      await this.transcription.start();
      
      this.state.set('transcription.isActive', true);
      this.state.set('transcription.text', '');
      
      this.ui.updateTranscriptionButton('active');
      this.eventBus.emit('transcription:started');
      
    } catch (error) {
      this.state.set('transcription.isActive', false);
      this.ui.updateTranscriptionButton('idle');
      this.handleError(error, 'Failed to start transcription');
    }
  }

  /**
   * Stop transcription
   */
  async stopTranscription() {
    try {
      await this.transcription.stop();
      
      this.state.set('transcription.isActive', false);
      this.ui.updateTranscriptionButton('idle');
      
      this.eventBus.emit('transcription:stopped');
      
    } catch (error) {
      this.handleError(error, 'Failed to stop transcription');
    }
  }

  /**
   * Handle delete button click
   * @param {string} filename - File to delete
   */
  async handleDeleteClick(filename) {
    if (!confirm('Are you sure you want to delete this recording?')) {
      return;
    }
    
    try {
      const spinner = this.ui.showLoading();
      
      await this.service.delete(filename);
      
      this.ui.hideLoading(spinner);
      this.ui.removeRecording(filename);
      this.ui.updateRecordingsCount();
      
      this.ui.showSuccess('Recording deleted successfully');
      this.eventBus.emit('recording:deleted', { filename });
      
    } catch (error) {
      this.handleError(error, 'Failed to delete recording');
    }
  }

  /**
   * Load existing recordings
   */
  async loadRecordings() {
    try {
      this.ui.initializeRecordingsList();
      
      const recordings = await this.service.fetchAll();
      
      recordings.forEach(recording => {
        this.ui.addRecording(recording);
      });
      
      this.ui.finishLoadingRecordings();
      
    } catch (error) {
      console.warn('Failed to load recordings:', error);
      this.ui.finishLoadingRecordings();
    }
  }

  /**
   * Start recording timer
   */
  startTimer() {
    const startTime = Date.now();
    
    this.timerId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.state.set('recording.duration', elapsed);
      this.ui.updateTimer(elapsed);
    }, 100);
  }

  /**
   * Stop recording timer
   */
  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // Reset timer display
    this.ui.updateTimer(0);
  }

  /**
   * Handle errors
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  handleError(error, context) {
    const message = this.errorHandler 
      ? this.errorHandler.handle(error, context)
      : error.message;
    
    this.ui.showError(message);
    this.ui.updateRecordingStatus('', 'info');
    this.eventBus.emit('app:error', { error, context, message });
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Stop any active recording
    if (this.state.get('recording.isActive')) {
      this.recorder.stop().catch(() => {});
    }
    
    // Stop any active transcription
    if (this.state.get('transcription.isActive')) {
      this.transcription.stop().catch(() => {});
    }
    
    // Stop timer
    this.stopTimer();
    
    // Remove event listeners
    if (this.ui.elements.recordButton) {
      this.ui.elements.recordButton.removeEventListener('click', this.handleRecordClick);
    }
    
    if (this.ui.elements.startTranscriptionBtn) {
      this.ui.elements.startTranscriptionBtn.removeEventListener('click', this.handleTranscriptionClick);
    }
    
    // Clear event bus
    this.eventBus.clear();
  }
}
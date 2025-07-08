/**
 * UIController - Centralizes all DOM manipulation
 */
export class UIController {
  constructor() {
    this.elements = {};
    this.templates = {};
    this.initializeElements();
    this.initializeTemplates();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.elements = {
      // Recording controls
      recordButton: document.getElementById('recordButton'),
      recordingTime: document.getElementById('recordingTime'),
      recordingStatus: document.getElementById('recordingStatus'),
      recordingsList: document.getElementById('recordingsList'),
      
      // Transcription elements
      startTranscriptionBtn: document.getElementById('startTranscriptionBtn'),
      transcriptionStatus: document.getElementById('transcriptionStatus'),
      transcriptionContainer: document.getElementById('transcriptionContainer'),
      transcriptionText: document.getElementById('transcriptionText'),
      
      // Loading and error states
      loadingSpinner: null, // Created dynamically when needed
      errorMessage: null // Created dynamically when needed
    };
  }

  /**
   * Initialize reusable templates
   */
  initializeTemplates() {
    this.templates = {
      recording: (data) => {
        const div = document.createElement('div');
        div.className = 'recording-item bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200';
        div.dataset.filename = data.filename;
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-2';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-medium text-gray-900';
        title.textContent = data.filename;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn text-red-500 hover:text-red-700 transition-colors duration-200';
        deleteBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
        deleteBtn.title = 'Delete recording';
        
        header.appendChild(title);
        header.appendChild(deleteBtn);
        
        const info = document.createElement('div');
        info.className = 'flex gap-4 text-sm text-gray-600';
        
        const date = document.createElement('span');
        date.textContent = new Date(data.timestamp).toLocaleString();
        
        const duration = document.createElement('span');
        if (data.duration) {
          duration.textContent = this.formatDuration(data.duration);
        }
        
        info.appendChild(date);
        if (data.duration) {
          info.appendChild(duration);
        }
        
        const audio = document.createElement('audio');
        audio.className = 'w-full mt-3';
        audio.controls = true;
        audio.src = `/recordings/${data.filename}`;
        
        div.appendChild(header);
        div.appendChild(info);
        div.appendChild(audio);
        
        return div;
      },
      
      loadingSpinner: () => {
        const spinner = document.createElement('div');
        spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        spinner.innerHTML = `
          <div class="bg-white p-6 rounded-lg shadow-xl">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p class="mt-4 text-gray-700">Processing...</p>
          </div>
        `;
        return spinner;
      },
      
      errorMessage: (message) => {
        const alert = document.createElement('div');
        alert.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 max-w-md animate-fade-in';
        alert.innerHTML = `
          <div class="flex items-start">
            <svg class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <p class="text-sm">${message}</p>
          </div>
        `;
        return alert;
      }
    };
  }

  /**
   * Update record button state
   * @param {string} state - 'idle', 'recording', 'stopping'
   */
  updateRecordButton(state) {
    const button = this.elements.recordButton;
    if (!button) return;
    
    const states = {
      idle: {
        text: 'Start Recording',
        className: 'bg-red-500 hover:bg-red-600 text-white',
        disabled: false
      },
      recording: {
        text: 'Stop Recording',
        className: 'bg-red-700 hover:bg-red-800 text-white animate-pulse',
        disabled: false
      },
      stopping: {
        text: 'Stopping...',
        className: 'bg-gray-500 text-white cursor-not-allowed',
        disabled: true
      }
    };
    
    const config = states[state] || states.idle;
    
    button.textContent = config.text;
    button.className = `px-6 py-3 rounded-lg font-medium transition-all duration-200 ${config.className}`;
    button.disabled = config.disabled;
  }

  /**
   * Update recording timer
   * @param {number} milliseconds - Elapsed time
   */
  updateTimer(milliseconds) {
    const element = this.elements.recordingTime;
    if (!element) return;
    
    element.textContent = this.formatTime(milliseconds);
  }

  /**
   * Update recording status
   * @param {string} status - Status message
   * @param {string} type - 'info', 'success', 'error'
   */
  updateRecordingStatus(status, type = 'info') {
    const element = this.elements.recordingStatus;
    if (!element) return;
    
    const typeClasses = {
      info: 'text-gray-600',
      success: 'text-green-600',
      error: 'text-red-600'
    };
    
    element.textContent = status;
    element.className = `text-sm mt-2 ${typeClasses[type] || typeClasses.info}`;
  }

  /**
   * Add recording to list
   * @param {Object} recording - Recording data
   */
  addRecording(recording) {
    const list = this.elements.recordingsList;
    if (!list) return;
    
    const element = this.templates.recording(recording);
    list.insertBefore(element, list.firstChild);
    
    // Animate in
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.3s ease-out';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  /**
   * Remove recording from list
   * @param {string} filename - Recording filename
   */
  removeRecording(filename) {
    const element = document.querySelector(`[data-filename="${filename}"]`);
    if (!element) return;
    
    // Animate out
    element.style.transition = 'all 0.3s ease-out';
    element.style.opacity = '0';
    element.style.transform = 'translateX(-100%)';
    
    setTimeout(() => element.remove(), 300);
  }

  /**
   * Update transcription button
   * @param {string} state - 'idle', 'active', 'loading'
   */
  updateTranscriptionButton(state) {
    const button = this.elements.startTranscriptionBtn;
    if (!button) return;
    
    const states = {
      idle: {
        text: 'Start Live Transcription',
        className: 'bg-blue-500 hover:bg-blue-600 text-white',
        disabled: false
      },
      active: {
        text: 'Stop Transcription',
        className: 'bg-red-500 hover:bg-red-600 text-white',
        disabled: false
      },
      loading: {
        text: 'Loading...',
        className: 'bg-gray-500 text-white cursor-not-allowed',
        disabled: true
      }
    };
    
    const config = states[state] || states.idle;
    
    button.textContent = config.text;
    button.className = `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${config.className}`;
    button.disabled = config.disabled;
  }

  /**
   * Update transcription status
   * @param {string} status - Status message
   * @param {boolean} isListening - Listening state
   */
  updateTranscriptionStatus(status, isListening = false) {
    const element = this.elements.transcriptionStatus;
    if (!element) return;
    
    element.textContent = status;
    
    if (isListening) {
      element.classList.add('animate-pulse');
    } else {
      element.classList.remove('animate-pulse');
    }
  }

  /**
   * Append transcription text
   * @param {string} text - Text to append
   */
  appendTranscription(text) {
    const element = this.elements.transcriptionText;
    if (!element || !text.trim()) return;
    
    element.textContent += text + ' ';
    
    // Scroll to bottom
    const container = this.elements.transcriptionContainer;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  /**
   * Clear transcription
   */
  clearTranscription() {
    const element = this.elements.transcriptionText;
    if (element) {
      element.textContent = '';
    }
  }

  /**
   * Show loading spinner
   * @returns {HTMLElement} Spinner element
   */
  showLoading() {
    const spinner = this.templates.loadingSpinner();
    document.body.appendChild(spinner);
    return spinner;
  }

  /**
   * Hide loading spinner
   * @param {HTMLElement} spinner - Spinner to hide
   */
  hideLoading(spinner) {
    if (spinner && spinner.parentNode) {
      spinner.remove();
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {number} duration - Display duration in ms
   */
  showError(message, duration = 5000) {
    const alert = this.templates.errorMessage(message);
    document.body.appendChild(alert);
    
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, duration);
  }

  /**
   * Format time from milliseconds
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted time
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format duration
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Enable/disable an element
   * @param {string} elementKey - Element key
   * @param {boolean} enabled - Enable state
   */
  setEnabled(elementKey, enabled) {
    const element = this.elements[elementKey];
    if (element) {
      element.disabled = !enabled;
      if (enabled) {
        element.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        element.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  /**
   * Show/hide an element
   * @param {string} elementKey - Element key
   * @param {boolean} visible - Visibility state
   */
  setVisible(elementKey, visible) {
    const element = this.elements[elementKey];
    if (element) {
      element.style.display = visible ? '' : 'none';
    }
  }
}
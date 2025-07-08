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
      recordIcon: document.getElementById('recordIcon'),
      recordingRing: document.getElementById('recordingRing'),
      recordingTime: document.getElementById('recordingTime'),
      recordingStatus: document.getElementById('recordingStatus'),
      recordingIndicator: document.getElementById('recordingIndicator'),
      
      // Recordings list
      recordingsList: document.getElementById('recordingsList'),
      recordingsCount: document.getElementById('recordingsCount'),
      recordingsLoading: document.getElementById('recordingsLoading'),
      recordingsEmpty: document.getElementById('recordingsEmpty'),
      
      // Transcription elements
      startTranscriptionBtn: document.getElementById('startTranscriptionBtn'),
      transcriptionIcon: document.getElementById('transcriptionIcon'),
      transcriptionBtnText: document.getElementById('transcriptionBtnText'),
      transcriptionStatus: document.getElementById('transcriptionStatus'),
      transcriptionStatusDot: document.getElementById('transcriptionStatusDot'),
      transcriptionContainer: document.getElementById('transcriptionContainer'),
      transcriptionEmpty: document.getElementById('transcriptionEmpty'),
      transcriptionTextWrapper: document.getElementById('transcriptionTextWrapper'),
      transcriptionText: document.getElementById('transcriptionText'),
      transcriptionCursor: document.getElementById('transcriptionCursor'),
      speakingIndicator: document.getElementById('speakingIndicator'),
      
      // Toast container
      toastContainer: document.getElementById('toastContainer')
    };
  }

  /**
   * Initialize reusable templates
   */
  initializeTemplates() {
    this.templates = {
      recording: (data) => {
        const div = document.createElement('div');
        div.className = 'recording-item bg-gray-800/50 p-5 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all duration-300 group';
        div.dataset.filename = data.filename;
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-3';
        
        const titleSection = document.createElement('div');
        titleSection.className = 'flex-1';
        
        const title = document.createElement('h3');
        title.className = 'text-base font-semibold text-gray-200 truncate pr-2';
        title.textContent = data.filename.replace(/^recording_/, '').replace(/\.webm$/, '');
        title.title = data.filename;
        
        const info = document.createElement('div');
        info.className = 'flex gap-3 text-xs text-gray-500 mt-1';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'flex items-center gap-1';
        dateSpan.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
        const dateText = document.createElement('span');
        dateText.textContent = new Date(data.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        dateSpan.appendChild(dateText);
        
        info.appendChild(dateSpan);
        
        if (data.duration) {
          const durationSpan = document.createElement('span');
          durationSpan.className = 'flex items-center gap-1';
          durationSpan.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 5.25v13.5m-7.5-13.5v13.5"></path>
          </svg>`;
          const durationText = document.createElement('span');
          durationText.textContent = this.formatDuration(data.duration);
          durationSpan.appendChild(durationText);
          info.appendChild(durationSpan);
        }
        
        titleSection.appendChild(title);
        titleSection.appendChild(info);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100';
        deleteBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>`;
        deleteBtn.title = 'Delete recording';
        deleteBtn.setAttribute('aria-label', 'Delete recording');
        
        header.appendChild(titleSection);
        header.appendChild(deleteBtn);
        
        const audio = document.createElement('audio');
        audio.className = 'w-full mt-3 h-10';
        audio.controls = true;
        audio.src = `/recording/${data.filename}`;
        audio.preload = 'metadata';
        
        div.appendChild(header);
        div.appendChild(audio);
        
        return div;
      },
      
      loadingSpinner: () => {
        const spinner = document.createElement('div');
        spinner.className = 'fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50';
        spinner.innerHTML = `
          <div class="bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p class="mt-4 text-gray-300">Processing...</p>
          </div>
        `;
        return spinner;
      },
      
      toast: (message, type = 'error') => {
        const toast = document.createElement('div');
        const bgColors = {
          error: 'bg-red-500',
          success: 'bg-green-500',
          info: 'bg-blue-500',
          warning: 'bg-yellow-500'
        };
        const icons = {
          error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
          success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
          info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
          warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>'
        };
        
        toast.className = `${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icons[type]}
          </svg>
          <p class="text-sm font-medium flex-1">${message}</p>
          <button class="text-white/80 hover:text-white transition-colors" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        `;
        return toast;
      }
    };
  }

  /**
   * Update record button state
   * @param {string} state - 'idle', 'recording', 'stopping'
   */
  updateRecordButton(state) {
    const button = this.elements.recordButton;
    const icon = this.elements.recordIcon;
    const ring = this.elements.recordingRing;
    const indicator = this.elements.recordingIndicator;
    
    if (!button) return;
    
    const states = {
      idle: {
        buttonClass: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
        iconPath: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
        disabled: false,
        showIndicator: false,
        animate: false
      },
      recording: {
        buttonClass: 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
        iconPath: 'M6 6h12v12H6z',
        disabled: false,
        showIndicator: true,
        animate: true
      },
      stopping: {
        buttonClass: 'bg-gradient-to-br from-gray-600 to-gray-700 cursor-not-allowed',
        iconPath: 'M6 6h12v12H6z',
        disabled: true,
        showIndicator: false,
        animate: false
      }
    };
    
    const config = states[state] || states.idle;
    
    // Update button
    button.className = `group relative w-32 h-32 md:w-40 md:h-40 rounded-full ${config.buttonClass} transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50`;
    button.disabled = config.disabled;
    
    // Update icon
    if (icon) {
      const path = icon.querySelector('path');
      if (path) {
        path.setAttribute('d', config.iconPath);
      }
    }
    
    // Update recording animation
    if (ring) {
      if (config.animate) {
        ring.classList.add('recording-pulse');
        ring.classList.remove('opacity-0');
      } else {
        ring.classList.remove('recording-pulse');
        ring.classList.add('opacity-0');
      }
    }
    
    // Update indicator
    if (indicator) {
      if (config.showIndicator) {
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
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
    const loadingEl = this.elements.recordingsLoading;
    const emptyEl = this.elements.recordingsEmpty;
    
    if (!list) return;
    
    // Hide loading and empty states
    if (loadingEl) loadingEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    
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
    
    this.updateRecordingsCount();
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
    const icon = this.elements.transcriptionIcon;
    const text = this.elements.transcriptionBtnText;
    
    if (!button) return;
    
    const states = {
      idle: {
        text: 'Start Listening',
        className: 'bg-blue-500 hover:bg-blue-600',
        iconPath: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
        disabled: false
      },
      active: {
        text: 'Stop Listening',
        className: 'bg-red-500 hover:bg-red-600',
        iconPath: 'M6 6h12v12H6z',
        disabled: false
      },
      loading: {
        text: 'Loading...',
        className: 'bg-gray-600 cursor-not-allowed',
        iconPath: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
        disabled: true
      }
    };
    
    const config = states[state] || states.idle;
    
    button.className = `px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${config.className} text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50`;
    button.disabled = config.disabled;
    
    if (text) text.textContent = config.text;
    
    if (icon) {
      if (state === 'loading') {
        icon.classList.add('animate-spin');
      } else {
        icon.classList.remove('animate-spin');
      }
      const paths = icon.querySelectorAll('path');
      paths.forEach(path => path.remove());
      const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      newPath.setAttribute('stroke-linecap', 'round');
      newPath.setAttribute('stroke-linejoin', 'round');
      newPath.setAttribute('stroke-width', '2');
      newPath.setAttribute('d', config.iconPath);
      icon.appendChild(newPath);
      
      if (state !== 'loading') {
        const circlePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        circlePath.setAttribute('stroke-linecap', 'round');
        circlePath.setAttribute('stroke-linejoin', 'round');
        circlePath.setAttribute('stroke-width', '2');
        circlePath.setAttribute('d', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
        icon.appendChild(circlePath);
      }
    }
  }

  /**
   * Update transcription status
   * @param {string} status - Status message
   * @param {boolean} isListening - Listening state
   * @param {boolean} isSpeaking - Speaking state
   */
  updateTranscriptionStatus(status, isListening = false, isSpeaking = false) {
    const statusEl = this.elements.transcriptionStatus;
    const dotEl = this.elements.transcriptionStatusDot;
    const speakingEl = this.elements.speakingIndicator;
    
    if (statusEl) {
      statusEl.textContent = status;
    }
    
    if (dotEl) {
      if (isSpeaking) {
        dotEl.classList.remove('bg-gray-600', 'bg-green-500');
        dotEl.classList.add('bg-blue-500', 'animate-pulse');
      } else if (isListening) {
        dotEl.classList.remove('bg-gray-600', 'bg-blue-500');
        dotEl.classList.add('bg-green-500', 'animate-pulse');
      } else {
        dotEl.classList.remove('bg-green-500', 'bg-blue-500', 'animate-pulse');
        dotEl.classList.add('bg-gray-600');
      }
    }
    
    if (speakingEl) {
      if (isSpeaking) {
        speakingEl.classList.remove('hidden');
      } else {
        speakingEl.classList.add('hidden');
      }
    }
  }

  /**
   * Append transcription text
   * @param {string} text - Text to append
   */
  appendTranscription(text) {
    const textEl = this.elements.transcriptionText;
    const emptyEl = this.elements.transcriptionEmpty;
    const wrapperEl = this.elements.transcriptionTextWrapper;
    const cursorEl = this.elements.transcriptionCursor;
    
    if (!textEl || !text.trim()) return;
    
    // Hide empty state and show text wrapper
    if (emptyEl) emptyEl.classList.add('hidden');
    if (wrapperEl) wrapperEl.classList.remove('hidden');
    if (cursorEl) cursorEl.classList.remove('hidden');
    
    // Append text
    textEl.textContent += text + ' ';
    
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
    const textEl = this.elements.transcriptionText;
    const emptyEl = this.elements.transcriptionEmpty;
    const wrapperEl = this.elements.transcriptionTextWrapper;
    const cursorEl = this.elements.transcriptionCursor;
    
    if (textEl) textEl.textContent = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (wrapperEl) wrapperEl.classList.add('hidden');
    if (cursorEl) cursorEl.classList.add('hidden');
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
    this.showToast(message, 'error', duration);
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   * @param {number} duration - Display duration in ms
   */
  showSuccess(message, duration = 3000) {
    this.showToast(message, 'success', duration);
  }
  
  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type
   * @param {number} duration - Display duration in ms
   */
  showToast(message, type = 'info', duration = 4000) {
    const container = this.elements.toastContainer;
    if (!container) return;
    
    const toast = this.templates.toast(message, type);
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full');
      toast.classList.add('translate-x-0');
    });
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('translate-x-0');
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
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
  
  /**
   * Update recordings count
   */
  updateRecordingsCount() {
    const countEl = this.elements.recordingsCount;
    const list = this.elements.recordingsList;
    const emptyEl = this.elements.recordingsEmpty;
    
    if (countEl && list) {
      const count = list.querySelectorAll('.recording-item').length;
      countEl.textContent = count > 0 ? `(${count})` : '';
      
      if (count === 0 && emptyEl) {
        emptyEl.classList.remove('hidden');
      }
    }
  }
  
  /**
   * Initialize recordings list
   */
  initializeRecordingsList() {
    const loadingEl = this.elements.recordingsLoading;
    const emptyEl = this.elements.recordingsEmpty;
    const list = this.elements.recordingsList;
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    
    // Clear existing recordings except loading/empty states
    if (list) {
      const recordings = list.querySelectorAll('.recording-item');
      recordings.forEach(el => el.remove());
    }
  }
  
  /**
   * Finish loading recordings
   */
  finishLoadingRecordings() {
    const loadingEl = this.elements.recordingsLoading;
    const emptyEl = this.elements.recordingsEmpty;
    const list = this.elements.recordingsList;
    
    if (loadingEl) loadingEl.classList.add('hidden');
    
    if (list) {
      const count = list.querySelectorAll('.recording-item').length;
      if (count === 0 && emptyEl) {
        emptyEl.classList.remove('hidden');
      }
    }
  }
}
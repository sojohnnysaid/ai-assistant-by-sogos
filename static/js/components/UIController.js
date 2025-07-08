/**
 * UIController - Centralizes all DOM manipulation for transcription
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
      clearTranscriptionBtn: document.getElementById('clearTranscriptionBtn'),
      
      // Toast container
      toastContainer: document.getElementById('toastContainer')
    };
  }

  /**
   * Initialize reusable templates
   */
  initializeTemplates() {
    this.templates = {
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
        // Blue pulsing dot when speaking
        dotEl.classList.remove('bg-gray-600', 'bg-green-500');
        dotEl.classList.add('bg-blue-500', 'animate-pulse');
      } else if (isListening) {
        // Green pulsing dot when listening
        dotEl.classList.remove('bg-gray-600', 'bg-blue-500');
        dotEl.classList.add('bg-green-500', 'animate-pulse');
      } else {
        // Gray static dot when idle
        dotEl.classList.remove('bg-green-500', 'bg-blue-500', 'animate-pulse');
        dotEl.classList.add('bg-gray-600');
      }
    }
    
    if (speakingEl) {
      if (isSpeaking) {
        // Show speaking indicator with animation
        speakingEl.classList.remove('hidden');
        speakingEl.classList.add('animate-fade-in');
      } else {
        // Hide speaking indicator
        speakingEl.classList.add('hidden');
        speakingEl.classList.remove('animate-fade-in');
      }
    }
    
    // Also update the transcription container border when speaking
    const container = this.elements.transcriptionContainer;
    if (container) {
      if (isSpeaking) {
        container.classList.add('border-blue-500', 'border-2');
        container.classList.remove('border-gray-700/50', 'border');
      } else {
        container.classList.remove('border-blue-500', 'border-2');
        container.classList.add('border-gray-700/50', 'border');
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
    const clearBtn = this.elements.clearTranscriptionBtn;
    
    if (!textEl || !text.trim()) return;
    
    // Hide empty state and show text wrapper
    if (emptyEl) emptyEl.classList.add('hidden');
    if (wrapperEl) wrapperEl.classList.remove('hidden');
    if (cursorEl) cursorEl.classList.remove('hidden');
    if (clearBtn) clearBtn.style.display = 'block';
    
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
    const clearBtn = this.elements.clearTranscriptionBtn;
    
    if (textEl) textEl.textContent = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (wrapperEl) wrapperEl.classList.add('hidden');
    if (cursorEl) cursorEl.classList.add('hidden');
    if (clearBtn) clearBtn.style.display = 'none';
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
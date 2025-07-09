/**
 * UIController - Centralizes all DOM manipulation for transcription
 */
export class UIController {
  constructor(eventBus) {
    this.eventBus = eventBus;
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
      transcriptionOnlyContainer: document.getElementById('transcriptionOnlyContainer'),
      transcriptionEmpty: document.getElementById('transcriptionEmpty'),
      transcriptionTextWrapper: document.getElementById('transcriptionTextWrapper'),
      transcriptionText: document.getElementById('transcriptionText'),
      transcriptionCursor: document.getElementById('transcriptionCursor'),
      speakingIndicator: document.getElementById('speakingIndicator'),
      clearTranscriptionBtn: document.getElementById('clearTranscriptionBtn'),
      
      // Chat elements
      chatContainer: document.getElementById('chatContainer'),
      chatEmpty: document.getElementById('chatEmpty'),
      chatMessages: document.getElementById('chatMessages'),
      clearChatBtn: document.getElementById('clearChatBtn'),
      chatModeToggle: document.getElementById('chatModeToggle'),
      aiThinkingIndicator: document.getElementById('aiThinkingIndicator'),
      audioPlayer: document.getElementById('audioPlayer'),
      
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
    
    button.className = `px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-200 flex items-center gap-1.5 ${config.className} text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50`;
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

  /**
   * Add a chat message
   * @param {string} text - Message text
   * @param {string} role - 'user' or 'assistant'
   */
  addChatMessage(text, role = 'user') {
    const messagesEl = this.elements.chatMessages;
    const emptyEl = this.elements.chatEmpty;
    const clearBtn = this.elements.clearChatBtn;
    
    if (!messagesEl) return;
    
    // Hide empty state and show messages
    if (emptyEl) emptyEl.classList.add('hidden');
    if (messagesEl) messagesEl.classList.remove('hidden');
    if (clearBtn) clearBtn.style.display = 'block';
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `max-w-[80%] rounded-lg px-4 py-3 ${
      role === 'user' 
        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30' 
        : 'bg-gray-700/50 text-gray-100 border border-gray-600/30'
    }`;
    
    const textEl = document.createElement('p');
    textEl.className = 'text-base leading-relaxed';
    textEl.textContent = text;
    
    bubble.appendChild(textEl);
    messageDiv.appendChild(bubble);
    messagesEl.appendChild(messageDiv);
    
    // Smooth scroll to bottom with a slight delay for animation
    const container = this.elements.chatContainer;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }

  /**
   * Show AI thinking indicator
   */
  showAIThinking() {
    const indicator = this.elements.aiThinkingIndicator;
    const messagesEl = this.elements.chatMessages;
    const emptyEl = this.elements.chatEmpty;
    
    if (emptyEl) emptyEl.classList.add('hidden');
    if (messagesEl) messagesEl.classList.remove('hidden');
    
    if (indicator) {
      indicator.classList.remove('hidden');
      messagesEl.appendChild(indicator);
      
      // Smooth scroll to bottom
      const container = this.elements.chatContainer;
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    }
  }

  /**
   * Hide AI thinking indicator
   */
  hideAIThinking() {
    const indicator = this.elements.aiThinkingIndicator;
    if (indicator) {
      indicator.classList.add('hidden');
    }
  }

  /**
   * Clear chat messages
   */
  clearChat() {
    const messagesEl = this.elements.chatMessages;
    const emptyEl = this.elements.chatEmpty;
    const clearBtn = this.elements.clearChatBtn;
    
    if (messagesEl) {
      messagesEl.innerHTML = '';
      messagesEl.classList.add('hidden');
    }
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  /**
   * Update UI for chat mode
   * @param {boolean} isChatMode - Whether chat mode is active
   */
  setChatMode(isChatMode) {
    const chatContainer = this.elements.chatContainer;
    const transcriptionOnly = this.elements.transcriptionOnlyContainer;
    
    if (isChatMode) {
      // Show chat interface
      if (chatContainer) chatContainer.style.display = '';
      if (transcriptionOnly) transcriptionOnly.style.display = 'none';
    } else {
      // Show transcription only
      if (chatContainer) chatContainer.style.display = 'none';
      if (transcriptionOnly) {
        transcriptionOnly.style.display = '';
        transcriptionOnly.classList.remove('hidden');
      }
    }
  }

  /**
   * Create WAV header for PCM data
   * @param {number} pcmLength - Length of PCM data in bytes
   * @param {number} sampleRate - Sample rate
   * @returns {ArrayBuffer} WAV header
   */
  createWavHeader(pcmLength, sampleRate = 16000) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF header
    const encoder = new TextEncoder();
    view.setUint8(0, encoder.encode('R')[0]);
    view.setUint8(1, encoder.encode('I')[0]);
    view.setUint8(2, encoder.encode('F')[0]);
    view.setUint8(3, encoder.encode('F')[0]);
    view.setUint32(4, 36 + pcmLength, true);
    view.setUint8(8, encoder.encode('W')[0]);
    view.setUint8(9, encoder.encode('A')[0]);
    view.setUint8(10, encoder.encode('V')[0]);
    view.setUint8(11, encoder.encode('E')[0]);
    
    // fmt chunk
    view.setUint8(12, encoder.encode('f')[0]);
    view.setUint8(13, encoder.encode('m')[0]);
    view.setUint8(14, encoder.encode('t')[0]);
    view.setUint8(15, encoder.encode(' ')[0]);
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, 1, true); // channels
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data chunk
    view.setUint8(36, encoder.encode('d')[0]);
    view.setUint8(37, encoder.encode('a')[0]);
    view.setUint8(38, encoder.encode('t')[0]);
    view.setUint8(39, encoder.encode('a')[0]);
    view.setUint32(40, pcmLength, true);
    
    return header;
  }

  /**
   * Play audio from base64
   * @param {string} audioBase64 - Base64 encoded audio
   * @param {string} format - Audio format (default: mp3)
   * @param {number} sampleRate - Sample rate for PCM (default: 16000)
   */
  async playAudio(audioBase64, format = 'mp3', sampleRate = 16000) {
    const player = this.elements.audioPlayer;
    if (!player) return;
    
    try {
      // Emit event when audio starts playing
      this.eventBus.emit('audio:playback:start');
      
      // Store reference to current audio player for pause/resume
      this.currentAudioPlayer = player;
      
      // Convert base64 to blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      let blob;
      if (format === 'pcm') {
        // For PCM, we need to add WAV header
        const wavHeader = this.createWavHeader(byteArray.length, sampleRate);
        const wavBuffer = new Uint8Array(wavHeader.byteLength + byteArray.length);
        wavBuffer.set(new Uint8Array(wavHeader), 0);
        wavBuffer.set(byteArray, wavHeader.byteLength);
        blob = new Blob([wavBuffer], { type: 'audio/wav' });
      } else {
        blob = new Blob([byteArray], { type: `audio/${format}` });
      }
      
      // Create blob URL and play
      const audioUrl = URL.createObjectURL(blob);
      player.src = audioUrl;
      
      // Clean up blob URL and emit event when done
      player.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudioPlayer = null;
        this.eventBus.emit('audio:playback:end');
      }, { once: true });
      
      // Also handle pause events
      player.addEventListener('pause', () => {
        if (!player.ended) {
          this.eventBus.emit('audio:playback:paused');
        }
      }, { once: true });
      
      // Play audio
      await player.play();
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.eventBus.emit('audio:playback:end'); // Ensure we emit end even on error
      throw error;
    }
  }

  /**
   * Check if chat mode is enabled
   * @returns {boolean}
   */
  isChatMode() {
    const toggle = this.elements.chatModeToggle;
    return toggle ? toggle.checked : false;
  }
  
  /**
   * Pause current audio playback
   */
  pauseAudio() {
    if (this.currentAudioPlayer && !this.currentAudioPlayer.paused) {
      console.log('[UIController] Pausing audio playback');
      this.currentAudioPlayer.pause();
      this.audioWasPaused = true;
    }
  }
  
  /**
   * Resume audio playback if it was paused
   */
  resumeAudio() {
    if (this.currentAudioPlayer && this.currentAudioPlayer.paused && this.audioWasPaused) {
      console.log('[UIController] Resuming audio playback');
      this.currentAudioPlayer.play().catch(err => {
        console.warn('[UIController] Could not resume audio:', err);
      });
      this.audioWasPaused = false;
    }
  }
  
  /**
   * Check if audio is currently playing
   * @returns {boolean}
   */
  isAudioPlaying() {
    return this.currentAudioPlayer && !this.currentAudioPlayer.paused && !this.currentAudioPlayer.ended;
  }
}
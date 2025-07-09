/**
 * UI Adapter for new design
 * Maps existing functionality to new UI elements
 */

class UIAdapter {
    constructor() {
        this.isAIMode = true; // Default to AI chat mode
        this.initializeElements();
        // Delay setup to ensure main app is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCompatibility());
        } else {
            setTimeout(() => this.setupCompatibility(), 100);
        }
    }

    initializeElements() {
        // Map new elements to expected IDs
        this.elements = {
            transcriptionBtn: document.getElementById('startTranscriptionBtn'),
            transcriptionContent: document.getElementById('transcriptionContent'),
            audioVisualization: document.getElementById('audioVisualization'),
            audioPlayer: document.getElementById('audioPlayer'),
            
            // Status elements
            sttLatency: document.getElementById('sttLatency'),
            eotLatency: document.getElementById('eotLatency'),
            llmLatency: document.getElementById('llmLatency'),
            ttsLatency: document.getElementById('ttsLatency'),
            overallLatency: document.getElementById('overallLatency')
        };
    }

    setupCompatibility() {
        // Create compatibility elements that existing code expects
        this.createCompatibilityElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Override UIController methods after a delay to ensure it exists
        setTimeout(() => this.overrideUIControllerMethods(), 200);
    }

    createCompatibilityElements() {
        // Create hidden elements that existing code might look for
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.display = 'none';
        hiddenContainer.innerHTML = `
            <div id="chatContainer"></div>
            <div id="chatMessages"></div>
            <div id="chatEmpty"></div>
            <div id="transcriptionStatus"></div>
            <div id="transcriptionStatusDot"></div>
            <div id="transcriptionBtnText"></div>
            <div id="transcriptionIcon"></div>
            <div id="speakingIndicator"></div>
            <div id="aiThinkingIndicator"></div>
            <div id="clearChatBtn"></div>
            <div id="chatModeToggle"></div>
            <div id="transcriptionOnlyContainer"></div>
            <div id="transcriptionText"></div>
            <div id="transcriptionCursor"></div>
        `;
        document.body.appendChild(hiddenContainer);
    }

    setupEventListeners() {
        // Update button text based on state
        const btn = this.elements.transcriptionBtn;
        if (!btn) return;
        
        // Store original function if it exists
        if (window.updateTranscriptionButton) {
            this._originalUpdateButton = window.updateTranscriptionButton;
        }
        
        // Create global update function that UI can use
        window.updateTranscriptionButton = (isActive) => {
            if (btn) {
                if (isActive === 'loading') {
                    btn.textContent = 'LOADING...';
                    btn.disabled = true;
                } else if (isActive === true || isActive === 'active') {
                    btn.textContent = 'STOP LISTENING';
                    btn.classList.add('active');
                    btn.disabled = false;
                    if (this.elements.audioVisualization) {
                        this.elements.audioVisualization.classList.add('active');
                    }
                } else {
                    btn.textContent = 'START LISTENING';
                    btn.classList.remove('active');
                    btn.disabled = false;
                    if (this.elements.audioVisualization) {
                        this.elements.audioVisualization.classList.remove('active');
                    }
                }
            }
            
            // Call original if it exists
            if (this._originalUpdateButton) {
                this._originalUpdateButton(isActive);
            }
        };
        
        // Listen for transcription state changes after a delay
        setTimeout(() => {
            if (window.app && window.app.eventBus) {
                window.app.eventBus.on('transcription:started', () => {
                    console.log('[UIAdapter] Transcription started event');
                    window.updateTranscriptionButton(true);
                });
                
                window.app.eventBus.on('transcription:stopped', () => {
                    console.log('[UIAdapter] Transcription stopped event');
                    window.updateTranscriptionButton(false);
                });
            }
        }, 500);
    }

    overrideUIControllerMethods() {
        // Wait for UIController to be available
        const checkAndOverride = () => {
            const uiController = window.UIController || window.uiController || 
                                (window.app && window.app.ui) || 
                                document.querySelector('[data-ui-controller]');
            
            if (!uiController) {
                console.log('[UIAdapter] UIController not found yet, will use global functions');
                this.setupGlobalFunctions();
                return;
            }

            console.log('[UIAdapter] Found UIController, overriding methods');
            const ui = uiController;
            const adapter = this;

            // Store original methods
            const originals = {
                updateTranscriptionButton: ui.updateTranscriptionButton?.bind(ui),
                addChatMessage: ui.addChatMessage?.bind(ui),
                showAIThinking: ui.showAIThinking?.bind(ui),
                hideAIThinking: ui.hideAIThinking?.bind(ui),
                clearChat: ui.clearChat?.bind(ui),
                clearTranscription: ui.clearTranscription?.bind(ui),
                appendTranscription: ui.appendTranscription?.bind(ui),
                updateTranscriptionStatus: ui.updateTranscriptionStatus?.bind(ui),
                setChatMode: ui.setChatMode?.bind(ui),
                showError: ui.showError?.bind(ui),
                playAudio: ui.playAudio?.bind(ui)
            };

            // Override methods
            ui.updateTranscriptionButton = function(isActive) {
                console.log('[UIAdapter] updateTranscriptionButton:', isActive);
                if (originals.updateTranscriptionButton) {
                    originals.updateTranscriptionButton(isActive);
                }
                window.updateTranscriptionButton(isActive);
            };

            ui.addChatMessage = function(role, content) {
                console.log('[UIAdapter] addChatMessage:', role, content);
                if (originals.addChatMessage) {
                    originals.addChatMessage(role, content);
                }
                adapter.addMessage(role, content);
            };

            ui.showAIThinking = function() {
                console.log('[UIAdapter] showAIThinking');
                if (originals.showAIThinking) {
                    originals.showAIThinking();
                }
                adapter.showThinking();
            };

            ui.hideAIThinking = function() {
                console.log('[UIAdapter] hideAIThinking');
                if (originals.hideAIThinking) {
                    originals.hideAIThinking();
                }
                adapter.hideThinking();
            };

            ui.clearChat = function() {
                console.log('[UIAdapter] clearChat');
                if (originals.clearChat) {
                    originals.clearChat();
                }
                adapter.clearTranscription();
            };

            ui.clearTranscription = function() {
                console.log('[UIAdapter] clearTranscription');
                if (originals.clearTranscription) {
                    originals.clearTranscription();
                }
                adapter.clearTranscription();
            };

            ui.appendTranscription = function(text) {
                console.log('[UIAdapter] appendTranscription:', text);
                if (originals.appendTranscription) {
                    originals.appendTranscription(text);
                }
                // For now, add as user message
                adapter.addMessage('user', text);
            };

            ui.updateTranscriptionStatus = function(status, isError = false) {
                console.log('[UIAdapter] updateTranscriptionStatus:', status, isError);
                if (originals.updateTranscriptionStatus) {
                    originals.updateTranscriptionStatus(status, isError);
                }
                // Update audio visualization based on status
                if (status.includes('Speaking') && adapter.elements.audioVisualization) {
                    adapter.elements.audioVisualization.classList.add('active');
                } else if (adapter.elements.audioVisualization) {
                    adapter.elements.audioVisualization.classList.remove('active');
                }
            };

            ui.setChatMode = function(enabled) {
                console.log('[UIAdapter] setChatMode:', enabled);
                // Always use AI chat mode in new UI
                adapter.isAIMode = true;
                if (originals.setChatMode) {
                    originals.setChatMode(true);
                }
            };

            ui.showError = function(message) {
                console.log('[UIAdapter] Error:', message);
                if (originals.showError) {
                    originals.showError(message);
                }
            };

            ui.playAudio = function(audioData, format) {
                console.log('[UIAdapter] playAudio - format:', format);
                if (originals.playAudio) {
                    originals.playAudio(audioData, format);
                }
            };
        };

        checkAndOverride();
    }

    setupGlobalFunctions() {
        // Set up global functions that the app might call
        const adapter = this;
        
        window.addChatMessage = (role, content) => {
            adapter.addMessage(role, content);
        };
        
        window.showAIThinking = () => {
            adapter.showThinking();
        };
        
        window.hideAIThinking = () => {
            adapter.hideThinking();
        };
        
        window.clearChat = () => {
            adapter.clearTranscription();
        };
    }

    // Add message to transcription area
    addMessage(role, content) {
        if (!this.elements.transcriptionContent) return;
        
        // Remove initial placeholder if it exists
        const placeholder = this.elements.transcriptionContent.querySelector('.message-entry[style*="italic"]');
        if (placeholder) {
            placeholder.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-entry';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = role === 'user' ? 'user-label' : 'agent-label';
        labelSpan.textContent = role === 'user' ? 'YOU:' : 'AGENT:';
        
        const contentSpan = document.createElement('span');
        contentSpan.textContent = content;
        
        messageDiv.appendChild(labelSpan);
        messageDiv.appendChild(contentSpan);
        
        this.elements.transcriptionContent.appendChild(messageDiv);
        
        // Auto-scroll to bottom
        this.elements.transcriptionContent.scrollTop = this.elements.transcriptionContent.scrollHeight;
    }

    // Show thinking indicator
    showThinking() {
        if (!this.elements.transcriptionContent) return;
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message-entry';
        thinkingDiv.id = 'thinking-indicator';
        thinkingDiv.innerHTML = '<span class="thinking-indicator">AGENT IS THINKING</span>';
        this.elements.transcriptionContent.appendChild(thinkingDiv);
        
        // Auto-scroll
        this.elements.transcriptionContent.scrollTop = this.elements.transcriptionContent.scrollHeight;
    }

    // Hide thinking indicator
    hideThinking() {
        const thinkingDiv = document.getElementById('thinking-indicator');
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
    }

    // Update latency stats
    updateLatency(type, value) {
        const element = this.elements[`${type}Latency`];
        if (element) {
            element.textContent = `${value}MS`;
            element.classList.add('text-glow-subtle');
            setTimeout(() => {
                element.classList.remove('text-glow-subtle');
            }, 500);
        }
    }

    // Clear transcription
    clearTranscription() {
        if (this.elements.transcriptionContent) {
            this.elements.transcriptionContent.innerHTML = `
                <div class="message-entry" style="color: var(--text-tertiary); font-style: italic;">
                    Click "Start Listening" to begin conversation...
                </div>
            `;
        }
    }
}

// Initialize adapter when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.uiAdapter = new UIAdapter();
    });
} else {
    window.uiAdapter = new UIAdapter();
}
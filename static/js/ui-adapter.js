/**
 * UI Adapter for new design
 * Maps existing functionality to new UI elements
 */

export class UIAdapter {
    constructor() {
        this.initializeElements();
        this.setupCompatibility();
        this.isAIMode = true; // Default to AI chat mode
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
        
        // Override UIController methods
        this.overrideUIControllerMethods();
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
            <div id="chatModeToggle"><input type="checkbox" checked></div>
            <div id="transcriptionOnlyContainer"></div>
            <div id="transcriptionText"></div>
            <div id="transcriptionCursor"></div>
        `;
        document.body.appendChild(hiddenContainer);
    }

    setupEventListeners() {
        // Nothing needed here, we'll override methods in overrideUIControllerMethods
    }
    
    overrideUIControllerMethods() {
        // Wait for UIController to be loaded
        const checkAndOverride = () => {
            // Look for the UIController in the global scope via the app instance
            if (window.app && window.app.instance && window.app.instance.ui) {
                const ui = window.app.instance.ui;
                
                // Override updateTranscriptionButton
                const originalUpdateButton = ui.updateTranscriptionButton.bind(ui);
                ui.updateTranscriptionButton = (state) => {
                    // Call original to maintain compatibility
                    originalUpdateButton(state);
                    
                    // Update our new UI
                    const btn = window.uiAdapter.elements.transcriptionBtn;
                    const audioViz = window.uiAdapter.elements.audioVisualization;
                    
                    if (state === 'active') {
                        btn.textContent = 'STOP LISTENING';
                        btn.classList.add('active');
                        audioViz.classList.add('active');
                    } else if (state === 'idle') {
                        btn.textContent = 'START LISTENING';
                        btn.classList.remove('active');
                        audioViz.classList.remove('active');
                        btn.disabled = false;
                    } else if (state === 'loading') {
                        btn.textContent = 'LOADING...';
                        btn.disabled = true;
                    }
                };
                
                // Override addChatMessage
                const originalAddChatMessage = ui.addChatMessage.bind(ui);
                ui.addChatMessage = (text, role) => {
                    console.log('[UIAdapter] addChatMessage called:', role, text);
                    // Call original for compatibility
                    originalAddChatMessage(text, role);
                    
                    // Add to our new UI
                    window.uiAdapter.addMessage(role, text);
                };
                
                // Override showAIThinking
                const originalShowAIThinking = ui.showAIThinking.bind(ui);
                ui.showAIThinking = () => {
                    originalShowAIThinking();
                    window.uiAdapter.showThinking();
                };
                
                // Override hideAIThinking
                const originalHideAIThinking = ui.hideAIThinking.bind(ui);
                ui.hideAIThinking = () => {
                    originalHideAIThinking();
                    window.uiAdapter.hideThinking();
                };
                
                // Override clearChat
                const originalClearChat = ui.clearChat.bind(ui);
                ui.clearChat = () => {
                    originalClearChat();
                    window.uiAdapter.clearTranscription();
                };
                
                // Override appendTranscription
                const originalAppendTranscription = ui.appendTranscription.bind(ui);
                ui.appendTranscription = (text) => {
                    console.log('[UIAdapter] appendTranscription called:', text);
                    originalAppendTranscription(text);
                    // For transcription-only mode, add as a user message
                    if (!window.uiAdapter.isAIMode) {
                        window.uiAdapter.addMessage('user', text);
                    }
                };
                
                // Override clearTranscription
                const originalClearTranscription = ui.clearTranscription.bind(ui);
                ui.clearTranscription = () => {
                    originalClearTranscription();
                    window.uiAdapter.clearTranscription();
                };
                
                // Override updateTranscriptionStatus
                const originalUpdateStatus = ui.updateTranscriptionStatus.bind(ui);
                ui.updateTranscriptionStatus = (status, isListening, isSpeaking) => {
                    originalUpdateStatus(status, isListening, isSpeaking);
                    
                    // Update audio visualization based on speaking state
                    if (isSpeaking && isListening) {
                        window.uiAdapter.elements.audioVisualization.classList.add('active');
                    } else if (!isListening) {
                        window.uiAdapter.elements.audioVisualization.classList.remove('active');
                    }
                };
                
                // Override setChatMode to always be in AI mode
                const originalSetChatMode = ui.setChatMode.bind(ui);
                ui.setChatMode = (isChatMode) => {
                    // Always call with true to ensure AI mode
                    originalSetChatMode(true);
                    window.uiAdapter.isAIMode = true;
                };
                
                // Override showError to display in console as well
                const originalShowError = ui.showError.bind(ui);
                ui.showError = (message, duration) => {
                    console.error('[UIAdapter] Error:', message);
                    originalShowError(message, duration);
                };
                
                // Override playAudio to ensure audio element is properly connected
                const originalPlayAudio = ui.playAudio.bind(ui);
                ui.playAudio = async (audioBase64, format, sampleRate) => {
                    console.log('[UIAdapter] Playing audio...');
                    try {
                        await originalPlayAudio(audioBase64, format, sampleRate);
                    } catch (error) {
                        console.error('[UIAdapter] Audio playback error:', error);
                        throw error;
                    }
                };
                
                // Force AI mode
                ui.setChatMode(true);
                
                // Add debug listeners to event bus
                const eventBus = window.app.eventBus;
                eventBus.on('transcription:transcription', (data) => {
                    console.log('[UIAdapter] Transcription received via event bus:', data);
                });
                
                eventBus.on('transcription:started', () => {
                    console.log('[UIAdapter] Transcription started');
                });
                
                eventBus.on('transcription:stopped', () => {
                    console.log('[UIAdapter] Transcription stopped');
                });
                
                eventBus.on('transcription:error', (data) => {
                    console.error('[UIAdapter] Transcription error:', data);
                });
                
                console.log('[UIAdapter] Successfully overrode UIController methods');
                console.log('[UIAdapter] Chat mode set to AI');
                
                // Log current state
                console.log('[UIAdapter] Current app state:', window.app.instance.state.get());
            } else {
                // Retry after a short delay
                setTimeout(checkAndOverride, 100);
            }
        };
        
        // Start checking
        checkAndOverride();
    }

    // Add message to transcription area
    addMessage(role, content) {
        // Clear initial message if it exists
        const initialMessage = this.elements.transcriptionContent.querySelector('.message-entry[style*="italic"]');
        if (initialMessage) {
            initialMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-entry';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = role === 'user' ? 'user-label' : 'agent-label';
        labelSpan.textContent = role === 'user' ? 'YOU:' : 'AGENT:';
        
        const contentSpan = document.createElement('span');
        contentSpan.textContent = ' ' + content;
        
        messageDiv.appendChild(labelSpan);
        messageDiv.appendChild(contentSpan);
        
        this.elements.transcriptionContent.appendChild(messageDiv);
        
        // Auto-scroll to bottom
        this.elements.transcriptionContent.scrollTop = this.elements.transcriptionContent.scrollHeight;
    }

    // Show thinking indicator
    showThinking() {
        // Clear initial message if it exists
        const initialMessage = this.elements.transcriptionContent.querySelector('.message-entry[style*="italic"]');
        if (initialMessage) {
            initialMessage.remove();
        }
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message-entry';
        thinkingDiv.id = 'thinking-indicator';
        thinkingDiv.innerHTML = '<span class="thinking-indicator">AGENT IS THINKING</span>';
        this.elements.transcriptionContent.appendChild(thinkingDiv);
        
        // Auto-scroll to bottom
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
        this.elements.transcriptionContent.innerHTML = '';
    }
}

// Initialize adapter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.uiAdapter = new UIAdapter();
});
/**
 * UI Adapter for new design
 * Maps existing functionality to new UI elements
 */

export class UIAdapter {
    constructor() {
        this.initializeElements();
        this.setupCompatibility();
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
        const originalUpdateButton = window.updateTranscriptionButton;
        
        if (originalUpdateButton) {
            window.updateTranscriptionButton = (isActive) => {
                if (isActive) {
                    btn.textContent = 'STOP LISTENING';
                    btn.classList.add('active');
                    this.elements.audioVisualization.classList.add('active');
                } else {
                    btn.textContent = 'START LISTENING';
                    btn.classList.remove('active');
                    this.elements.audioVisualization.classList.remove('active');
                }
            };
        }
    }

    // Add message to transcription area
    addMessage(role, content) {
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
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message-entry';
        thinkingDiv.id = 'thinking-indicator';
        thinkingDiv.innerHTML = '<span class="thinking-indicator">AGENT IS THINKING</span>';
        this.elements.transcriptionContent.appendChild(thinkingDiv);
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
        this.elements.transcriptionContent.innerHTML = `
            <div class="message-entry" style="color: var(--text-tertiary); font-style: italic;">
                Click "Start Listening" to begin conversation...
            </div>
        `;
    }
}

// Initialize adapter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.uiAdapter = new UIAdapter();
});
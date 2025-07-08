// Simplified transcription with microphone and VAD
class MicrophoneTranscription {
    constructor() {
        this.worker = null;
        this.vad = null;
        this.isActive = false;
        
        // UI elements
        this.container = document.getElementById('transcriptionContainer');
        this.textElement = document.getElementById('transcriptionText');
        this.statusElement = document.getElementById('status');
        this.vadStatus = document.getElementById('vadStatus');
        this.vadIndicator = this.vadStatus?.querySelector('.rounded-full');
        this.vadText = document.getElementById('vadText');
        
        // Check if UI elements exist
        if (!this.container) {
            console.warn('Transcription container not found');
        }
        
        this.initWorker();
    }
    
    initWorker() {
        this.worker = new Worker('/static/whisper-webworker.js', { type: 'module' });
        
        this.worker.addEventListener('message', (event) => {
            const { status, text, progress, error } = event.data;
            
            switch (status) {
                case 'loading':
                    this.updateStatus(`Loading model... ${progress || 0}%`);
                    break;
                    
                case 'ready':
                    this.updateStatus('Ready');
                    break;
                    
                case 'transcription':
                    this.appendTranscription(text);
                    break;
                    
                case 'error':
                    console.error('Worker error:', error);
                    this.updateStatus('Error: ' + error);
                    break;
            }
        });
        
        // Start loading the model
        this.worker.postMessage({ type: 'load' });
    }
    
    async start() {
        if (this.isActive) return;
        
        try {
            // Initialize VAD if not already done
            if (!this.vad) {
                this.vad = await vad.MicVAD.new({
                    onSpeechStart: () => {
                        this.onSpeechStart();
                    },
                    onSpeechEnd: (audio) => {
                        this.onSpeechEnd(audio);
                    },
                    // Default VAD settings
                    positiveSpeechThreshold: 0.5,
                    negativeSpeechThreshold: 0.35,
                    minSpeechFrames: 3,
                    preSpeechPadFrames: 10,
                    redemptionFrames: 8,
                });
            }
            
            // Start VAD
            await this.vad.start();
            this.isActive = true;
            
            // Show UI
            this.container?.classList.remove('hidden');
            this.textElement.textContent = '';
            this.updateStatus('Listening...');
            
        } catch (error) {
            console.error('Failed to start:', error);
            this.updateStatus('Failed to start: ' + error.message);
        }
    }
    
    async stop() {
        if (!this.isActive) return;
        
        if (this.vad) {
            this.vad.pause();
        }
        
        this.isActive = false;
        this.updateStatus('Stopped');
        this.updateVADStatus(false);
    }
    
    onSpeechStart() {
        this.updateVADStatus(true);
    }
    
    onSpeechEnd(audio) {
        this.updateVADStatus(false);
        
        // Send audio to worker for transcription
        if (audio && audio.length > 0) {
            // Create a copy since we're transferring ownership
            const audioBuffer = new Float32Array(audio);
            this.worker.postMessage(
                { type: 'transcribe', audio: audioBuffer },
                [audioBuffer.buffer]
            );
        }
    }
    
    appendTranscription(text) {
        if (!text || text.trim() === '') return;
        
        // Add space if there's existing text
        if (this.textElement.textContent) {
            this.textElement.textContent += ' ';
        }
        this.textElement.textContent += text.trim();
        
        // Auto-scroll
        const display = document.getElementById('transcriptionDisplay');
        if (display) {
            display.scrollTop = display.scrollHeight;
        }
    }
    
    updateStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
        }
    }
    
    updateVADStatus(isSpeaking) {
        if (this.vadIndicator) {
            if (isSpeaking) {
                this.vadIndicator.classList.remove('bg-gray-500');
                this.vadIndicator.classList.add('bg-green-500');
            } else {
                this.vadIndicator.classList.remove('bg-green-500');
                this.vadIndicator.classList.add('bg-gray-500');
            }
        }
        
        if (this.vadText) {
            this.vadText.textContent = isSpeaking ? 'Speaking...' : 'Listening...';
        }
    }
    
    getTranscriptionText() {
        return this.textElement?.textContent || '';
    }
    
    clearTranscription() {
        if (this.textElement) {
            this.textElement.textContent = '';
        }
    }
}

// Export globally
window.MicrophoneTranscription = MicrophoneTranscription;
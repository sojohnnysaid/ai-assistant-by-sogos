// Simple Whisper Web Worker for transcription
// Uses @xenova/transformers which works better in web workers

let pipeline = null;
let env = null;
let AutomaticSpeechRecognitionPipeline = null;

// Status tracking
let isInitialized = false;
let isLoading = false;

// Initialize by loading the library
async function initialize() {
    if (isInitialized || isLoading) return;
    
    isLoading = true;
    
    try {
        // Import the library
        const module = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
        
        // Extract what we need
        pipeline = module.pipeline;
        env = module.env;
        AutomaticSpeechRecognitionPipeline = module.AutomaticSpeechRecognitionPipeline;
        
        // Configure environment
        env.allowLocalModels = false;
        env.remoteURL = 'https://huggingface.co/';
        
        isInitialized = true;
        isLoading = false;
        
        self.postMessage({
            type: 'status',
            status: 'initialized',
            message: 'Library loaded successfully'
        });
        
    } catch (error) {
        isLoading = false;
        console.error('Failed to initialize:', error);
        self.postMessage({
            type: 'error',
            error: error.message || 'Failed to initialize'
        });
    }
}

// Singleton for the transcription pipeline
class WhisperSingleton {
    static model = 'Xenova/whisper-tiny.en';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (!isInitialized) {
            await initialize();
        }
        
        if (this.instance === null) {
            this.instance = await pipeline('automatic-speech-recognition', this.model, {
                quantized: true,
                progress_callback,
            });
        }
        
        return this.instance;
    }
}

// Handle messages
self.addEventListener('message', async (event) => {
    const { id, type, data } = event.data;
    
    switch (type) {
        case 'init':
            try {
                // Initialize and load model
                self.postMessage({
                    type: 'status',
                    status: 'loading',
                    message: 'Loading Whisper model...'
                });
                
                const transcriber = await WhisperSingleton.getInstance((progress) => {
                    self.postMessage({
                        type: 'progress',
                        progress: Math.round(progress.progress * 100),
                        message: `Loading: ${Math.round(progress.progress * 100)}%`
                    });
                });
                
                self.postMessage({
                    id,
                    type: 'ready',
                    status: 'ready',
                    message: 'Model loaded and ready'
                });
                
            } catch (error) {
                self.postMessage({
                    id,
                    type: 'error',
                    status: 'error',
                    error: error.message || 'Failed to load model'
                });
            }
            break;
            
        case 'transcribe':
            try {
                const transcriber = await WhisperSingleton.getInstance();
                
                // Get audio data
                const audioData = data.audio;
                if (!audioData || audioData.length === 0) {
                    throw new Error('No audio data provided');
                }
                
                // Transcribe
                const output = await transcriber(audioData, {
                    // Use sensible defaults
                    return_timestamps: false,
                    chunk_length_s: 30,
                    stride_length_s: 5,
                });
                
                self.postMessage({
                    id,
                    type: 'result',
                    status: 'success',
                    result: {
                        text: output.text || '',
                        timestamp: Date.now()
                    }
                });
                
            } catch (error) {
                console.error('Transcription error:', error);
                self.postMessage({
                    id,
                    type: 'error',
                    status: 'error',
                    error: error.message || 'Transcription failed'
                });
            }
            break;
            
        default:
            self.postMessage({
                id,
                type: 'error',
                error: `Unknown message type: ${type}`
            });
    }
});

// Notify that worker is ready
self.postMessage({
    type: 'init',
    status: 'ready',
    message: 'Worker ready'
});
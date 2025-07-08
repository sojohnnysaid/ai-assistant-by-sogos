// Whisper Web Worker using @huggingface/transformers
// This worker handles the Whisper model for speech-to-text transcription

// Import using importScripts for web worker compatibility
importScripts('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');

// Configuration
const MODEL_NAME = 'Xenova/whisper-tiny.en';
let transcriptionPipeline = null;
let isModelLoading = false;
let isModelLoaded = false;

// Send init message when worker loads
self.postMessage({
    type: 'init',
    message: 'Worker initialized'
});

// Initialize the transcription pipeline
async function initializePipeline() {
    if (isModelLoaded || isModelLoading) return;
    
    isModelLoading = true;
    
    try {
        // Send loading status
        self.postMessage({
            type: 'status',
            status: 'loading',
            message: 'Loading Whisper model...'
        });
        
        // Create the pipeline
        transcriptionPipeline = await self.transformers.pipeline(
            'automatic-speech-recognition',
            MODEL_NAME,
            {
                dtype: {
                    encoder_model: 'fp16',
                    decoder_model_merged: 'q8'
                },
                device: 'webgpu',
                progress_callback: (progress) => {
                    if (progress.status === 'progress') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        self.postMessage({
                            type: 'progress',
                            progress: percent,
                            message: `Loading model: ${percent}%`
                        });
                    }
                }
            }
        );
        
        isModelLoaded = true;
        isModelLoading = false;
        
        // Send ready status
        self.postMessage({
            type: 'ready',
            status: 'ready',
            message: 'Model loaded successfully'
        });
        
    } catch (error) {
        isModelLoading = false;
        console.error('Failed to load model:', error);
        self.postMessage({
            type: 'error',
            status: 'error',
            error: error.message || 'Failed to load transcription model'
        });
    }
}

// Process audio for transcription
async function transcribeAudio(audioData, options = {}) {
    if (!isModelLoaded) {
        await initializePipeline();
    }
    
    if (!transcriptionPipeline) {
        throw new Error('Transcription pipeline not initialized');
    }
    
    try {
        // Default options
        const transcriptionOptions = {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'english',
            task: 'transcribe',
            return_timestamps: false,
            ...options
        };
        
        // Perform transcription
        const output = await transcriptionPipeline(audioData, transcriptionOptions);
        
        return {
            text: output.text,
            chunks: output.chunks || [],
            timestamp: Date.now()
        };
        
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}

// Convert audio to correct format if needed
function preprocessAudio(audioData) {
    // Ensure we have Float32Array
    if (!(audioData instanceof Float32Array)) {
        audioData = new Float32Array(audioData);
    }
    
    // Normalize audio if needed (-1 to 1 range)
    let maxVal = 0;
    for (let i = 0; i < audioData.length; i++) {
        maxVal = Math.max(maxVal, Math.abs(audioData[i]));
    }
    
    if (maxVal > 1.0) {
        const scale = 1.0 / maxVal;
        for (let i = 0; i < audioData.length; i++) {
            audioData[i] *= scale;
        }
    }
    
    return audioData;
}

// Message handler
self.addEventListener('message', async (event) => {
    const { id, type, data } = event.data;
    
    try {
        switch (type) {
            case 'init':
                // Initialize the model
                await initializePipeline();
                break;
                
            case 'transcribe':
                // Ensure model is loaded
                if (!isModelLoaded) {
                    await initializePipeline();
                }
                
                // Process audio
                const audioData = preprocessAudio(data.audio);
                const result = await transcribeAudio(audioData, data.options || {});
                
                // Send result
                self.postMessage({
                    id,
                    type: 'result',
                    status: 'success',
                    result
                });
                break;
                
            case 'status':
                // Return current status
                self.postMessage({
                    id,
                    type: 'status',
                    isLoaded: isModelLoaded,
                    isLoading: isModelLoading
                });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        // Send error response
        self.postMessage({
            id,
            type: 'error',
            status: 'error',
            error: error.message || 'Unknown error occurred'
        });
    }
});

// Send initial ready message
self.postMessage({
    type: 'init',
    status: 'initialized',
    message: 'Worker initialized, ready to load model'
});
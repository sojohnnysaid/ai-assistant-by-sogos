// Debug version of Whisper Web Worker with extensive logging
console.log('[WhisperWorker] Worker script loaded');

let pipeline = null;
let env = null;
let isInitialized = false;
let isLoading = false;
let modelInstance = null;

// Log all incoming messages
self.addEventListener('message', (event) => {
    console.log('[WhisperWorker] Received message:', event.data);
});

// Send init message when worker loads
console.log('[WhisperWorker] Sending init message');
self.postMessage({
    type: 'init',
    message: 'Worker initialized'
});

// Initialize by loading the library
async function initialize() {
    console.log('[WhisperWorker] Initialize called, isInitialized:', isInitialized, 'isLoading:', isLoading);
    
    if (isInitialized || isLoading) {
        console.log('[WhisperWorker] Already initialized or loading, returning');
        return;
    }
    
    isLoading = true;
    
    try {
        console.log('[WhisperWorker] Starting library import...');
        self.postMessage({
            type: 'status',
            status: 'loading',
            message: 'Importing transformers library...'
        });
        
        // Import the library
        const module = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
        console.log('[WhisperWorker] Library imported successfully:', module);
        
        // Extract what we need
        pipeline = module.pipeline;
        env = module.env;
        
        // Configure environment
        env.allowLocalModels = false;
        // Suppress ONNX runtime warnings about unused initializers
        env.onnx = env.onnx || {};
        env.onnx.logLevel = 'error'; // Only show errors, not warnings
        env.remoteURL = 'https://huggingface.co/';
        
        // Suppress ONNX Runtime warnings globally
        if (globalThis.ort) {
            globalThis.ort.env.logLevel = 'error';  // Only show errors
            globalThis.ort.env.wasm.numThreads = 1;  // Single thread for consistency
        }
        
        console.log('[WhisperWorker] Environment configured');
        
        isInitialized = true;
        isLoading = false;
        
        self.postMessage({
            type: 'status',
            status: 'initialized',
            message: 'Library loaded successfully'
        });
        
    } catch (error) {
        isLoading = false;
        console.error('[WhisperWorker] Failed to initialize:', error);
        self.postMessage({
            type: 'error',
            error: error.message || 'Failed to initialize',
            stack: error.stack
        });
    }
}

// Load the model
async function loadModel() {
    console.log('[WhisperWorker] loadModel called');
    
    if (!isInitialized) {
        console.log('[WhisperWorker] Not initialized, calling initialize first');
        await initialize();
    }
    
    if (modelInstance) {
        console.log('[WhisperWorker] Model already loaded, returning existing instance');
        return modelInstance;
    }
    
    try {
        console.log('[WhisperWorker] Creating pipeline for whisper-tiny.en...');
        self.postMessage({
            type: 'status',
            status: 'loading',
            message: 'Loading Whisper model...'
        });
        
        modelInstance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
            quantized: true,
            // Session options to suppress ONNX warnings
            sessionOptions: {
                logSeverityLevel: 3, // 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal
                graphOptimizationLevel: 'all' // Keep optimizations for performance
            },
            device: 'cpu',
            progress_callback: (progress) => {
                console.log('[WhisperWorker] Model loading progress:', progress);
                self.postMessage({
                    type: 'progress',
                    progress: Math.round(progress.progress * 100),
                    message: `Loading: ${Math.round(progress.progress * 100)}%`
                });
            }
        });
        
        console.log('[WhisperWorker] Model loaded successfully');
        return modelInstance;
        
    } catch (error) {
        console.error('[WhisperWorker] Failed to load model:', error);
        throw error;
    }
}

// Handle messages
self.addEventListener('message', async (event) => {
    const { id, type, audio, options } = event.data;
    console.log(`[WhisperWorker] Processing message - type: ${type}, id: ${id}, hasAudio: ${!!audio}`);
    
    switch (type) {
        case 'init':
            try {
                console.log('[WhisperWorker] Handling init message');
                
                // Load the model
                await loadModel();
                
                console.log('[WhisperWorker] Sending ready response');
                self.postMessage({
                    id,
                    type: 'ready',
                    status: 'ready',
                    message: 'Model loaded and ready'
                });
                
            } catch (error) {
                console.error('[WhisperWorker] Init error:', error);
                self.postMessage({
                    id,
                    type: 'error',
                    status: 'error',
                    error: error.message || 'Failed to load model',
                    stack: error.stack
                });
            }
            break;
            
        case 'transcribe':
            try {
                console.log('[WhisperWorker] Handling transcribe message');
                console.log('[WhisperWorker] Audio info:', {
                    hasAudio: !!audio,
                    audioType: audio ? audio.constructor.name : 'none',
                    audioLength: audio ? audio.length : 0,
                    hasOptions: !!options
                });
                
                // Ensure model is loaded
                const transcriber = await loadModel();
                
                // Get audio data
                const audioData = audio;
                if (!audioData || audioData.length === 0) {
                    throw new Error(`No audio data provided. Audio length: ${audio ? audio.length : 'null'}`);
                }
                
                console.log(`[WhisperWorker] Transcribing audio: ${audioData.length} samples`);
                
                // Check audio values
                const maxVal = Math.max(...audioData.slice(0, 100));
                const minVal = Math.min(...audioData.slice(0, 100));
                console.log(`[WhisperWorker] Audio range: ${minVal} to ${maxVal}`);
                
                // Transcribe
                const output = await transcriber(audioData, {
                    return_timestamps: false,
                    chunk_length_s: 30,
                    stride_length_s: 5,
                });
                
                console.log('[WhisperWorker] Transcription result:', output);
                
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
                console.error('[WhisperWorker] Transcription error:', error);
                self.postMessage({
                    id,
                    type: 'error',
                    status: 'error',
                    error: error.message || 'Transcription failed',
                    stack: error.stack
                });
            }
            break;
            
        default:
            console.warn(`[WhisperWorker] Unknown message type: ${type}`);
            self.postMessage({
                id,
                type: 'error',
                error: `Unknown message type: ${type}`
            });
    }
});

// Notify that worker is ready
console.log('[WhisperWorker] Sending initial ready message');
self.postMessage({
    type: 'init',
    status: 'ready',
    message: 'Worker ready'
});

// Preload model immediately for faster first transcription
setTimeout(async () => {
    console.log('[WhisperWorker] Preloading model...');
    try {
        await loadModel();
        console.log('[WhisperWorker] Model preloaded successfully');
    } catch (error) {
        console.warn('[WhisperWorker] Model preload failed:', error);
    }
}, 100);
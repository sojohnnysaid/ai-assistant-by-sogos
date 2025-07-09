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
        
        // Configure environment BEFORE suppressing warnings
        env.allowLocalModels = false;
        env.remoteURL = 'https://huggingface.co/';
        
        // Aggressive ONNX configuration with session options
        env.onnx = env.onnx || {};
        env.onnx.logLevel = 'error';
        env.onnx.wasm = env.onnx.wasm || {};
        env.onnx.wasm.logLevel = 'error';
        env.onnx.wasm.numThreads = 1;
        
        // Configure session options to disable graph optimization warnings
        env.onnx.sessionOptions = env.onnx.sessionOptions || {};
        env.onnx.sessionOptions.logSeverityLevel = 3; // Only errors
        env.onnx.sessionOptions.graphOptimizationLevel = 'disabled'; // Disable optimization
        
        // Set global ONNX runtime config
        if (globalThis.ort) {
            globalThis.ort.env.logLevel = 'error';
            globalThis.ort.env.debug = false;
            globalThis.ort.env.logSeverityLevel = 3;
            globalThis.ort.env.wasm = globalThis.ort.env.wasm || {};
            globalThis.ort.env.wasm.numThreads = 1;
            globalThis.ort.env.wasm.logLevel = 'error';
        }
        
        // NOW suppress console warnings after configuration is done
        const originalWarn = console.warn;
        console.warn = function(...args) {
            const text = args.join(' ');
            if (text.includes('CleanUnusedInitializersAndNodeArgs') || 
                text.includes('Removing initializer') ||
                text.includes('onnxruntime') ||
                text.includes('graph.cc') ||
                text.includes('[W:onnxruntime') ||
                text.includes('Constant_output_0') ||
                text.includes('model/decoder')) {
                return;
            }
            originalWarn.apply(console, args);
        };
        
        console.log('[WhisperWorker] Environment configured');
        
        isInitialized = true;
        isLoading = false;
        
        console.log('[WhisperWorker] Initialization complete');
        self.postMessage({
            type: 'status',
            status: 'ready',
            message: 'Transformers library loaded'
        });
        
    } catch (error) {
        console.error('[WhisperWorker] Failed to initialize:', error);
        isLoading = false;
        self.postMessage({
            type: 'error',
            error: error.message || 'Failed to initialize'
        });
        throw error;
    }
}

// Load and cache the model
async function loadModel() {
    console.log('[WhisperWorker] loadModel called');
    
    if (modelInstance) {
        console.log('[WhisperWorker] Model already loaded, returning existing instance');
        return modelInstance;
    }
    
    if (!isInitialized) {
        console.log('[WhisperWorker] Not initialized, calling initialize first');
        await initialize();
    }
    
    console.log('[WhisperWorker] Creating pipeline for whisper-tiny.en...');
    
    try {
        // Send progress updates
        const progressCallback = (progress) => {
            console.log('[WhisperWorker] Model loading progress:', progress);
            self.postMessage({
                type: 'progress',
                progress: progress
            });
        };
        
        // Create the pipeline
        modelInstance = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-tiny.en',
            {
                progress_callback: progressCallback,
                revision: 'main',
                device: 'wasm',
                dtype: 'q8',
            }
        );
        
        console.log('[WhisperWorker] Model loaded successfully');
        return modelInstance;
        
    } catch (error) {
        console.error('[WhisperWorker] Failed to load model:', error);
        self.postMessage({
            type: 'error',
            error: error.message || 'Failed to load model'
        });
        throw error;
    }
}

// Message handler
self.addEventListener('message', async (event) => {
    const { type, id, audio, options } = event.data;
    
    console.log('[WhisperWorker] Processing message - type:', type, 'id:', id, 'hasAudio:', !!audio);
    
    try {
        if (type === 'init') {
            console.log('[WhisperWorker] Handling init message');
            await loadModel();
            console.log('[WhisperWorker] Sending ready response');
            self.postMessage({
                id,
                type: 'ready',
                message: 'Model loaded and ready'
            });
        } 
        else if (type === 'transcribe') {
            console.log('[WhisperWorker] Handling transcribe message');
            console.log('[WhisperWorker] Audio info:', {
                hasAudio: !!audio,
                audioType: audio ? audio.constructor.name : 'none',
                audioLength: audio ? audio.length : 0,
                hasOptions: !!options
            });
            
            const transcriber = await loadModel();
            
            if (!audio || audio.length === 0) {
                console.warn('[WhisperWorker] No audio data provided');
                self.postMessage({
                    id,
                    type: 'result',
                    text: '',
                    error: 'No audio data provided'
                });
                return;
            }
            
            console.log('[WhisperWorker] Transcribing audio:', audio.length, 'samples');
            
            // Check audio data validity
            const minVal = Math.min(...audio);
            const maxVal = Math.max(...audio);
            console.log('[WhisperWorker] Audio range:', minVal, 'to', maxVal);
            
            const result = await transcriber(audio, {
                ...options,
                return_timestamps: false,
                chunk_length_s: 30,
                stride_length_s: 5
            });
            
            console.log('[WhisperWorker] Transcription result:', result);
            
            self.postMessage({
                id,
                type: 'result',
                result: {
                    text: result.text || ''
                }
            });
        }
        else {
            console.warn('[WhisperWorker] Unknown message type:', type);
            self.postMessage({
                id,
                type: 'error',
                error: `Unknown message type: ${type}`
            });
        }
    } catch (error) {
        console.error('[WhisperWorker] Message handler error:', error);
        self.postMessage({
            id,
            type: 'error',
            error: error.message || 'Processing failed'
        });
    }
});

// Additional message listener for debugging
self.addEventListener('message', (event) => {
    if (event.data.type === 'init') {
        console.log('[WhisperWorker] Received init message, details:', event.data);
    }
});

// Send a ready message when the worker loads
console.log('[WhisperWorker] Sending initial ready message');
self.postMessage({
    type: 'ready',
    message: 'Worker script loaded'
});

// Preload the model after a short delay
setTimeout(async () => {
    console.log('[WhisperWorker] Preloading model...');
    try {
        await loadModel();
        console.log('[WhisperWorker] Model preloaded successfully');
    } catch (error) {
        console.warn('[WhisperWorker] Model preload failed:', error);
    }
}, 100);
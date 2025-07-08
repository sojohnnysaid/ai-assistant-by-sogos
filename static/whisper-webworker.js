// Based on xenova/whisper-web implementation
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';

// Configure environment
env.allowLocalModels = false;
env.remoteURL = 'https://huggingface.co/';

// Singleton pattern for model loading
class TranscriptionPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: true,
                progress_callback,
            });
        }
        return this.instance;
    }
}

// Convert audio to mono channel at 16kHz
function convertAudioTo16kHzMono(audioData, sourceSampleRate = 16000) {
    if (sourceSampleRate === 16000) {
        return audioData;
    }
    
    const ratio = sourceSampleRate / 16000;
    const newLength = Math.floor(audioData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
        const index = Math.floor(i * ratio);
        result[i] = audioData[index];
    }
    
    return result;
}

// Main message handler
self.addEventListener('message', async (event) => {
    const { type, audio } = event.data;
    
    if (type === 'load') {
        try {
            await TranscriptionPipeline.getInstance(progress => {
                self.postMessage({
                    status: 'loading',
                    progress: Math.round(progress.progress * 100)
                });
            });
            
            self.postMessage({ status: 'ready' });
        } catch (error) {
            self.postMessage({ 
                status: 'error', 
                error: `Failed to load model: ${error.message}` 
            });
        }
    }
    
    if (type === 'transcribe' && audio) {
        try {
            const transcriber = await TranscriptionPipeline.getInstance();
            
            // Ensure audio is in correct format
            const audioData = convertAudioTo16kHzMono(audio);
            
            // Transcribe
            const output = await transcriber(audioData, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: false,
                language: 'english',
                task: 'transcribe',
            });
            
            self.postMessage({
                status: 'transcription',
                text: output.text
            });
        } catch (error) {
            self.postMessage({ 
                status: 'error', 
                error: `Transcription failed: ${error.message}` 
            });
        }
    }
});
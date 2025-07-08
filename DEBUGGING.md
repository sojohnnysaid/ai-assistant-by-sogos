# Debugging Transcription Issues

## The Problem
The transcription button gets stuck in "Loading..." state, indicating the Whisper model isn't loading properly.

## Debug Tools

### 1. Audio Flow Debug Page
Open `/static/debug-audio.html` to test components individually:
- **Test VAD**: Tests if voice detection is working
- **Test Whisper**: Tests if the model loads and transcribes test audio
- **Test Full Integration**: Tests VAD + Whisper together

### 2. Console Debugging
The debug worker logs extensive information:
- `[WhisperWorker]` - Worker initialization and model loading
- `[TranscriptionManager]` - Audio data being sent for transcription
- `[VADManager]` - Voice activity detection events

## Common Issues

### 1. CORS/Network Issues
- Check if `https://cdn.jsdelivr.net` is accessible
- Look for CORS errors in console
- Try opening the model URL directly: https://huggingface.co/Xenova/whisper-tiny.en

### 2. Audio Format Issues
VAD outputs:
- Type: Float32Array
- Sample Rate: 16000 Hz
- Range: -1.0 to 1.0

### 3. Memory Issues
The Whisper model requires significant memory to load. Check:
- Browser memory usage
- Console for out-of-memory errors

## Quick Fixes

1. **Clear browser cache** - Old model files might be corrupted
2. **Try Chrome/Edge** - Better WebGPU support
3. **Check microphone permissions** - VAD needs mic access
4. **Use debug worker** - Already configured to show detailed logs

## What to Look For in Console

Success flow:
```
[WhisperWorker] Worker script loaded
[WhisperWorker] Starting library import...
[WhisperWorker] Library imported successfully
[WhisperWorker] Loading Whisper model...
[WhisperWorker] Model loading progress: {progress: 50}
[WhisperWorker] Model loaded successfully
Transcription button clicked, isActive: false
[TranscriptionManager] Sending audio to worker: {type: "Float32Array", length: 48000}
[WhisperWorker] Transcription result: {text: "hello world"}
```

Error indicators:
- Network timeouts
- "Failed to fetch" errors
- Memory allocation errors
- Invalid audio data warnings
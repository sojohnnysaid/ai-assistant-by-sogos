# Low-Fi Voice Recorder

A minimal Python web app for recording voice with the lowest possible fidelity while maintaining intelligibility.

## Features
- Records audio in mono at 8kHz sample rate
- Uses WebM with Opus codec at 6kbps bitrate
- Maximum recording time: 10 seconds
- Instant playback of recordings
- Dark theme UI with Tailwind CSS

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Run the app: `python app.py`
3. Open http://localhost:5000 in your browser

## Technical Details
- Uses Web Audio API with MediaRecorder
- Optimized for speed with minimal audio quality
- Recordings saved as .webm files
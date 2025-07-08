from flask import Flask, render_template, request, jsonify, Response
import os
from google import genai
from google.genai import types
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from io import BytesIO
import uuid

app = Flask(__name__)

# Configure app
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Initialize clients with error checking
try:
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY")
    
    if not gemini_api_key:
        print("WARNING: GEMINI_API_KEY not found in environment variables")
    if not elevenlabs_api_key:
        print("WARNING: ELEVENLABS_API_KEY not found in environment variables")
    
    gemini_client = genai.Client(api_key=gemini_api_key) if gemini_api_key else None
    elevenlabs = ElevenLabs(api_key=elevenlabs_api_key) if elevenlabs_api_key else None
except Exception as e:
    print(f"Error initializing API clients: {e}")
    gemini_client = None
    elevenlabs = None

# Gemini model configuration
GEMINI_MODEL = "gemini-2.5-flash-lite-preview-06-17"

# ElevenLabs voice configuration
VOICE_ID = "pNInz6obpgDQGcFmaJgB"  # Adam pre-made voice
VOICE_MODEL = "eleven_turbo_v2_5"  # Use turbo model for low latency

@app.route('/')
def index():
    """Main page with live transcription interface"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'healthy'}

@app.route('/api-status')
def api_status():
    """Check which APIs are configured"""
    return jsonify({
        'gemini': {
            'configured': gemini_client is not None,
            'api_key_present': bool(os.environ.get("GEMINI_API_KEY"))
        },
        'elevenlabs': {
            'configured': elevenlabs is not None,
            'api_key_present': bool(os.environ.get("ELEVENLABS_API_KEY"))
        }
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Handle AI chat requests"""
    try:
        if not gemini_client:
            return jsonify({'error': 'Gemini API not configured. Please set GEMINI_API_KEY environment variable.'}), 503
            
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Build conversation context
        contents = []
        
        # Add chat history if provided
        for msg in chat_history:
            contents.append(types.Content(
                role=msg['role'],
                parts=[types.Part.from_text(text=msg['content'])]
            ))
        
        # Add current user message
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)]
        ))
        
        # Generate AI response or use fallback
        if gemini_client:
            generate_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                response_mime_type="text/plain",
            )
            
            # Collect the full response
            ai_response = ""
            for chunk in gemini_client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=generate_config,
            ):
                if chunk.text:
                    ai_response += chunk.text
        else:
            # Fallback response when Gemini is not configured
            ai_response = f"I heard you say: '{user_message}'. However, the AI service is not configured. Please set the GEMINI_API_KEY environment variable."
        
        return jsonify({
            'response': ai_response,
            'success': True
        })
        
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """Convert text to speech using ElevenLabs"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Generate speech
        response = elevenlabs.text_to_speech.stream(
            voice_id=VOICE_ID,
            output_format="mp3_22050_32",
            text=text,
            model_id=VOICE_MODEL,
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.8,
                style=0.0,
                use_speaker_boost=True,
                speed=1.0,
            ),
        )
        
        # Collect audio data
        audio_stream = BytesIO()
        for chunk in response:
            if chunk:
                audio_stream.write(chunk)
        
        audio_stream.seek(0)
        
        # Return audio as response
        return Response(
            audio_stream.read(),
            mimetype='audio/mp3',
            headers={
                'Content-Disposition': 'inline; filename="response.mp3"'
            }
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chat-with-voice', methods=['POST'])
def chat_with_voice():
    """Combined endpoint: AI chat + text-to-speech"""
    try:
        if not gemini_client:
            return jsonify({'error': 'Gemini API not configured. Please set GEMINI_API_KEY environment variable.'}), 503
        if not elevenlabs:
            return jsonify({'error': 'ElevenLabs API not configured. Please set ELEVENLABS_API_KEY environment variable.'}), 503
            
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Build conversation context
        contents = []
        
        # Add chat history if provided
        for msg in chat_history:
            contents.append(types.Content(
                role=msg['role'],
                parts=[types.Part.from_text(text=msg['content'])]
            ))
        
        # Add current user message
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)]
        ))
        
        # Generate AI response or use fallback
        if gemini_client:
            generate_config = types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                response_mime_type="text/plain",
            )
            
            # Collect the full response
            ai_response = ""
            for chunk in gemini_client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=generate_config,
            ):
                if chunk.text:
                    ai_response += chunk.text
        else:
            # Fallback response when Gemini is not configured
            ai_response = f"I heard you say: '{user_message}'. However, the AI service is not configured. Please set the GEMINI_API_KEY environment variable."
        
        # Convert to speech or skip if not configured
        if elevenlabs:
            audio_response = elevenlabs.text_to_speech.stream(
                voice_id=VOICE_ID,
                output_format="mp3_22050_32",
                text=ai_response,
                model_id=VOICE_MODEL,
                voice_settings=VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.8,
                    style=0.0,
                    use_speaker_boost=True,
                    speed=1.0,
                ),
            )
            
            # Collect audio data
            audio_stream = BytesIO()
            for chunk in audio_response:
                if chunk:
                    audio_stream.write(chunk)
            
            audio_stream.seek(0)
            audio_data = audio_stream.read()
            
            # Convert audio to base64 for JSON response
            import base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        else:
            # No audio when ElevenLabs is not configured
            audio_base64 = None
        
        return jsonify({
            'response': ai_response,
            'audio': audio_base64,
            'audio_format': 'mp3' if audio_base64 else None,
            'success': True
        })
        
    except Exception as e:
        print(f"Chat-with-voice error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
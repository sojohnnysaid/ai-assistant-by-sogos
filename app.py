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

# Initialize clients
gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
elevenlabs = ElevenLabs(api_key=os.environ.get("ELEVENLABS_API_KEY"))

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

@app.route('/chat', methods=['POST'])
def chat():
    """Handle AI chat requests"""
    try:
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
        
        # Generate AI response
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
        
        return jsonify({
            'response': ai_response,
            'success': True
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        
        # Generate AI response
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
        
        # Convert to speech
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
        
        return jsonify({
            'response': ai_response,
            'audio': audio_base64,
            'audio_format': 'mp3',
            'success': True
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
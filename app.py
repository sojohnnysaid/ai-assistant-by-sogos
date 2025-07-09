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
    # Try both possible environment variable names for Gemini
    gemini_api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    
    print(f"GOOGLE_API_KEY/GEMINI_API_KEY present: {bool(gemini_api_key)}")
    print(f"ELEVENLABS_API_KEY/ELEVEN_API_KEY present: {bool(elevenlabs_api_key)}")
    
    if not gemini_api_key:
        print("WARNING: Neither GOOGLE_API_KEY nor GEMINI_API_KEY found in environment variables")
        print("Set one of these environment variables with your Gemini API key")
    if not elevenlabs_api_key:
        print("WARNING: Neither ELEVENLABS_API_KEY nor ELEVEN_API_KEY found in environment variables")
    
    # Initialize Gemini client
    if gemini_api_key:
        try:
            gemini_client = genai.Client(api_key=gemini_api_key)
            print("Gemini client initialized successfully")
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
            gemini_client = None
    else:
        gemini_client = None
    
    # Initialize ElevenLabs client
    if elevenlabs_api_key:
        try:
            elevenlabs = ElevenLabs(api_key=elevenlabs_api_key)
            print("ElevenLabs client initialized successfully")
        except Exception as e:
            print(f"Error initializing ElevenLabs client: {e}")
            elevenlabs = None
    else:
        elevenlabs = None
        
except Exception as e:
    print(f"Error during API client initialization: {e}")
    import traceback
    print(traceback.format_exc())
    gemini_client = None
    elevenlabs = None

# Gemini model configuration
GEMINI_MODEL = "gemini-2.5-flash-lite-preview-06-17"

# ElevenLabs voice configuration
VOICE_ID = "G17SuINrv2H9FC6nvetn"  # Updated voice ID
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
            return jsonify({'error': 'Gemini API not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.'}), 503
            
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Build conversation context
        contents = []
        
        # Add chat history if provided
        for msg in chat_history:
            # Convert 'assistant' role to 'model' for Gemini API
            role = 'model' if msg['role'] == 'assistant' else msg['role']
            contents.append(types.Content(
                role=role,
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
            ai_response = f"I heard you say: '{user_message}'. However, the AI service is not configured. Please set the GOOGLE_API_KEY or GEMINI_API_KEY environment variable."
        
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
        print(f"\n=== /chat-with-voice request ===")
        print(f"Gemini client available: {gemini_client is not None}")
        print(f"ElevenLabs client available: {elevenlabs is not None}")
        
        if not gemini_client:
            return jsonify({'error': 'Gemini API not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.'}), 503
        if not elevenlabs:
            return jsonify({'error': 'ElevenLabs API not configured. Please set ELEVENLABS_API_KEY or ELEVEN_API_KEY environment variable.'}), 503
            
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        print(f"User message: {user_message}")
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Build conversation context
        contents = []
        
        # Add chat history if provided
        for msg in chat_history:
            # Convert 'assistant' role to 'model' for Gemini API
            role = 'model' if msg['role'] == 'assistant' else msg['role']
            contents.append(types.Content(
                role=role,
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
            ai_response = f"I heard you say: '{user_message}'. However, the AI service is not configured. Please set the GOOGLE_API_KEY or GEMINI_API_KEY environment variable."
        
        # Convert to speech or skip if not configured
        if elevenlabs:
            # Debug: Check what methods are available
            print(f"Type of text_to_speech: {type(elevenlabs.text_to_speech)}")
            available_methods = [m for m in dir(elevenlabs.text_to_speech) if not m.startswith('_')]
            print(f"Available methods: {available_methods}")
            print(f"AI response to convert: {ai_response[:100]}...")
            
            # Try using the correct method based on what's available
            method_used = None
            if hasattr(elevenlabs.text_to_speech, 'convert'):
                method_used = 'convert'
                audio_response = elevenlabs.text_to_speech.convert(
                    voice_id=VOICE_ID,
                    output_format="pcm_16000",  # Use PCM for lower latency
                    text=ai_response,
                    model_id=VOICE_MODEL,
                    optimize_streaming_latency=3,  # Optimize for lowest latency
                    voice_settings=VoiceSettings(
                        stability=0.4,  # Slightly reduced for faster generation
                        similarity_boost=0.75,
                        style=0.0,
                        use_speaker_boost=True,
                    ),
                )
            elif hasattr(elevenlabs, 'generate'):
                method_used = 'generate'
                audio_response = elevenlabs.generate(
                    voice=VOICE_ID,
                    text=ai_response,
                    model=VOICE_MODEL,
                )
            else:
                raise AttributeError(f"No suitable method found. Available methods: {available_methods}")
            
            print(f"Using method: {method_used}")
            
            # Collect audio data
            audio_stream = BytesIO()
            chunk_count = 0
            try:
                if hasattr(audio_response, '__iter__'):
                    # It's an iterator
                    for chunk in audio_response:
                        if chunk:
                            audio_stream.write(chunk)
                            chunk_count += 1
                else:
                    # It's raw bytes
                    audio_stream.write(audio_response)
                    chunk_count = 1
                print(f"Received {chunk_count} audio chunks")
            except Exception as chunk_error:
                print(f"Error collecting audio chunks: {chunk_error}")
                import traceback
                print(traceback.format_exc())
                raise
            
            audio_stream.seek(0)
            audio_data = audio_stream.read()
            
            # Convert audio to base64 for JSON response
            import base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        else:
            # No audio when ElevenLabs is not configured
            audio_base64 = None
        
        # Determine audio format based on what was used
        audio_format = 'pcm' if audio_base64 and method_used == 'convert' else 'mp3'
        
        return jsonify({
            'response': ai_response,
            'audio': audio_base64,
            'audio_format': audio_format,
            'sample_rate': 16000 if audio_format == 'pcm' else 22050,
            'success': True
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Chat-with-voice error: {e}")
        print(f"Full traceback:\n{error_details}")
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
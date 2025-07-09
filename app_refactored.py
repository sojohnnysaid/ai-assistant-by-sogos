from flask import Flask, render_template, request, jsonify, Response
import os
import asyncio
from functools import wraps

from src.core.ai_service import AIService
from src.core.tts_service import TTSService
from src.core.tool_manager import ToolManager

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Initialize services
tool_manager = ToolManager()
ai_service = AIService(tool_manager=tool_manager)
tts_service = TTSService()


def async_route(f):
    """Decorator to handle async routes in Flask"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(f(*args, **kwargs))
        finally:
            loop.close()
    return wrapper


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
            'configured': ai_service.is_configured(),
            'api_key_present': bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        },
        'elevenlabs': {
            'configured': tts_service.is_configured(),
            'api_key_present': bool(os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY"))
        },
        'tools': {
            'enabled': tool_manager.is_enabled(),
            'available_tools': tool_manager.get_available_tools()
        }
    })


@app.route('/chat', methods=['POST'])
@async_route
async def chat():
    """Handle AI chat requests with tool support"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Generate AI response
        result = await ai_service.generate_response(user_message, chat_history)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 503
            
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500


@app.route('/synthesize', methods=['POST'])
@async_route
async def synthesize():
    """Convert text to speech using ElevenLabs"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = await tts_service.synthesize(text)
        
        if result['success']:
            # Return audio data
            import base64
            audio_data = base64.b64decode(result['audio'])
            return Response(
                audio_data,
                mimetype='audio/mp3' if result['audio_format'] == 'mp3' else 'audio/raw',
                headers={
                    'Content-Disposition': 'inline; filename="response.mp3"'
                }
            )
        else:
            return jsonify({'error': result['error']}), 503
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chat-with-voice', methods=['POST'])
@async_route
async def chat_with_voice():
    """Combined endpoint: AI chat + text-to-speech"""
    import time
    request_start = time.time()
    
    try:
        print(f"\n=== /chat-with-voice request ===")
        
        if not ai_service.is_configured():
            return jsonify({'error': 'AI service not configured'}), 503
        if not tts_service.is_configured():
            return jsonify({'error': 'TTS service not configured'}), 503
            
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('history', [])
        print(f"User message: {user_message}")
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Generate AI response
        ai_start = time.time()
        ai_result = await ai_service.generate_response(user_message, chat_history)
        print(f"AI response time: {(time.time() - ai_start)*1000:.0f}ms")
        
        if not ai_result['success']:
            return jsonify(ai_result), 503
        
        # Convert to speech
        tts_start = time.time()
        tts_result = await tts_service.synthesize(ai_result['response'])
        print(f"TTS time: {(time.time() - tts_start)*1000:.0f}ms")
        
        if not tts_result['success']:
            # Return AI response without audio
            return jsonify({
                'response': ai_result['response'],
                'success': True,
                'audio': None,
                'tool_execution': ai_result.get('tool_execution')
            })
        
        # Combine results
        response_data = {
            'response': ai_result['response'],
            'audio': tts_result['audio'],
            'audio_format': tts_result['audio_format'],
            'sample_rate': tts_result['sample_rate'],
            'success': True
        }
        
        # Add tool execution info if present
        if 'tool_execution' in ai_result:
            response_data['tool_execution'] = ai_result['tool_execution']
        
        # Log total time
        print(f"Total request time: {(time.time() - request_start)*1000:.0f}ms")
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        print(f"Chat-with-voice error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'success': False}), 500


@app.route('/tools', methods=['GET'])
def list_tools():
    """List available tools"""
    return jsonify({
        'enabled': tool_manager.is_enabled(),
        'tools': tool_manager.get_available_tools()
    })


@app.route('/tools/execute', methods=['POST'])
@async_route
async def execute_tool():
    """Execute a tool with user confirmation"""
    try:
        data = request.get_json()
        tool_id = data.get('tool_id')
        parameters = data.get('parameters', {})
        confirmed = data.get('confirmed', False)
        
        if not tool_id:
            return jsonify({'error': 'No tool_id provided'}), 400
        
        result = await tool_manager.execute_tool(tool_id, parameters, confirmed)
        
        return jsonify(result.to_dict())
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
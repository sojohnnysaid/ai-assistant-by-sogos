import os
from typing import Optional, Dict, Any
from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from io import BytesIO
import base64


class TTSService:
    """Service for text-to-speech functionality"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
        self.client = None
        
        # Voice configuration
        self.voice_id = "G17SuINrv2H9FC6nvetn"
        self.voice_model = "eleven_flash_v2_5"
        
        if self.api_key:
            try:
                self.client = ElevenLabs(api_key=self.api_key)
                print("ElevenLabs client initialized successfully")
            except Exception as e:
                print(f"Error initializing ElevenLabs client: {e}")
    
    def is_configured(self) -> bool:
        """Check if TTS service is properly configured"""
        return self.client is not None
    
    async def synthesize(self, text: str, output_format: str = "pcm_16000") -> Dict[str, Any]:
        """Convert text to speech"""
        if not self.is_configured():
            return {
                "success": False,
                "error": "TTS service not configured"
            }
        
        if not text:
            return {
                "success": False,
                "error": "No text provided"
            }
        
        try:
            # Try different methods based on client version
            if hasattr(self.client.text_to_speech, 'convert'):
                audio_response = self.client.text_to_speech.convert(
                    voice_id=self.voice_id,
                    output_format=output_format,
                    text=text,
                    model_id=self.voice_model,
                    optimize_streaming_latency=3,
                    voice_settings=VoiceSettings(
                        stability=0.4,
                        similarity_boost=0.75,
                        style=0.0,
                        use_speaker_boost=True,
                    ),
                )
            elif hasattr(self.client, 'generate'):
                audio_response = self.client.generate(
                    voice=self.voice_id,
                    text=text,
                    model=self.voice_model,
                )
            else:
                # Fallback to streaming method
                audio_response = self.client.text_to_speech.stream(
                    voice_id=self.voice_id,
                    output_format="mp3_22050_32",
                    text=text,
                    model_id=self.voice_model,
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
            if hasattr(audio_response, '__iter__'):
                for chunk in audio_response:
                    if chunk:
                        audio_stream.write(chunk)
            else:
                audio_stream.write(audio_response)
            
            audio_stream.seek(0)
            audio_data = audio_stream.read()
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            # Determine format
            audio_format = 'pcm' if output_format.startswith('pcm') else 'mp3'
            sample_rate = 16000 if output_format == 'pcm_16000' else 22050
            
            return {
                "success": True,
                "audio": audio_base64,
                "audio_format": audio_format,
                "sample_rate": sample_rate
            }
            
        except Exception as e:
            print(f"TTS synthesis error: {e}")
            import traceback
            print(traceback.format_exc())
            return {
                "success": False,
                "error": str(e)
            }
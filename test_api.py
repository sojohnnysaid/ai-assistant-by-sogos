#!/usr/bin/env python3
"""Test script to verify API configurations"""

import os
import requests

def test_environment():
    """Check environment variables"""
    print("=== Environment Variables ===")
    
    gemini_key = os.environ.get("GEMINI_API_KEY")
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
    
    print(f"GEMINI_API_KEY: {'✓ Set' if gemini_key else '✗ Not set'}")
    print(f"ELEVENLABS_API_KEY: {'✓ Set' if elevenlabs_key else '✗ Not set'}")
    
    if gemini_key:
        print(f"  - Key length: {len(gemini_key)} characters")
        print(f"  - Key prefix: {gemini_key[:10]}...")
    
    if elevenlabs_key:
        print(f"  - Key length: {len(elevenlabs_key)} characters")
        print(f"  - Key prefix: {elevenlabs_key[:10]}...")
    
    return bool(gemini_key), bool(elevenlabs_key)

def test_flask_api():
    """Test Flask API endpoints"""
    print("\n=== Flask API Status ===")
    
    try:
        # Check if Flask is running
        response = requests.get("http://localhost:5000/api-status")
        if response.status_code == 200:
            data = response.json()
            print("Flask server is running!")
            print(f"Gemini configured: {data['gemini']['configured']}")
            print(f"ElevenLabs configured: {data['elevenlabs']['configured']}")
        else:
            print(f"Flask server returned status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("Flask server is not running. Start it with: python app.py")
    except Exception as e:
        print(f"Error checking Flask: {e}")

def test_gemini_directly():
    """Test Gemini API directly"""
    print("\n=== Direct Gemini Test ===")
    
    try:
        from google import genai
        from google.genai import types
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Cannot test - GEMINI_API_KEY not set")
            return
        
        client = genai.Client(api_key=api_key)
        model = "gemini-2.5-flash-lite-preview-06-17"
        
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text="Say 'Hello, I am working!' in 5 words or less.")]
            )
        ]
        
        generate_config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=0),
            response_mime_type="text/plain",
        )
        
        response_text = ""
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_config,
        ):
            if chunk.text:
                response_text += chunk.text
        
        print(f"✓ Gemini API works! Response: {response_text.strip()}")
        
    except Exception as e:
        print(f"✗ Gemini API error: {e}")

def main():
    """Run all tests"""
    print("API Configuration Test\n")
    
    # Test environment
    has_gemini, has_elevenlabs = test_environment()
    
    # Test Flask
    test_flask_api()
    
    # Test Gemini directly if available
    if has_gemini:
        test_gemini_directly()
    
    print("\n=== Summary ===")
    if has_gemini and has_elevenlabs:
        print("✓ All APIs are configured!")
    else:
        print("✗ Some APIs are missing:")
        if not has_gemini:
            print("  - Set GEMINI_API_KEY environment variable")
        if not has_elevenlabs:
            print("  - Set ELEVENLABS_API_KEY environment variable")

if __name__ == "__main__":
    main()
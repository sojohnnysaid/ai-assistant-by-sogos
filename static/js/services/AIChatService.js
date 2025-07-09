/**
 * AIChatService - Handles AI chat interactions with Gemini and ElevenLabs
 */
export class AIChatService {
  constructor() {
    this.chatHistory = [];
    this.isProcessing = false;
  }

  /**
   * Send message to AI and get response with voice
   * @param {string} message - User message
   * @returns {Promise<Object>} Response with text and audio
   */
  async sendMessage(message) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }

    this.isProcessing = true;

    try {
      // Add user message to history
      this.chatHistory.push({
        role: 'user',
        content: message
      });

      // Send to backend
      const response = await fetch('/chat-with-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          history: this.getChatContext()
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add AI response to history
        this.chatHistory.push({
          role: 'assistant',
          content: data.response
        });

        return {
          text: data.response,
          audio: data.audio,
          audioFormat: data.audio_format || 'mp3',
          sampleRate: data.sample_rate || 22050
        };
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }

    } catch (error) {
      console.error('AIChatService error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get AI response without voice
   * @param {string} message - User message
   * @returns {Promise<string>} AI response text
   */
  async getTextResponse(message) {
    try {
      // Add user message to history
      this.chatHistory.push({
        role: 'user',
        content: message
      });

      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          history: this.getChatContext()
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add AI response to history
        this.chatHistory.push({
          role: 'assistant',
          content: data.response
        });

        return data.response;
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }

    } catch (error) {
      console.error('AIChatService error:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert
   * @returns {Promise<Blob>} Audio blob
   */
  async textToSpeech(text) {
    try {
      const response = await fetch('/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }

  /**
   * Get chat context for AI (last N messages)
   * @param {number} maxMessages - Maximum messages to include
   * @returns {Array} Chat history
   */
  getChatContext(maxMessages = 10) {
    // Return last N messages, but always include system context
    const recentHistory = this.chatHistory.slice(-maxMessages);
    
    // Ensure we don't send too much context
    return recentHistory;
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.chatHistory = [];
  }

  /**
   * Get full chat history
   * @returns {Array} Complete chat history
   */
  getHistory() {
    return [...this.chatHistory];
  }

  /**
   * Check if service is processing
   * @returns {boolean} Processing state
   */
  isProcessingMessage() {
    return this.isProcessing;
  }
}
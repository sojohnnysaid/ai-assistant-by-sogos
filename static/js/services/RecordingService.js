/**
 * RecordingService - Handles all API communication
 */
export class RecordingService {
  constructor(config = {}) {
    this.config = {
      baseUrl: '',
      endpoints: {
        upload: '/upload',
        recordings: '/recordings',
        delete: '/delete'
      },
      timeout: 30000,
      ...config
    };
    
    this.httpClient = config.httpClient || fetch.bind(window);
  }

  /**
   * Upload an audio recording
   * @param {Blob} audioBlob - Audio blob to upload
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Upload response
   */
  async upload(audioBlob, metadata = {}) {
    const formData = new FormData();
    const timestamp = new Date().toISOString();
    const filename = metadata.filename || `recording_${Date.now()}.webm`;
    
    formData.append('audio', audioBlob, filename);
    formData.append('timestamp', timestamp);
    
    // Add any additional metadata
    Object.entries(metadata).forEach(([key, value]) => {
      if (key !== 'filename') {
        formData.append(key, value);
      }
    });
    
    const response = await this.request(this.config.endpoints.upload, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw this.createError('FileUploadError', response);
    }
    
    return await response.json();
  }

  /**
   * Fetch all recordings
   * @returns {Promise<Array>} List of recordings
   */
  async fetchAll() {
    const response = await this.request(this.config.endpoints.recordings, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw this.createError('FetchError', response);
    }
    
    const data = await response.json();
    return data.recordings || [];
  }

  /**
   * Delete a recording
   * @param {string} filename - Filename to delete
   * @returns {Promise<Object>} Delete response
   */
  async delete(filename) {
    const response = await this.request(this.config.endpoints.delete, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    });
    
    if (!response.ok) {
      throw this.createError('DeleteError', response);
    }
    
    return await response.json();
  }

  /**
   * Download a recording
   * @param {string} filename - Filename to download
   * @returns {Promise<Blob>} Audio blob
   */
  async download(filename) {
    const url = `${this.config.baseUrl}/recordings/${filename}`;
    const response = await this.request(url, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw this.createError('DownloadError', response);
    }
    
    return await response.blob();
  }

  /**
   * Make an HTTP request with timeout
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);
    
    try {
      const response = await this.httpClient(
        `${this.config.baseUrl}${url}`,
        {
          ...options,
          signal: controller.signal
        }
      );
      
      clearTimeout(timeout);
      return response;
      
    } catch (error) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Create an error from response
   * @param {string} type - Error type
   * @param {Response} response - HTTP response
   * @returns {Error} Created error
   */
  createError(type, response) {
    const error = new Error(`${type}: ${response.statusText}`);
    error.name = type;
    error.status = response.status;
    error.statusText = response.statusText;
    return error;
  }

  /**
   * Check if service is available
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    try {
      const response = await this.request('/health', {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
from flask import Flask, render_template, request, jsonify, send_file
import os
import uuid
from datetime import datetime
import io

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'recordings'

# Create recordings directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Generate unique filename
    filename = f"{uuid.uuid4()}.webm"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save the file
    audio_file.save(filepath)
    
    return jsonify({
        'success': True,
        'filename': filename,
        'url': f'/recording/{filename}'
    })

@app.route('/recording/<filename>')
def get_recording(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='audio/webm')
    return jsonify({'error': 'File not found'}), 404

@app.route('/recordings')
def list_recordings():
    recordings = []
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        if filename.endswith('.webm'):
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            recordings.append({
                'filename': filename,
                'timestamp': datetime.fromtimestamp(os.path.getctime(filepath)).isoformat(),
                'size': os.path.getsize(filepath)
            })
    return jsonify(recordings)

@app.route('/delete', methods=['POST'])
def delete_recording():
    data = request.get_json()
    filename = data.get('filename')
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            return jsonify({'success': True, 'message': 'Recording deleted successfully'})
        except Exception as e:
            return jsonify({'error': f'Failed to delete recording: {str(e)}'}), 500
    return jsonify({'error': 'Recording not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
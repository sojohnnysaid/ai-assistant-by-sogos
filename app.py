from flask import Flask, render_template
import os

app = Flask(__name__)

# Configure app
app.config['SECRET_KEY'] = 'your-secret-key-here'

@app.route('/')
def index():
    """Main page with live transcription interface"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'healthy'}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
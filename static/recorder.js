let mediaRecorder;
let audioChunks = [];
let startTime;
let timerInterval;
let recordingTimeout;
let micTranscription = null;

const recordButton = document.getElementById('recordButton');
const timer = document.getElementById('timer');
const status = document.getElementById('status');
const recordingsList = document.getElementById('recordingsList');

// Initialize transcription
window.addEventListener('load', async () => {
    micTranscription = new MicrophoneTranscription();
});

// Audio constraints for better clarity while keeping file size low
const audioConstraints = {
    audio: {
        channelCount: 1, // Mono (keeps size down)
        sampleRate: 16000, // 16kHz - much clearer speech, still compact
        echoCancellation: false, // Disabled for raw audio
        noiseSuppression: true,
        autoGainControl: true // Normalizes volume levels
    }
};

recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        
        // Use optimized bitrate for clear speech while keeping file size reasonable
        const options = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000 // 16kbps - good balance of clarity and size
        };
        
        mediaRecorder = new MediaRecorder(stream, options);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await uploadRecording(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        startTime = Date.now();
        
        // Start real-time transcription
        if (micTranscription) {
            await micTranscription.start();
        }
        
        // Update UI
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        recordButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        timer.classList.remove('hidden');
        status.textContent = 'Recording...';
        
        // Start timer
        updateTimer();
        timerInterval = setInterval(updateTimer, 100);
        
        // Auto-stop after 10 seconds
        recordingTimeout = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                stopRecording();
            }
        }, 10000);
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        status.textContent = 'Error: Could not access microphone';
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(timerInterval);
        clearTimeout(recordingTimeout);
        
        // Stop transcription
        if (micTranscription) {
            micTranscription.stop();
        }
        
        // Reset UI
        recordButton.textContent = 'Start Recording';
        recordButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        recordButton.classList.add('bg-red-600', 'hover:bg-red-700');
        status.textContent = 'Processing...';
    }
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const tenths = Math.floor((elapsed % 1000) / 100);
    timer.textContent = `${seconds}:${tenths}`;
}

async function uploadRecording(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            status.textContent = 'Recording saved!';
            addRecordingToList(data);
            timer.classList.add('hidden');
        } else {
            status.textContent = 'Error saving recording';
        }
    } catch (error) {
        console.error('Upload error:', error);
        status.textContent = 'Error uploading recording';
    }
}

function addRecordingToList(recording) {
    const recordingDiv = document.createElement('div');
    recordingDiv.className = 'bg-gray-800 rounded-lg p-4';
    recordingDiv.id = `recording-${recording.filename}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const transcription = micTranscription ? micTranscription.getTranscriptionText() : '';
    
    recordingDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div>
                <p class="font-semibold">Recording - ${timestamp}</p>
                <p class="text-sm text-gray-400">${recording.filename}</p>
            </div>
            <div class="flex items-center gap-2">
                <audio controls class="ml-4" preload="metadata">
                    <source src="${recording.url}" type="audio/webm">
                    Your browser does not support the audio element.
                </audio>
                <button onclick="deleteRecording('${recording.filename}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm">
                    Delete
                </button>
            </div>
        </div>
        ${transcription ? `
        <div class="mt-3 pt-3 border-t border-gray-700">
            <p class="text-sm text-gray-500 mb-1">Transcription:</p>
            <p class="text-gray-300">${transcription}</p>
        </div>
        ` : ''}
    `;
    
    recordingsList.insertBefore(recordingDiv, recordingsList.firstChild);
    
    // Clear transcription for next recording
    if (micTranscription) {
        micTranscription.clearTranscription();
    }
}

// Load existing recordings on page load
async function loadRecordings() {
    try {
        const response = await fetch('/recordings');
        const recordings = await response.json();
        
        recordings.forEach(recording => {
            const recordingDiv = document.createElement('div');
            recordingDiv.className = 'bg-gray-800 rounded-lg p-4 flex items-center justify-between';
            recordingDiv.id = `recording-${recording.filename}`;
            
            const date = new Date(recording.created);
            const timestamp = date.toLocaleString();
            
            recordingDiv.innerHTML = `
                <div>
                    <p class="font-semibold">Recording - ${timestamp}</p>
                    <p class="text-sm text-gray-400">${recording.filename}</p>
                </div>
                <div class="flex items-center gap-2">
                    <audio controls class="ml-4" preload="metadata">
                        <source src="${recording.url}" type="audio/webm">
                        Your browser does not support the audio element.
                    </audio>
                    <button onclick="deleteRecording('${recording.filename}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm">
                        Delete
                    </button>
                </div>
            `;
            
            recordingsList.appendChild(recordingDiv);
        });
    } catch (error) {
        console.error('Error loading recordings:', error);
    }
}

// Delete recording function
async function deleteRecording(filename) {
    if (!confirm('Are you sure you want to delete this recording?')) {
        return;
    }
    
    try {
        const response = await fetch(`/recording/${filename}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (response.ok) {
            // Remove from UI
            const recordingElement = document.getElementById(`recording-${filename}`);
            if (recordingElement) {
                recordingElement.remove();
            }
            status.textContent = 'Recording deleted successfully';
        } else {
            status.textContent = data.error || 'Error deleting recording';
        }
    } catch (error) {
        console.error('Delete error:', error);
        status.textContent = 'Error deleting recording';
    }
}

// Load recordings when page loads
loadRecordings();
let videoStream = null;
let isAnalyzing = false;

// Start emotion analysis using webcam with camera selection
async function startEmotionAnalysis() {
    try {
        // Show loading modal
        document.getElementById('loading-modal').style.display = 'flex';

        // Request specific camera (rear camera preferred for desktop)
        const constraints = {
            video: {
                facingMode: 'user',  // Use front/user-facing camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Create video element
        const video = document.createElement('video');
        video.srcObject = videoStream;
        video.play();

        isAnalyzing = true;

        // Wait for video to be ready
        video.onloadedmetadata = () => {
            // Capture frame after 2 seconds
            setTimeout(() => {
                captureAndAnalyze(video);
            }, 2000);
        };

    } catch (error) {
        console.error('Error accessing webcam:', error);
        let errorMsg = 'Error accessing webcam. ';
        if (error.name === 'NotAllowedError') {
            errorMsg += 'Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            errorMsg += 'No camera found on this device.';
        } else {
            errorMsg += error.message;
        }
        alert(errorMsg);
        document.getElementById('loading-modal').style.display = 'none';
    }
}

// Capture frame and send for analysis
function captureAndAnalyze(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg');

    // Send to server
    fetch('/analyze_emotion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageData })
    })
        .then(response => response.json())
        .then(data => {
            displayEmotionResults(data);
            stopVideoStream();
            document.getElementById('loading-modal').style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error analyzing emotion: ' + error.message);
            stopVideoStream();
            document.getElementById('loading-modal').style.display = 'none';
        });
}

// Display emotion results
function displayEmotionResults(data) {
    const resultsSection = document.getElementById('results-section');
    const emotionResults = document.getElementById('emotion-results');

    if (data.success) {
        let html = `
            <div class="result-card">
                <div class="emotion-header">
                    <h3>🎭 Emotion Analysis</h3>
                    <p class="dominant-emotion">Dominant Emotion: <strong>${data.emotion}</strong></p>
                </div>
                <div class="emotion-breakdown">
                    <h4>Detailed Breakdown:</h4>
        `;

        for (const [emotion, value] of Object.entries(data.emotions)) {
            const percentage = value.toFixed(1);
            html += `
                <div class="emotion-bar">
                    <span class="emotion-label">${emotion}</span>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="emotion-value">${percentage}%</span>
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        emotionResults.innerHTML = html;

        // Display recommendations
        if (data.recommendations) {
            const recsData = data.recommendations;
            displayRecommendations(recsData.study_tips || [], recsData.motivational_quote);
        }

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        emotionResults.innerHTML = `
            <div class="error-message">
                <p>${data.error || 'Could not detect emotion. Please try again.'}</p>
            </div>
        `;
        resultsSection.style.display = 'block';
    }
}

// Display recommendations
function displayRecommendations(recommendations, quote) {
    const recommendationsResults = document.getElementById('recommendations-results');

    let html = `
        <div class="recommendations-card">
            <h3>📚 Personalized Recommendations</h3>
            ${quote ? `<blockquote class="quote">"${quote}"</blockquote>` : ''}
            <ul class="recommendations-list">
    `;

    recommendations.forEach(rec => {
        html += `<li>${rec}</li>`;
    });

    html += `
            </ul>
        </div>
    `;

    recommendationsResults.innerHTML = html;
}

// Start voice analysis using Web Speech API
async function startVoiceAnalysis() {
    try {
        document.getElementById('loading-modal').style.display = 'flex';
        document.querySelector('#loading-modal p').textContent = 'Listening... Please speak clearly';

        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            document.getElementById('loading-modal').style.display = 'none';
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;

            try {
                const response = await fetch('/analyze_voice', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ transcript: transcript })
                });

                const data = await response.json();
                displayVoiceResults(data);
                document.getElementById('loading-modal').style.display = 'none';
            } catch (error) {
                console.error('Error:', error);
                alert('Error analyzing voice: ' + error.message);
                document.getElementById('loading-modal').style.display = 'none';
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert('Speech recognition error: ' + event.error);
            document.getElementById('loading-modal').style.display = 'none';
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
        };

        recognition.start();

    } catch (error) {
        console.error('Error:', error);
        alert('Error starting voice analysis: ' + error.message);
        document.getElementById('loading-modal').style.display = 'none';
    }
}

// Display voice results
function displayVoiceResults(data) {
    const resultsSection = document.getElementById('results-section');
    const voiceResults = document.getElementById('voice-results');

    if (data.success) {
        const html = `
            <div class="result-card">
                <h3>🎤 Voice Analysis</h3>
                <div class="voice-details">
                    <p><strong>Transcript:</strong> "${data.text}"</p>
                    <p><strong>Stress Level:</strong> <span class="stress-${data.stress_level.toLowerCase()}">${data.stress_level}</span></p>
                    <p><strong>Energy Level:</strong> ${data.energy_level.toFixed(1)}</p>
                    ${data.message ? `<p class="info-message">${data.message}</p>` : ''}
                </div>
            </div>
        `;

        voiceResults.innerHTML = html;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        voiceResults.innerHTML = `
            <div class="error-message">
                <p>${data.error || 'Could not analyze voice. Please try again.'}</p>
            </div>
        `;
        resultsSection.style.display = 'block';
    }
}

// Stop video stream
function stopVideoStream() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    isAnalyzing = false;
}

// Dashboard functions
async function loadSessionHistory() {
    try {
        const response = await fetch('/session_history');
        const data = await response.json();

        if (data.success) {
            displaySessionHistory(data.sessions);
        } else {
            document.getElementById('session-history').innerHTML =
                '<p>Could not load session history</p>';
        }
    } catch (error) {
        document.getElementById('session-history').innerHTML =
            '<p>Error loading session history</p>';
    }
}

function displaySessionHistory(sessions) {
    const historyDiv = document.getElementById('session-history');

    if (sessions.length === 0) {
        historyDiv.innerHTML = '<p>No previous sessions found</p>';
        return;
    }

    let historyHTML = `<p class="text-center"><strong>Total Sessions: ${sessions.length}</strong></p>`;

    sessions.forEach((session, index) => {
        const emotion = session.emotion_analysis?.dominant_emotion || 'Unknown';
        const timestamp = new Date(session.timestamp).toLocaleString();
        const totalDetections = session.emotion_analysis?.total_detections || 0;
        const emotionPercentages = session.emotion_analysis?.emotion_percentages || {};
        const recommendations = session.recommendations || {};

        let emotionBreakdown = '';
        for (const [emo, percentage] of Object.entries(emotionPercentages)) {
            emotionBreakdown += `<span style="display:inline-block; margin:2px 5px;">${emo}: ${percentage.toFixed(1)}%</span>`;
        }

        let recsPreview = '';
        if (recommendations.study_tips && recommendations.study_tips.length > 0) {
            recsPreview = recommendations.study_tips[0];
        }

        historyHTML += `
            <div class="session-item" style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Session #${sessions.length - index}</strong>
                    <span style="color: #666; font-size: 0.9rem;">${timestamp}</span>
                </div>
                <div class="session-emotion" style="margin-bottom: 5px;">
                    <strong>Emotion:</strong> ${emotion.toUpperCase()} (${totalDetections} detections)
                </div>
                ${emotionBreakdown ? `<div style="font-size: 0.85rem; color: #555; margin-bottom: 8px;">${emotionBreakdown}</div>` : ''}
                ${recsPreview ? `<div style="font-size: 0.9rem; font-style: italic; color: #444; margin-top: 8px;">💡 ${recsPreview}</div>` : ''}
            </div>
        `;
    });

    historyDiv.innerHTML = historyHTML;
}

// Stop video stream
function stopVideoStream() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    isAnalyzing = false;
}

// Stop analysis
function stopAnalysis() {
    stopVideoStream();
    document.getElementById('loading-modal').style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    console.log('Emotion-Aware Study Assistant loaded');
});

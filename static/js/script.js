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

        // Reload session history if on dashboard page
        if (document.getElementById('session-history')) {
            setTimeout(() => {
                loadSessionHistory();
            }, 1000);
        }
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
            let msg = 'Error: ' + event.error;
            if (event.error === 'not-allowed') {
                msg = 'Microphone access denied. Please allow microphone access.';
            } else if (event.error === 'no-speech') {
                msg = 'No speech detected. Please try again and speak clearly.';
            } else if (event.error === 'network') {
                msg = 'Network error. Please check your internet connection.';
            }
            alert(msg);
            document.getElementById('loading-modal').style.display = 'none';
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            // If modal is still open and no result, close it
            // setTimeout(() => {
            //     if (document.getElementById('loading-modal').style.display === 'flex') {
            //         document.getElementById('loading-modal').style.display = 'none';
            //     }
            // }, 1000);
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

        // Reload session history if on dashboard page
        if (document.getElementById('session-history')) {
            setTimeout(() => {
                loadSessionHistory();
            }, 1000);
        }
    } else {
        voiceResults.innerHTML = `
            <div class="error-message">
                <p>${data.error || 'Could not analyze voice. Please try again.'}</p>
            </div>
        `;
        resultsSection.style.display = 'block';
    }
}

// Dashboard quick analysis functions
async function quickEmotionCheck() {
    // Reuse the main emotion analysis function
    await startEmotionAnalysis();
    // After analysis completes, reload session history
    setTimeout(() => {
        loadSessionHistory();
    }, 2000);
}

async function quickVoiceCheck() {
    // Reuse the main voice analysis function
    await startVoiceAnalysis();
}

function refreshStatus() {
    loadSessionHistory();
}

function stopCurrentAnalysis() {
    stopAnalysis();
}

// Dashboard functions
async function loadSessionHistory() {
    try {
        console.log('Loading session history...');
        const response = await fetch('/session_history');
        const data = await response.json();

        console.log('Session history response:', data);

        if (data.success) {
            console.log(`Found ${data.sessions.length} sessions`);
            displaySessionHistory(data.sessions);
        } else {
            console.error('Failed to load sessions:', data.error);
            document.getElementById('session-history').innerHTML =
                '<p>Could not load session history</p>';
        }
    } catch (error) {
        console.error('Error loading session history:', error);
        document.getElementById('session-history').innerHTML =
            '<p>Error loading session history</p>';
    }
}

function displaySessionHistory(sessions) {
    console.log('displaySessionHistory called with', sessions.length, 'sessions');
    const historyDiv = document.getElementById('session-history');

    if (!historyDiv) {
        console.error('session-history element not found!');
        return;
    }

    if (sessions.length === 0) {
        historyDiv.innerHTML = '<p>No previous sessions found</p>';
        return;
    }

    let historyHTML = `<p class="text-center"><strong>Total Sessions: ${sessions.length}</strong></p>`;

    sessions.forEach((session, index) => {
        const timestamp = new Date(session.timestamp).toLocaleString();
        let content = '';
        let typeIcon = '';

        if (session.emotion_analysis) {
            typeIcon = '🎭';
            const emotion = session.emotion_analysis.dominant_emotion;
            const totalDetections = session.emotion_analysis.total_detections;
            const emotionPercentages = session.emotion_analysis.emotion_percentages || {};

            let emotionBreakdown = '';
            for (const [emo, percentage] of Object.entries(emotionPercentages)) {
                if (percentage > 5) { // Only show significant emotions
                    emotionBreakdown += `<span style="display:inline-block; margin:2px 5px;">${emo}: ${percentage.toFixed(1)}%</span>`;
                }
            }

            content = `
                <div class="session-emotion" style="margin-bottom: 5px;">
                    <strong>Emotion:</strong> ${emotion.toUpperCase()} (${totalDetections} detections)
                </div>
                ${emotionBreakdown ? `<div style="font-size: 0.85rem; color: #555; margin-bottom: 8px;">${emotionBreakdown}</div>` : ''}
            `;

            if (session.recommendations && session.recommendations.study_tips) {
                const tip = session.recommendations.study_tips[0];
                content += `<div style="font-size: 0.9rem; font-style: italic; color: #444; margin-top: 8px;">💡 ${tip}</div>`;
            }

        } else if (session.voice_analysis) {
            typeIcon = '🎤';
            const voice = session.voice_analysis;
            content = `
                <div class="session-voice" style="margin-bottom: 5px;">
                    <strong>Voice Stress:</strong> ${voice.stress_level}
                </div>
                <div style="font-size: 0.9rem; color: #555;">
                    <em>"${voice.text}"</em>
                </div>
            `;
        }

        historyHTML += `
            <div class="session-item" style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${typeIcon === '🎭' ? '#4a90e2' : '#e24a90'};">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>${typeIcon} Session #${sessions.length - index}</strong>
                    <span style="color: #666; font-size: 0.9rem;">${timestamp}</span>
                </div>
                ${content}
            </div>
        `;
    });

    historyDiv.innerHTML = historyHTML;

    // Update current status with the latest data
    updateCurrentStatus(sessions);
}

function updateCurrentStatus(sessions) {
    const statusDiv = document.getElementById('current-status');
    const recsDiv = document.getElementById('current-recommendations');

    if (!sessions || sessions.length === 0) return;

    // Find latest emotion and voice sessions
    const latestEmotionSession = sessions.find(s => s.emotion_analysis);
    const latestVoiceSession = sessions.find(s => s.voice_analysis);

    if (statusDiv) {
        let statusHTML = '';

        if (latestEmotionSession) {
            const emotion = latestEmotionSession.emotion_analysis.dominant_emotion;
            const time = new Date(latestEmotionSession.timestamp).toLocaleTimeString();
            statusHTML += `
                <div class="status-item" style="margin-bottom: 10px;">
                    <p><strong>🎭 Latest Emotion:</strong> ${emotion.toUpperCase()}</p>
                    <p class="text-small">Time: ${time}</p>
                </div>
            `;
        }

        if (latestVoiceSession) {
            const stress = latestVoiceSession.voice_analysis.stress_level;
            const time = new Date(latestVoiceSession.timestamp).toLocaleTimeString();
            statusHTML += `
                <div class="status-item">
                    <p><strong>🎤 Voice Stress:</strong> ${stress}</p>
                    <p class="text-small">Time: ${time}</p>
                </div>
            `;
        }

        if (!statusHTML) {
            statusHTML = '<p>No recent analysis</p>';
        }

        statusHTML += '<button onclick="refreshStatus()" class="btn btn-small" style="margin-top: 10px;">Refresh</button>';
        statusDiv.innerHTML = statusHTML;
    }

    if (recsDiv && latestEmotionSession && latestEmotionSession.recommendations) {
        const recs = latestEmotionSession.recommendations;
        let html = '';

        if (recs.motivational_quote) {
            html += `<blockquote class="quote-small">"${recs.motivational_quote}"</blockquote>`;
        }

        if (recs.study_tips && recs.study_tips.length > 0) {
            html += '<ul class="recs-list-small">';
            // Show top 3 tips
            recs.study_tips.slice(0, 3).forEach(tip => {
                html += `<li>${tip}</li>`;
            });
            html += '</ul>';
        }

        recsDiv.innerHTML = html;
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

// Stop analysis
function stopAnalysis() {
    stopVideoStream();
    document.getElementById('loading-modal').style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    console.log('Emotion-Aware Study Assistant loaded');
});

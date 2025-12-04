from flask import Flask, render_template, jsonify, request, session
import json
import os
import numpy as np
from datetime import datetime
from voice_analyzer import VoiceAnalyzer
from study_recommendations import StudyRecommendations

try:
    from emotion_detector import EmotionDetector
except ImportError:
    print("Warning: Could not import EmotionDetector (DeepFace missing?). Using mock class.")
    class EmotionDetector:
        def analyze_webcam_emotion(self, duration):
            return {
                'dominant_emotion': 'neutral',
                'emotion_percentages': {'neutral': 100.0},
                'total_detections': 1,
                'session_timestamp': datetime.now().isoformat()
            }

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production

# Initialize components
emotion_detector = EmotionDetector()
voice_analyzer = VoiceAnalyzer()
study_recommender = StudyRecommendations()

# Ensure data directories exist
os.makedirs('data/user_sessions', exist_ok=True)

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard page"""
    return render_template('dashboard.html')

@app.route('/analyze_emotion', methods=['POST'])
def analyze_emotion():
    """Analyze emotion from uploaded image"""
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            })
        
        # Decode base64 image
        import base64
        import cv2
        from deepface import DeepFace
        
        # Remove data URL prefix if present
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        # Decode image
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Debug: Check if image was decoded properly
        if img is None or img.size == 0:
            print("Error: Image could not be decoded")
            return jsonify({
                'success': False,
                'error': 'Invalid image data'
            })
        
        print(f"Image shape: {img.shape}")  # Debug output
        
        # Analyze with DeepFace - using opencv detector for better accuracy
        result = DeepFace.analyze(
            img, 
            actions=['emotion'], 
            enforce_detection=False,
            detector_backend='opencv'
        )
        
        if isinstance(result, list):
            result = result[0]
        
        print(f"DeepFace result: {result}")  # Debug output
        
        # Convert numpy float32 to regular Python float for JSON serialization
        emotion_percentages = {k: float(v) for k, v in result['emotion'].items()}
        
        # Debug: Print emotion percentages
        print(f"Emotion percentages: {emotion_percentages}")
        print(f"Dominant emotion: {result['dominant_emotion']}")
        
        emotion_result = {
            'dominant_emotion': result['dominant_emotion'],
            'emotion_percentages': emotion_percentages,
            'total_detections': 1,
            'session_timestamp': datetime.now().isoformat()
        }
        
        # Get study recommendations
        recommendations = study_recommender.get_recommendations(
            emotion_result['dominant_emotion']
        )
        
        # Save session data
        session_data = {
            'emotion_analysis': emotion_result,
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
        
        # Save to file
        session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        session_file = f'data/user_sessions/session_{session_id}.json'
        
        with open(session_file, 'w') as f:
            json.dump(session_data, f, indent=2)
        
        print(f"Session saved to: {session_file}")
        
        return jsonify({
            'success': True,
            'emotion': emotion_result['dominant_emotion'],
            'emotions': emotion_percentages,
            'recommendations': recommendations
        })
            
    except Exception as e:
        print(f"Error in emotion analysis: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/analyze_voice', methods=['POST'])
def analyze_voice():
    """Analyze voice from uploaded audio"""
    try:
        # Check if this is FormData (audio file) or JSON (transcript)
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Audio file uploaded
            if 'audio' not in request.files:
                return jsonify({
                    'success': False,
                    'error': 'No audio file provided'
                })
            
            audio_file = request.files['audio']
            
            # For now, return a simple analysis since we can't easily process audio on server
            # In production, you'd use speech recognition services
            return jsonify({
                'success': True,
                'text': 'Audio received (server-side transcription not implemented)',
                'stress_level': 'Medium',
                'energy_level': 50.0,
                'message': 'Voice recording successful. Please use browser-based speech recognition for full analysis.'
            })
        else:
            # JSON data with transcript (from browser speech recognition)
            data = request.json
            transcript = data.get('transcript', '')
            
            if not transcript:
                return jsonify({
                    'success': False,
                    'error': 'No transcript provided'
                })
            
            # Simple stress analysis based on text
            word_count = len(transcript.split())
            stress_level = 'Low' if word_count < 10 else ('Medium' if word_count < 20 else 'High')
            
            return jsonify({
                'success': True,
                'text': transcript,
                'stress_level': stress_level,
                'energy_level': word_count * 5.0,
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        print(f"Error in voice analysis: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/get_recommendations', methods=['POST'])
def get_recommendations():
    """Get study recommendations based on emotion and stress"""
    try:
        data = request.json
        emotion = data.get('emotion', 'neutral')
        stress_level = data.get('stress_level')
        
        recommendations = study_recommender.get_recommendations(emotion, stress_level)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/session_history')
def session_history():
    """Get user session history"""
    try:
        sessions = []
        session_dir = 'data/user_sessions'
        
        if os.path.exists(session_dir):
            for filename in sorted(os.listdir(session_dir), reverse=True):
                if filename.endswith('.json'):
                    filepath = os.path.join(session_dir, filename)
                    with open(filepath, 'r') as f:
                        session_data = json.load(f)
                        sessions.append(session_data)
        
        return jsonify({
            'success': True,
            'sessions': sessions[:50]  # Return last 50 sessions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    print("Starting Emotion-Aware Study Assistant...")
    print("Server running at http://localhost:5000")
    app.run(debug=True, port=5000)

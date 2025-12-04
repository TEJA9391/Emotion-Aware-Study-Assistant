from flask import Flask, render_template, jsonify, request, session
import json
import os
import numpy as np
from datetime import datetime
from voice_analyzer import VoiceAnalyzer
from study_recommendations import StudyRecommendations
import base64
import cv2
import random

# Flag to track if real DeepFace is available
DEEPFACE_AVAILABLE = False

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("DeepFace loaded successfully!")
except ImportError:
    print("Warning: Could not import DeepFace. Using OpenCV-based emotion analysis.")
    
    class MockDeepFace:
        """Fallback emotion analyzer using OpenCV face detection and image analysis"""
        
        # Load OpenCV's pre-trained face detector
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        @staticmethod
        def analyze(img, actions=None, enforce_detection=True, detector_backend='opencv'):
            """Analyze image for emotions using OpenCV-based heuristics"""
            emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
            
            # Convert to grayscale for analysis
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
            
            # Detect faces
            faces = MockDeepFace.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                # No face detected - return neutral with some variation
                emotion_scores = {e: random.uniform(5, 15) for e in emotions}
                emotion_scores['neutral'] = random.uniform(40, 60)
            else:
                # Face detected - analyze based on image properties
                x, y, w, h = faces[0]
                face_roi = gray[y:y+h, x:x+w]
                
                # Calculate image metrics
                brightness = np.mean(face_roi)
                contrast = np.std(face_roi)
                
                # Generate emotion scores based on image analysis
                # Higher brightness tends toward happy, lower toward sad
                # Higher contrast could indicate surprise or anger
                
                base_scores = {
                    'happy': max(10, min(70, (brightness - 80) * 0.5 + random.uniform(10, 30))),
                    'sad': max(5, min(50, (150 - brightness) * 0.3 + random.uniform(5, 15))),
                    'surprise': max(5, min(40, (contrast - 40) * 0.5 + random.uniform(5, 15))),
                    'angry': max(5, min(35, (contrast - 30) * 0.4 + random.uniform(5, 12))),
                    'fear': max(3, min(25, random.uniform(5, 15))),
                    'disgust': max(2, min(20, random.uniform(3, 10))),
                    'neutral': max(10, min(50, (120 - abs(brightness - 120)) * 0.3 + random.uniform(10, 25)))
                }
                
                # Normalize to sum to 100
                total = sum(base_scores.values())
                emotion_scores = {k: (v / total) * 100 for k, v in base_scores.items()}
            
            # Find dominant emotion
            dominant = max(emotion_scores, key=emotion_scores.get)
            
            return [{
                'dominant_emotion': dominant,
                'emotion': emotion_scores,
                'face_detected': len(faces) > 0
            }]
    
    DeepFace = MockDeepFace()

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

# Global in-memory storage for sessions
# Data will be lost when server restarts
user_sessions = []

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
    """Analyze emotion from webcam image"""
    try:
        data = request.json
        image_data = data['image'].split(',')[1]
        
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
        
        # Create session data object
        session_data = {
            'emotion_analysis': emotion_result,
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
        
        # Save to in-memory list instead of file
        user_sessions.append(session_data)
        print("Emotion session saved to memory")
        
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
            
            # For now, return a simple analysis since we can't easily process audio on server
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
            
            voice_result = {
                'text': transcript,
                'stress_level': stress_level,
                'energy_level': word_count * 5.0,
                'timestamp': datetime.now().isoformat()
            }
            
            # Create session data object
            session_data = {
                'voice_analysis': voice_result,
                'timestamp': datetime.now().isoformat()
            }
            
            # Save to in-memory list instead of file
            user_sessions.append(session_data)
            print("Voice session saved to memory")
            
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
        emotion = data.get('emotion')
        
        recommendations = study_recommender.get_recommendations(emotion)
        
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
    """Get user session history from memory"""
    try:
        print("Session history route called")  # Debug
        
        # Return sessions sorted by timestamp (newest first)
        # We use a copy to avoid modifying the original list during sort
        sorted_sessions = sorted(
            user_sessions, 
            key=lambda x: x.get('timestamp', ''), 
            reverse=True
        )
        
        print(f"Returning {len(sorted_sessions)} sessions from memory")  # Debug
        
        return jsonify({
            'success': True,
            'sessions': sorted_sessions[:50]  # Return last 50 sessions
        })
        
    except Exception as e:
        print(f"Error in session_history: {str(e)}")  # Debug
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True)

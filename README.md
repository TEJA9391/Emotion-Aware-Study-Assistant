# Emotion-Aware Study Assistant

A Flask-based web application that analyzes your emotional state through facial recognition and voice analysis to provide personalized study recommendations.

## Features

- **Real-time Emotion Detection**: Uses DeepFace and TensorFlow to analyze facial expressions via webcam
- **Voice Tone Analysis**: Analyzes voice patterns and stress levels through microphone input
- **Personalized Study Recommendations**: Provides tailored study tips based on detected emotional state
- **Session History Dashboard**: Track all past analysis sessions with detailed breakdowns
- **Comprehensive Emotion Breakdown**: Shows percentage distribution of detected emotions

## Technologies Used

- **Backend**: Flask (Python)
- **Emotion Detection**: DeepFace, TensorFlow, OpenCV
- **Voice Analysis**: SpeechRecognition, PyAudio, Librosa
- **Frontend**: HTML, CSS, JavaScript
- **Data Storage**: JSON files for session history

## Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd folder1
```

2. **Create and activate virtual environment**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
pip install tf-keras  # Required for TensorFlow 2.20+
```

## Usage

### Start the Application

**Option 1: Using batch file**
```bash
run.bat
```

**Option 2: Manual start**
```bash
python app.py
```

The application will be available at `http://localhost:5000`

### Features Usage

1. **Emotion Analysis**
   - Click "Start Emotion Analysis"
   - Allow camera access
   - Look at webcam for 10 seconds
   - View results and recommendations

2. **Voice Analysis**
   - Click "Analyze Voice Tone"
   - Allow microphone access
   - Speak clearly for 5 seconds
   - View stress level and analysis

3. **Dashboard**
   - Click "View Dashboard"
   - See all past analysis sessions
   - Quick emotion/voice checks
   - View recommendations

## Project Structure

```
folder1/
├── app.py                      # Main Flask application
├── emotion_detector.py         # Emotion detection logic
├── voice_analyzer.py           # Voice analysis logic
├── study_recommendations.py    # Recommendation engine
├── requirements.txt            # Python dependencies
├── run.bat                     # Quick start script
├── templates/                  # HTML templates
│   ├── index.html
│   └── dashboard.html
├── static/                     # Static files
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
└── data/
    └── user_sessions/          # Saved analysis sessions
```

## Dependencies

- Flask >= 2.3.3
- opencv-python >= 4.8.1
- deepface >= 0.0.79
- tensorflow >= 2.13.0
- tf-keras (for TensorFlow 2.20+)
- SpeechRecognition >= 3.10.0
- pyaudio >= 0.2.11
- librosa >= 0.10.0
- numpy >= 1.24.3
- pillow >= 10.0.1
- matplotlib >= 3.7.2
- requests >= 2.31.0
- numba >= 0.56.0

## Session Data

All analysis sessions are automatically saved in `data/user_sessions/` as JSON files containing:
- Emotion analysis results with percentages
- Study recommendations
- Motivational quotes
- Recommended activities
- Timestamps

## Notes

- First run may take longer as DeepFace downloads required models
- Requires working webcam for emotion analysis
- Requires working microphone for voice analysis
- Chrome/Edge recommended for best camera/microphone support

## Author

Teja (tejrtej9347@gmail.com)

## License

MIT License

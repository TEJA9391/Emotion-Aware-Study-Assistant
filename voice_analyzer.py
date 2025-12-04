import speech_recognition as sr
import numpy as np
import librosa
from datetime import datetime

class VoiceAnalyzer:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = None
        # Lazy initialization of microphone to avoid crash if not available
        try:
            self.microphone = sr.Microphone()
        except Exception as e:
            print(f"Warning: Could not initialize microphone: {e}")
            print("Voice analysis will rely on browser-based speech recognition.")
    
    def analyze_voice_tone(self, duration=5):
        """Analyze voice tone and extract features"""
        if self.microphone is None:
            return {
                'text': 'Microphone not available',
                'energy_level': 0,
                'zero_crossing_rate': 0,
                'estimated_stress': 'Unknown',
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            with self.microphone as source:
                print("Adjusting for ambient noise...")
                self.recognizer.adjust_for_ambient_noise(source)
                print("Listening... Please speak for analysis")
                
                # Record audio
                audio = self.recognizer.listen(source, timeout=duration)
                
                # Convert to text
                try:
                    text = self.recognizer.recognize_google(audio)
                    print(f"Recognized text: {text}")
                except sr.UnknownValueError:
                    text = "Could not understand audio"
                except sr.RequestError:
                    text = "Error with speech recognition service"
                
                # Analyze audio features (simplified)
                audio_data = np.frombuffer(audio.get_raw_data(), dtype=np.int16)
                
                # Basic audio analysis
                energy = np.sum(audio_data ** 2)
                zero_crossing_rate = np.sum(np.diff(np.sign(audio_data)) != 0)
                
                # Estimate stress level based on energy and zero crossing rate
                stress_level = self.estimate_stress_level(energy, zero_crossing_rate)
                
                return {
                    'text': text,
                    'energy_level': float(energy),
                    'zero_crossing_rate': int(zero_crossing_rate),
                    'estimated_stress': stress_level,
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            print(f"Error in voice analysis: {e}")
            return None
    
    def estimate_stress_level(self, energy, zcr):
        """Estimate stress level based on audio features"""
        # Simplified stress estimation
        normalized_energy = min(energy / 1000000, 10)  # Normalize energy
        normalized_zcr = min(zcr / 1000, 10)  # Normalize ZCR
        
        stress_score = (normalized_energy + normalized_zcr) / 2
        
        if stress_score < 2:
            return "Low"
        elif stress_score < 5:
            return "Medium"
        else:
            return "High"
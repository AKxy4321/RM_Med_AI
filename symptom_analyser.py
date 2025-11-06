import os
import re
import json
from google import genai
from dotenv import load_dotenv
from datetime import datetime
from typing import List, Dict
from rapidfuzz import fuzz
import math

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class SymptomAnalyzer:
    """
    A basic AI-driven symptom analyzer for healthcare assistance.
    Analyzes symptoms, provides risk assessment, and recommends actions.
    """
    
    def __init__(self):

        self.symptom_severity = {
            # General / Constitutional
            'fever': 4, 'high fever': 7, 'very high fever': 8,
            'chills': 4, 'sweating': 3, 'fatigue': 2, 'severe fatigue': 5,
            'weakness': 3, 'extreme weakness': 6, 'weight loss': 4, 'rapid weight loss': 6,
            'loss of appetite': 2, 'night sweats': 5, 'malaise': 3,

            # Respiratory
            'cough': 3, 'productive cough': 4, 'dry cough': 3,
            'bloody cough': 8, 'shortness of breath': 7,
            'severe shortness of breath': 9, 'difficulty breathing': 8,
            'wheezing': 5, 'stridor': 9, 'rapid breathing': 7,
            'slow breathing': 8, 'apnea': 10, 'difficulty breathing while lying down': 8,

            # Cardiovascular
            'chest pain': 9, 'pressure in chest': 8, 'palpitations': 6,
            'irregular heartbeat': 7, 'syncope': 9, 'fainting': 7,
            'cold sweat': 6, 'leg swelling': 5, 'sudden leg swelling': 7,
            'calf pain': 6, 'bluish lips': 9, 'pallor': 6,
            'low blood pressure symptom': 8, 'high blood pressure symptom': 5,

            # Neurological
            'headache': 3, 'severe headache': 9, 'migraine': 6,
            'dizziness': 5, 'lightheadedness': 5, 'vertigo': 6,
            'confusion': 7, 'altered mental status': 9,
            'memory loss': 6, 'difficulty speaking': 8,
            'numbness': 6, 'weakness on one side': 9,
            'loss of coordination': 7, 'seizure': 9,
            'loss of consciousness': 10, 'tremor': 4, 'blurred vision': 6,
            'double vision': 7, 'slurred speech': 8,

            # Gastrointestinal
            'nausea': 3, 'vomiting': 5, 'persistent vomiting': 7,
            'blood in vomit': 9, 'diarrhea': 4, 'bloody diarrhea': 8,
            'black stool': 9, 'abdominal pain': 6, 'severe abdominal pain': 9,
            'bloating': 3, 'constipation': 3, 'loss of appetite': 2,
            'jaundice': 7, 'yellowing of skin': 7, 'fruity breath': 7,

            # Genitourinary
            'urinary frequency': 3, 'painful urination': 5,
            'difficulty urinating': 5, 'urinary retention': 8,
            'blood in urine': 7, 'flank pain': 7,
            'pelvic pain': 6, 'vaginal bleeding': 7,
            'heavy vaginal bleeding': 8, 'scrotal pain': 7,

            # Musculoskeletal
            'body aches': 3, 'muscle pain': 4, 'muscle weakness': 5,
            'joint pain': 4, 'joint swelling': 5, 'back pain': 4,
            'neck stiffness': 6, 'severe neck stiffness': 8,

            # Dermatologic / Allergic
            'rash': 3, 'hives': 6, 'itching': 3,
            'swelling': 6, 'facial swelling': 8, 'lips swelling': 8,
            'redness': 3, 'warmth': 4, 'pus': 6,
            'cellulitis signs': 7, 'blistering rash': 7,
            'peeling skin': 8, 'purple rash': 9,

            # ENT (Ear, Nose, Throat)
            'sore throat': 3, 'severe sore throat': 5,
            'difficulty swallowing': 7, 'runny nose': 2, 'sneezing': 1,
            'ear pain': 4, 'ear discharge': 6,
            'hearing loss': 6, 'hoarseness': 3,

            # Endocrine / Metabolic
            'extreme thirst': 5, 'polydipsia': 5, 'polyuria': 5,
            'confusion in diabetics': 8, 'cold intolerance': 3,
            'heat intolerance': 3, 'sweating episodes': 4,

            # Hematologic / Immune
            'easy bruising': 4, 'bleeding gums': 5,
            'nosebleed': 4, 'persistent bleeding': 8,
            'petechiae': 7, 'lymph node swelling': 4,
            'bleeding': 7, 'severe bleeding': 9, 'internal bleeding': 10,

            # Psychiatric
            'anxiety': 3, 'panic attack': 6,
            'hallucinations': 8, 'paranoia': 7, 'suicidal thoughts': 10
        }


    def feed_to_gemini(self, symptom_result: dict, human_input: str) -> str:
        """
        Prepare a Gemini-ready JSON payload for AI analysis.
        
        Args:
            symptom_result: Output from SymptomAnalyzer.analyze()
            human_input: Original text description from user
        
        Returns:
            JSON string ready to feed to Gemini
        """
        payload = {
            "timestamp": datetime.now().isoformat(),
            "human_input": human_input,
            "symptom_analysis": {
                "detected_symptoms": symptom_result.get("detected_symptoms", []),
                "severity_score": symptom_result.get("severity_score"),
                "severity_category": symptom_result.get("severity_category"),
            }
        }

        return json.dumps(payload, indent=2, ensure_ascii=False)

        
    def preprocess_input(self, text: str) -> List[str]:
        text = text.lower()
        text = re.sub(r'\b(i have|i feel|i am|feeling|experiencing|having|suffering from|with|and|but|the|a|an)\b', '', text)
        text = re.sub(r'[^a-z\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()

        detected = []
        for s in self.symptom_severity:
            score = fuzz.partial_ratio(s, text)
            if score > 80:
                detected.append(s)

        if not detected:
            return []

        detected_sorted = sorted(detected, key=lambda s: self.symptom_severity[s], reverse=True)

        final_symptoms = []
        for s in detected_sorted:
            overlapping = [fs for fs in final_symptoms if (s in fs or fs in s)]
            if not overlapping:
                final_symptoms.append(s)
            else:
                keep = s if self.symptom_severity[s] >= self.symptom_severity[overlapping[0]] else overlapping[0]
                if keep != overlapping[0]:
                    final_symptoms.remove(overlapping[0])
                    final_symptoms.append(keep)

        return final_symptoms
    
    def compute_severity_score(self, symptoms: List[str], age: int = None, duration_days: int = None) -> Dict:
        """
        Compute weighted severity score based on detected symptoms, duration, and age.
        Adjusts for single-symptom cases so one symptom doesn't dominate the result.
        """
        if not symptoms:
            return {"overall_score": 0, "category": "none"}

        p = 1.6
        severities = [self.symptom_severity[s] for s in symptoms]
        base_score = (sum(v ** p for v in severities) / len(severities)) ** (1 / p)

        if duration_days is not None:
            duration_factor = 1 + 0.4 * (1 - math.exp(-duration_days / 5))
        else:
            duration_factor = 1.0

        if age is not None:
            center_age = 32.5
            age_factor = 1 + 0.5 * ((abs(age - center_age) / center_age) ** 1.5)
            age_factor = min(age_factor, 1.5)
        else:
            age_factor = 1.0

        symptom_count = len(symptoms)
        if symptom_count == 1:
            symptom_factor = 0.6
        elif symptom_count > 1:
            symptom_factor = 1.0 - 0.05 * (symptom_count - 2)
            symptom_factor = max(symptom_factor, 0.8)

        final_score = base_score * duration_factor * age_factor * symptom_factor
        final_score = round(min(final_score, 10), 2)

        if final_score < 3:
            category = "low"
        elif final_score < 7:
            category = "moderate"
        else:
            category = "high"

        return {
            "overall_score": final_score,
            "category": category,
            "age_factor": age_factor,
            "duration_factor": duration_factor,
            "symptom_factor": symptom_factor,
        }
        
    def analyze(self, symptoms_input, age, duration_days) -> Dict:
        """
        Main analysis function.
        
        Args:
            symptoms_input: Text description of symptoms
            duration_days: How long symptoms have been present
            age: Patient age (optional)
            existing_conditions: List of pre-existing conditions (optional)
        
        Returns:
            Dictionary with analysis results and recommendations
        """
        symptoms = self.preprocess_input(symptoms_input)
        
        if not symptoms:
            return {
                'error': 'No recognizable symptoms detected. Please describe your symptoms more clearly.',
                'timestamp': datetime.now().isoformat()
            }

        severity_result = self.compute_severity_score(symptoms, age, duration_days)

        result = {
            'timestamp': datetime.now().isoformat(),
            'detected_symptoms': symptoms,
            'severity_score': severity_result['overall_score'],
            'severity_category': severity_result['category'],
            'age_factor': severity_result['age_factor'],
            'duration_factor': severity_result['duration_factor']
        }

        return result

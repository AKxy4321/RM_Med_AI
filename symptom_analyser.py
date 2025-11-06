import os
import re
import json
from google import genai
from dotenv import load_dotenv
from datetime import datetime
from typing import List, Dict, Tuple

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class SymptomAnalyzer:
    """
    A basic AI-driven symptom analyzer for healthcare assistance.
    Analyzes symptoms, provides risk assessment, and recommends actions.
    """
    
    def __init__(self):

        # Symptom severity baseline (1-10)
        self.symptom_severity = {
            'fever': 4, 'high fever': 7, 'chills': 4, 'sweating': 3,
            'cough': 3, 'bloody cough': 8, 'shortness of breath': 7,
            'severe shortness of breath': 9, 'chest pain': 9,
            'palpitations': 6, 'syncope': 9, 'headache': 3,
            'severe headache': 9, 'migraine': 6, 'dizziness': 5,
            'lightheadedness': 5, 'confusion': 7, 'altered mental status': 9,
            'nausea': 3, 'vomiting': 5, 'persistent vomiting': 7,
            'diarrhea': 4, 'bloody diarrhea': 8, 'abdominal pain': 6,
            'severe abdominal pain': 9, 'loss of appetite': 2,
            'rash': 3, 'hives': 6, 'itching': 3, 'swelling': 6,
            'facial swelling': 8, 'difficulty swallowing': 7,
            'sore throat': 3, 'runny nose': 2, 'sneezing': 1,
            'fatigue': 2, 'body aches': 3, 'muscle weakness': 5,
            'joint pain': 4, 'back pain': 4,
            'urinary frequency': 3, 'painful urination': 5,
            'blood in urine': 7, 'flank pain': 7,
            'leg swelling': 5, 'calf pain': 6,
            'redness': 3, 'warmth': 4, 'pus': 6, 'cellulitis signs': 7,
            'loss of consciousness': 10, 'seizure': 9,
            'fainting': 7, 'difficulty breathing while lying down': 8,
            'jaundice': 7, 'yellowing of skin': 7,
            'rapid breathing': 7, 'slow breathing': 8, 'apnea': 10,
            'fruity breath': 7, 'polydipsia': 5, 'polyuria': 5,
            'confusion in diabetics': 8, 'extreme thirst': 5,
            'cold sweat': 6, 'pallor': 6,
            'high blood pressure symptom': 5, 'low blood pressure symptom': 8,
            'blood in vomit': 9, 'black stool': 9
        }
        
        # Common conditions based on symptom patterns
        self.conditions = {
            'common_cold': {
                'symptoms': ['cough', 'sore throat', 'runny nose', 'sneezing', 'mild fever'],
                'care_level': 'self-care',
                'advice': 'Rest, stay hydrated, OTC medications. Usually resolves in 7-10 days.'
            },
            'influenza': {
                'symptoms': ['fever', 'chills', 'sweating', 'body aches', 'fatigue', 'cough', 'headache'],
                'care_level': 'home-care/medical advice if severe',
                'advice': 'Rest, hydration, antipyretics. Seek doctor if high fever or breathing difficulty.'
            },
            'pneumonia': {
                'symptoms': ['cough', 'fever', 'shortness of breath', 'chest pain', 'productive cough'],
                'care_level': 'medical',
                'advice': 'Seek doctor evaluation. Antibiotics may be needed. Rest and hydration.'
            },
            'asthma_exacerbation': {
                'symptoms': ['shortness of breath', 'wheezing', 'chest tightness', 'difficulty breathing while lying down'],
                'care_level': 'medical/emergency if severe',
                'advice': 'Use inhaler as prescribed, seek immediate medical attention if symptoms worsen.'
            },
            'myocardial_infarction': {
                'symptoms': ['chest pain', 'pressure in chest', 'shortness of breath', 'cold sweat', 'nausea', 'lightheadedness'],
                'care_level': 'emergency',
                'advice': 'Call emergency services immediately. Do not drive yourself.'
            },
            'stroke': {
                'symptoms': ['sudden weakness', 'facial droop', 'slurred speech', 'loss of vision', 'confusion', 'sudden severe headache'],
                'care_level': 'emergency',
                'advice': 'Call emergency services immediately. Early intervention is critical.'
            },
            'hypertensive_crisis': {
                'symptoms': ['headache', 'chest pain', 'shortness of breath', 'confusion', 'nausea', 'blurred vision', 'high blood pressure symptom'],
                'care_level': 'emergency',
                'advice': 'Seek immediate medical attention. Do not attempt to self-medicate.'
            },
            'hypotensive_crisis': {
                'symptoms': ['dizziness', 'fainting', 'low blood pressure symptom', 'pale and clammy'],
                'care_level': 'emergency',
                'advice': 'Lay patient down, elevate legs, seek urgent medical care.'
            },
            'severe_allergic_reaction': {
                'symptoms': ['facial swelling', 'hives', 'difficulty swallowing', 'airway obstruction', 'anaphylaxis'],
                'care_level': 'emergency',
                'advice': 'Use epinephrine if prescribed, call emergency services immediately.'
            },
            'appendicitis': {
                'symptoms': ['severe abdominal pain', 'nausea', 'vomiting', 'loss of appetite', 'mild fever'],
                'care_level': 'medical',
                'advice': 'Seek immediate medical evaluation. Surgery may be required.'
            },
            'gastroenteritis': {
                'symptoms': ['diarrhea', 'vomiting', 'abdominal pain', 'nausea', 'mild fever', 'dehydration signs'],
                'care_level': 'self-care/medical if severe',
                'advice': 'Hydrate, rest, oral rehydration solution. Seek doctor if blood in stool or severe dehydration.'
            },
            'urinary_tract_infection': {
                'symptoms': ['painful urination', 'urinary frequency', 'flank pain', 'blood in urine', 'fever'],
                'care_level': 'medical',
                'advice': 'Seek doctor for antibiotics. Drink plenty of water.'
            },
            'deep_vein_thrombosis': {
                'symptoms': ['calf pain', 'leg swelling', 'warmth', 'redness'],
                'care_level': 'medical/emergency if pulmonary embolism suspected',
                'advice': 'Seek urgent medical evaluation. Avoid massaging the limb.'
            },
            'diabetic_emergency': {
                'symptoms': ['confusion in diabetics', 'fruity breath', 'extreme thirst', 'polyuria', 'nausea', 'vomiting'],
                'care_level': 'emergency',
                'advice': 'Check blood glucose immediately, seek urgent medical care if very high or low.'
            },
            'severe_dehydration': {
                'symptoms': ['extreme thirst', 'dry mouth', 'dizziness', 'confusion', 'sunken eyes', 'low blood pressure symptom'],
                'care_level': 'emergency if severe',
                'advice': 'Administer oral rehydration solution, seek urgent medical care if unable to drink or hypotensive.'
            },
            'seizure_status': {
                'symptoms': ['ongoing seizures', 'uncontrolled seizure', 'loss of consciousness'],
                'care_level': 'emergency',
                'advice': 'Ensure patient safety, call emergency services. Administer emergency anti-seizure medication if prescribed.'
            },
            'migraine': {
                'symptoms': ['headache', 'nausea', 'sensitivity to light', 'vomiting', 'migraine'],
                'care_level': 'home-care/medical if severe',
                'advice': 'Rest in a quiet dark room, use prescribed migraine medication.'
            },
            'burns_severe': {
                'symptoms': ['full thickness burn', 'severe burns', 'shock signs', 'pain', 'blisters'],
                'care_level': 'emergency',
                'advice': 'Call emergency services. Cool burn if minor, do not apply ointments on severe burns.'
            },
            'minor_burn': {
                'symptoms': ['pain', 'redness', 'blisters', 'swelling'],
                'care_level': 'self-care',
                'advice': 'Cool with running water, clean gently, apply sterile dressing. Seek medical care if worsening.'
            },
            'cellulitis': {
                'symptoms': ['redness', 'warmth', 'swelling', 'pus', 'cellulitis signs', 'fever'],
                'care_level': 'medical',
                'advice': 'Seek doctor for antibiotics. Keep area elevated and clean.'
            },
            'vomiting_illness': {
                'symptoms': ['nausea', 'vomiting', 'persistent vomiting', 'abdominal pain'],
                'care_level': 'self-care/medical if severe',
                'advice': 'Hydrate, avoid solid foods temporarily. Seek medical attention if persistent or blood in vomit.'
            },
            'jaundice': {
                'symptoms': ['yellowing of skin', 'jaundice', 'fatigue', 'abdominal pain'],
                'care_level': 'medical',
                'advice': 'Seek doctor for liver function tests. Avoid alcohol and hepatotoxic drugs.'
            },
            'hypothermia': {
                'symptoms': ['cold sweat', 'shivering', 'confusion', 'slow breathing'],
                'care_level': 'emergency',
                'advice': 'Move to warm environment, cover with blankets, seek urgent medical care.'
            },
            'hyperthermia': {
                'symptoms': ['high fever', 'confusion', 'rapid breathing', 'dehydration signs'],
                'care_level': 'emergency if severe',
                'advice': 'Cool patient with lukewarm water, hydrate, seek urgent medical care if fever >104°F or altered consciousness.'
            },
            'suicidal_risk': {
                'symptoms': ['suicidal thoughts', 'active suicidal intent', 'attempted self-harm', 'severe depression signs'],
                'care_level': 'emergency',
                'advice': 'Do not leave person alone. Contact mental health professionals or emergency services immediately.'
            },
            'gastrointestinal_bleeding': {
                'symptoms': ['blood in stool', 'black tarry stool', 'blood in vomit', 'severe abdominal pain'],
                'care_level': 'emergency',
                'advice': 'Call emergency services. Do not take NSAIDs. Seek immediate medical evaluation.'
            },
            'choking': {
                'symptoms': ['airway obstruction', 'choking', 'difficulty breathing', 'cyanosis'],
                'care_level': 'emergency',
                'advice': 'Perform Heimlich maneuver if trained, call emergency services immediately.'
            }
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
                "severity_score": symptom_result.get("severity_score", None),
                "risk_level": symptom_result.get("risk_level", None),
                "possible_conditions": [
                    {
                        "condition": cond["condition"],
                        "match_score": cond["match_score"],
                        "care_level": cond["care_level"],
                        "advice": cond["advice"]
                    }
                    for cond in symptom_result.get("possible_conditions", [])
                ],
            },
            "disclaimer": symptom_result.get("disclaimer", "")
        }
        
        return json.dumps(payload, indent=2, ensure_ascii=False)
        
    def preprocess_input(self, text: str) -> List[str]:
        """Extract symptoms and remove duplicates if a severe version exists."""
        text = text.lower()
        text = re.sub(r'\b(i have|i feel|experiencing|feeling)\b', '', text)

        # Step 1: detect all symptoms
        detected = [s for s in self.symptom_severity if re.search(rf'\b{s}\b', text)]
        if not detected:
            return []

        # Step 2: remove less severe duplicates
        # Sort by severity descending
        detected_sorted = sorted(detected, key=lambda s: self.symptom_severity[s], reverse=True)
        final_symptoms = []

        for s in detected_sorted:
            # If a base version already exists in final_symptoms, skip
            base_included = any(s in fs or fs in s for fs in final_symptoms)
            if not base_included:
                final_symptoms.append(s)

        return final_symptoms
    
    def calculate_severity_score(self, symptoms: List[str], age: int = None, duration_days: int = 0) -> Tuple[float, str]:
        """Compute severity score with dynamic multipliers for duration and age."""
        if not symptoms:
            return 0, 'unknown'

        # Base severity average
        base_scores = [self.symptom_severity[s] for s in symptoms]
        avg_score = sum(base_scores) / len(base_scores)

        # Multiplier for multiple symptoms (minor bump)
        if len(symptoms) >= 4:
            avg_score *= 1.1

        # Duration multiplier (gradual escalation up to x1.4)
        # Safe range: no multiplier for <2 days, moderate increase for chronic cases
        if duration_days <= 2:
            duration_mult = 1.0
        elif duration_days <= 5:
            duration_mult = 1.05
        elif duration_days <= 10:
            duration_mult = 1.15
        elif duration_days <= 20:
            duration_mult = 1.25
        else:
            duration_mult = 1.4  # upper bound for long-term/chronic

        # Age multiplier (nonlinear, minimal for mid-age, higher for extremes)
        if age is None:
            age_mult = 1.0
        elif age < 1:
            age_mult = 1.4
        elif age < 5:
            age_mult = 1.25
        elif age < 18:
            age_mult = 1.1
        elif age < 60:
            age_mult = 1.0
        elif age < 75:
            age_mult = 1.15
        else:
            age_mult = 1.25

        # Apply combined scaling
        adjusted_score = avg_score * duration_mult * age_mult

        # Cap to 10 to prevent false emergencies
        adjusted_score = min(adjusted_score, 10)

        # Risk stratification thresholds
        if adjusted_score >= 8.0:
            risk = 'high'
        elif adjusted_score >= 5.0:
            risk = 'moderate'
        else:
            risk = 'low'

        return round(adjusted_score, 1), risk
    
    def match_condition(self, symptoms: List[str]) -> List[Dict]:
        """Match symptoms to conditions using overlap ratio."""
        matches = []
        user_set = set(symptoms)
        for name, data in self.conditions.items():
            cond_set = set(data['symptoms'])
            overlap = len(user_set & cond_set)
            score = (overlap / len(cond_set)) * 100
            if score > 30:
                matches.append({
                    'condition': name.replace('_', ' ').title(),
                    'match_score': round(score,1),
                    'care_level': data['care_level'],
                    'advice': data['advice']
                })
        return sorted(matches, key=lambda x: x['match_score'], reverse=True)
    
    def get_recommendation(self, risk_level: str) -> Dict:
        recs = {
            'emergency': {'action': '🚨 CALL EMERGENCY SERVICES IMMEDIATELY', 'urgency':'IMMEDIATE'},
            'high': {'action': '⚠️ Seek urgent medical care', 'urgency':'URGENT'},
            'moderate': {'action': '📅 Schedule doctor appointment soon', 'urgency':'SOON'},
            'low': {'action': '🏠 Self-care and monitor', 'urgency':'NON-URGENT'}
        }
        return recs.get(risk_level, recs['moderate'])
        
    def analyze(self, symptoms_input: str, duration_days: int = 0, 
                age: int = None, existing_conditions: List[str] = None) -> Dict:
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
        # Extract symptoms
        symptoms = self.preprocess_input(symptoms_input)
        
        if not symptoms:
            return {
                'error': 'No recognizable symptoms detected. Please describe your symptoms more clearly.',
                'timestamp': datetime.now().isoformat()
            }
        
        # Calculate severity
        severity_score, risk_level = self.calculate_severity_score(symptoms)
        
        # Match to conditions
        possible_conditions = self.match_condition(symptoms)
        
        # Get recommendations
        recommendation = self.get_recommendation(risk_level)
        
        # Build result
        result = {
            'timestamp': datetime.now().isoformat(),
            'detected_symptoms': symptoms,
            'severity_score': severity_score,
            'risk_level': risk_level.upper(),
            'recommendation': recommendation,
            'possible_conditions': possible_conditions[:3],  # Top 3 matches
            'disclaimer': '⚕️ This is not a medical diagnosis. Always consult healthcare professionals for proper medical advice.'
        }
        
        # Add lifestyle suggestions for low-risk cases
        if risk_level in ['low', 'moderate']:
            result['lifestyle_tips'] = self.get_lifestyle_tips(symptoms)
        
        return result
    
    def get_lifestyle_tips(self, symptoms: List[str]) -> List[str]:
        tips = []

        if any(s in symptoms for s in ['fever','fatigue','body aches']):
            tips.append('💧 Stay hydrated and rest')
        if any(s in symptoms for s in ['cough','sore throat','runny nose']):
            tips.append('🍯 Warm liquids and throat care')
        if any(s in symptoms for s in ['nausea','vomiting','diarrhea']):
            tips.append('🥨 Bland diet and fluids')
        if any(s in symptoms for s in ['rash','hives','itching']):
            tips.append('🧴 Gentle skincare, avoid scratching')
        if any(s in symptoms for s in ['confusion','dizziness']):
            tips.append('🧠 Take breaks and monitor symptoms')
        
        tips.append('🧼 Wash hands and practice hygiene')
        tips.append('🏋️‍♂️ Moderate exercise if able')

        return tips


if __name__ == "__main__":
    analyzer = SymptomAnalyzer()

    # Example 1: chest pain
    symptoms_input = "I have a chest pain and severe headache"
    result = analyzer.analyze(
        symptoms_input=symptoms_input,
        duration_days=2,
        age=30
    )

    prompt = f"""
    You are a highly knowledgeable medical assistant with access to a broad medical knowledge base. 
    Analyze the following symptom analysis JSON and provide a clear, user-friendly summary.

    Instructions:
    1. Treat the JSON as reference, but generate your own complete assessment.
    2. List detected symptoms clearly.
    3. Identify possible conditions or causes relevant to the symptoms.
    4. Provide recommendations in plain language, emphasizing safety and urgency as needed.
    5. Include lifestyle or self-care tips where appropriate.
    6. Format the output for readability:
    - Use bullet points for symptoms, conditions, recommendations, and tips.
    - Include emojis for clarity.
    - Keep sentences short and concise.
    - Provide a one-line overall summary at the end.
    7. Do NOT mention or comment on missing conditions or discrepancies from the JSON.

    Human input:
    {symptoms_input}

    JSON input:
    {analyzer.feed_to_gemini(result, symptoms_input)}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    print(response.text)

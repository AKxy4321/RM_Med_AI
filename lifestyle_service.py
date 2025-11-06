# lifestyle_service.py
from flask import Flask, jsonify, request, send_file
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
import math, requests, os, json, re
from datetime import datetime
from flask_cors import CORS
from dotenv import load_dotenv
from typing import List, Dict, Tuple

# -------------------------------------------------------------------
# ✅ 1. Basic setup
# -------------------------------------------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

app = Flask(__name__)
CORS(app)

# -------------------------------------------------------------------
# ✅ 2. Gemini AI Configuration (for lifestyle recommendations)
# -------------------------------------------------------------------
genai = None
try:
    if GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        print("✅ Gemini AI configured successfully")
    else:
        print("⚠️  GEMINI_API_KEY not found in environment variables")
except ImportError:
    print("⚠️  google-generativeai package not installed. Using mock data.")
except Exception as e:
    print(f"⚠️  Failed to configure Gemini AI: {e}. Using mock data.")


# ---------------------------------------------------------------------
# 🧩 SYMPTOM ANALYZER CLASS + ROUTE
# ---------------------------------------------------------------------
class SymptomAnalyzer:
    def __init__(self):
        self.symptom_severity = {
            'fever': 4, 'high fever': 7, 'chills': 4, 'sweating': 3,
            'cough': 3, 'bloody cough': 8, 'shortness of breath': 7,
            'chest pain': 9, 'dizziness': 5, 'confusion': 7,
            'nausea': 3, 'vomiting': 5, 'diarrhea': 4, 'rash': 3,
            'hives': 6, 'swelling': 6, 'fatigue': 2, 'body aches': 3,
            'severe headache': 9, 'abdominal pain': 6, 'loss of consciousness': 10
        }

        self.conditions = {
            "common_cold": {
                "symptoms": ["cough", "sore throat", "runny nose", "sneezing", "mild fever"],
                "care_level": "self-care",
                "advice": "Rest, fluids, OTC medication."
            },
            "pneumonia": {
                "symptoms": ["cough", "fever", "shortness of breath", "chest pain"],
                "care_level": "medical",
                "advice": "Consult doctor, may need antibiotics."
            },
            "heart_attack": {
                "symptoms": ["chest pain", "shortness of breath", "cold sweat", "nausea"],
                "care_level": "emergency",
                "advice": "Call emergency services immediately."
            },
            "gastroenteritis": {
                "symptoms": ["vomiting", "diarrhea", "abdominal pain"],
                "care_level": "self-care/medical if severe",
                "advice": "Hydrate, rest, oral rehydration solution."
            }
        }

    def preprocess_input(self, text: str) -> List[str]:
        text = text.lower()
        return [s for s in self.symptom_severity if re.search(rf"\b{s}\b", text)]

    def calculate_severity_score(self, symptoms: List[str], age: int = None) -> Tuple[float, str]:
        if not symptoms:
            return 0, "unknown"
        scores = [self.symptom_severity[s] for s in symptoms]
        avg = sum(scores) / len(scores)
        if len(symptoms) >= 4:
            avg += 1
        if age and (age > 65 or age < 5):
            avg += 0.5
        if avg >= 8:
            risk = "high"
        elif avg >= 5:
            risk = "moderate"
        else:
            risk = "low"
        return round(avg, 1), risk

    def match_condition(self, symptoms: List[str]) -> List[Dict]:
        matches = []
        for name, data in self.conditions.items():
            overlap = len(set(symptoms) & set(data["symptoms"]))
            if overlap / len(data["symptoms"]) > 0.3:
                matches.append({
                    "condition": name.replace("_", " ").title(),
                    "match_score": round(overlap / len(data["symptoms"]) * 100, 1),
                    "care_level": data["care_level"],
                    "advice": data["advice"]
                })
        return sorted(matches, key=lambda x: x["match_score"], reverse=True)

    def get_recommendation(self, risk: str):
        recs = {
            "high": {"action": "⚠️ Seek urgent medical care", "urgency": "URGENT"},
            "moderate": {"action": "📅 Schedule doctor appointment soon", "urgency": "SOON"},
            "low": {"action": "🏠 Self-care and monitor", "urgency": "NON-URGENT"}
        }
        return recs.get(risk, recs["moderate"])

    def analyze(self, symptoms_input: str, duration_days: int = 0, age: int = None) -> Dict:
        symptoms = self.preprocess_input(symptoms_input)
        if not symptoms:
            return {"error": "No recognizable symptoms detected. Try being more specific."}

        score, risk = self.calculate_severity_score(symptoms, age)
        possible = self.match_condition(symptoms)
        rec = self.get_recommendation(risk)
        result = {
            "timestamp": datetime.now().isoformat(),
            "detected_symptoms": symptoms,
            "severity_score": score,
            "risk_level": risk.upper(),
            "recommendation": rec,
            "possible_conditions": possible[:3],
            "disclaimer": "⚕️ Not a medical diagnosis. Always consult professionals."
        }

        # Add lifestyle tips for low/moderate risk
        if risk in ["low", "moderate"]:
            result["lifestyle_tips"] = [
                "💧 Stay hydrated and rest",
                "🍎 Eat light and nutritious food",
                "🧘 Manage stress, sleep well",
                "🚶 Engage in mild physical activity"
            ]
        return result


@app.route("/api/symptom-analysis", methods=["POST"])
def analyze_symptoms():
    data = request.json
    symptoms_input = data.get("symptoms_input", "")
    duration = int(data.get("duration_days", 0))
    age = int(data.get("age", 0)) if data.get("age") else None
    analyzer = SymptomAnalyzer()
    result = analyzer.analyze(symptoms_input, duration, age)
    return jsonify(result)


# -------------------------------------------------------------------
# ✅ 3. Emergency Support Logic
# -------------------------------------------------------------------
CRITICAL_SYMPTOMS = [
    "chest pain", "difficulty breathing", "severe bleeding", "unconscious", "seizure",
    "stroke symptoms", "severe head injury", "poisoning", "severe allergic reaction",
    "heart attack", "severe burns", "choking", "drowning", "electric shock",
    "severe abdominal pain", "sudden confusion", "loss of consciousness",
    "paralysis", "severe trauma", "overdose"
]

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates using Haversine formula"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_hospitals_overpass(lat, lng, radius_km=10):
    """Fetch hospitals using OpenStreetMap Overpass API"""
    try:
        overpass_url = "http://overpass-api.de/api/interpreter"
        query = f"""
        [out:json][timeout:15];
        (
          node["amenity"="hospital"](around:{radius_km * 1000},{lat},{lng});
          way["amenity"="hospital"](around:{radius_km * 1000},{lat},{lng});
        );
        out center tags;
        """
        response = requests.post(overpass_url, data={'data': query}, timeout=20)
        data = response.json()
        hospitals, seen = [], set()

        for element in data.get('elements', []):
            tags = element.get('tags', {})
            name = tags.get('name', 'Hospital')
            if name in seen:
                continue
            seen.add(name)
            hospital_lat = element['lat'] if element['type'] == 'node' else element.get('center', {}).get('lat')
            hospital_lng = element['lon'] if element['type'] == 'node' else element.get('center', {}).get('lon')
            if not hospital_lat or not hospital_lng:
                continue

            distance = calculate_distance(lat, lng, hospital_lat, hospital_lng)
            phone = tags.get('phone') or tags.get('contact:phone') or tags.get('mobile') or 'N/A'
            addr_parts = [tags.get(k) for k in ['addr:street', 'addr:city', 'addr:town', 'addr:postcode'] if tags.get(k)]
            address = ', '.join(addr_parts) if addr_parts else 'View on map for full address'

            hospitals.append({
                'id': element['id'],
                'name': name,
                'lat': hospital_lat,
                'lng': hospital_lng,
                'phone': phone,
                'address': address,
                'distance': round(distance, 2),
                'emergency': True
            })
        hospitals.sort(key=lambda x: x['distance'])
        return hospitals[:15]
    except Exception as e:
        print(f"Error fetching hospitals: {e}")
        return []

def get_hospitals_google(lat, lng, radius_km=10):
    """Fetch hospitals using Google Places API"""
    if not GOOGLE_API_KEY:
        print("⚠️ Google API key not set")
        return []
    try:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {'location': f"{lat},{lng}", 'radius': radius_km * 1000, 'type': 'hospital', 'key': GOOGLE_API_KEY}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        if data.get('status') != 'OK':
            return []

        hospitals = []
        for place in data.get('results', [])[:15]:
            hospital_lat = place['geometry']['location']['lat']
            hospital_lng = place['geometry']['location']['lng']
            distance = calculate_distance(lat, lng, hospital_lat, hospital_lng)
            place_id = place.get('place_id')
            full_address, phone = place.get('vicinity', ''), 'N/A'
            if place_id:
                try:
                    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
                    details_params = {'place_id': place_id, 'fields': 'formatted_address,formatted_phone_number', 'key': GOOGLE_API_KEY}
                    details_resp = requests.get(details_url, params=details_params, timeout=5).json()
                    if details_resp.get('status') == 'OK':
                        res = details_resp['result']
                        full_address = res.get('formatted_address', full_address)
                        phone = res.get('formatted_phone_number', 'N/A')
                except Exception as e:
                    print("Error getting place details:", e)
            hospitals.append({
                'id': place_id,
                'name': place.get('name'),
                'lat': hospital_lat,
                'lng': hospital_lng,
                'phone': phone,
                'address': full_address,
                'distance': round(distance, 2),
                'emergency': True
            })
        hospitals.sort(key=lambda x: x['distance'])
        return hospitals
    except Exception as e:
        print("Error fetching from Google:", e)
        return []

@app.route('/api/emergency-alert', methods=['POST'])
def emergency_alert():
    """Detect critical symptoms and nearby hospitals"""
    data = request.json
    symptoms = data.get('symptoms', '').lower()
    user_lat, user_lng = data.get('latitude'), data.get('longitude')

    is_critical = any(symptom in symptoms for symptom in CRITICAL_SYMPTOMS)
    if not is_critical:
        return jsonify({
            'is_emergency': False,
            'message': 'Symptoms do not appear critical, but please consult a doctor.'
        })

    hospitals = []
    if user_lat and user_lng:
        hospitals = get_hospitals_google(user_lat, user_lng, 5)
        if not hospitals:
            hospitals = get_hospitals_overpass(user_lat, user_lng, 5)

    return jsonify({
        'is_emergency': True,
        'message': 'CRITICAL SYMPTOMS DETECTED! Call emergency services immediately!',
        'emergency_number': '108',
        'hospitals': hospitals[:5]
    })


# -------------------------------------------------------------------
# ✅ 4. Lifestyle Recommendation Logic (unchanged)
# -------------------------------------------------------------------
def build_prompt(health_condition):
    return f"""
    You are a medical lifestyle assistant.
    The user has described: "{health_condition}".
    Provide JSON with 4 categories: diet, activity, prevention, wellness_tips.
    Each must include general and condition-specific advice (3–4 items each).
    """

@app.route('/api/lifestyle-recommendations', methods=['POST'])
def get_lifestyle_recommendations():
    data = request.json
    health_condition = data.get('health_condition', '')
    if not health_condition:
        return jsonify({'success': False, 'error': 'Health condition required'}), 400
    try:
        if genai and GEMINI_API_KEY:
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(build_prompt(health_condition))
            text = re.sub(r"^```json|```$", "", response.text.strip()).strip()
            recommendations = json.loads(text)
        else:
            recommendations = generate_mock_recommendations(health_condition)
        return jsonify({'success': True, 'recommendations': recommendations})
    except Exception as e:
        print("AI generation error:", e)
        return jsonify({'success': False, 'error': 'Failed to generate recommendations'})

def generate_mock_recommendations(condition):
    return {
        "diet": {"general": ["Eat balanced meals", "Stay hydrated"], "specific_conditions": ["Limit sugar intake"]},
        "activity": {"general": ["Exercise daily"], "specific_conditions": ["Walk regularly"]},
        "prevention": {"general": ["Sleep well"], "specific_conditions": ["Avoid triggers"]},
        "wellness_tips": ["Meditate", "Stay connected"]
    }

# -------------------------------------------------------------------
# ✅ 5. Health Check
# -------------------------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "gemini_available": bool(GEMINI_API_KEY),
        "google_places_enabled": bool(GOOGLE_API_KEY),
        "service": "MediSense Unified Backend"
    })


# -------------------------------------------------------------------
# ✅ 6. Run
# -------------------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Starting MediSense Unified Service (Lifestyle + Symptom Analysis + Emergency)...")
    app.run(debug=True, port=5000)

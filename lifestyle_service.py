# lifestyle_service.py
from flask import Flask, jsonify, request
import google.generativeai as genai
import math, requests, os, json, re
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

app = Flask(__name__)
CORS(app)

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
        hospitals = get_hospitals_overpass(user_lat, user_lng, 5)

    return jsonify({
        'is_emergency': True,
        'message': 'CRITICAL SYMPTOMS DETECTED! Call emergency services immediately!',
        'emergency_number': '108',
        'hospitals': hospitals[:5]
    })

@app.route('/api/lifestyle-recommendations', methods=['POST'])
def get_lifestyle_recommendations():
    data = request.json
    health_condition = data.get('health_condition', '')
    if not health_condition:
        return jsonify({'success': False, 'error': 'Health condition required'}), 400
    try:
        if genai and GEMINI_API_KEY:
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(f"""
                You are a medical lifestyle assistant.
                The user has described: "{health_condition}".
                Provide JSON with 4 categories: diet, activity, prevention, wellness_tips.
                Each must include general and condition-specific advice (3–4 items each).
                """)
            text = re.sub(r"^```json|```$", "", response.text.strip()).strip()
            recommendations = json.loads(text)
        else:
            recommendations = {
            "diet": {"general": ["Eat balanced meals", "Stay hydrated"], "specific_conditions": ["Limit sugar intake"]},
            "activity": {"general": ["Exercise daily"], "specific_conditions": ["Walk regularly"]},
            "prevention": {"general": ["Sleep well"], "specific_conditions": ["Avoid triggers"]},
            "wellness_tips": ["Meditate", "Stay connected"]
        }
        return jsonify({'success': True, 'recommendations': recommendations})
    except Exception as e:
        print("AI generation error:", e)
        return jsonify({'success': False, 'error': 'Failed to generate recommendations'})

if __name__ == "__main__":
    print("🚀 Starting MediSense Unified Service (Lifestyle + Symptom Analysis + Emergency)...")
    app.run(debug=True, port=5000)

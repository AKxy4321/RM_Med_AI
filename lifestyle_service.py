# lifestyle_service.py
from flask import Flask, jsonify, request
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

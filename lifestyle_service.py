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
from symptom_analyser import SymptomAnalyzer
import google.generativeai as genai


# -------------------------------------------------------------------
# ✅ 1. Basic setup
# -------------------------------------------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# ✅ Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini AI configured successfully")
else:
    print("⚠️ GEMINI_API_KEY not found in environment variables")

analyzer = SymptomAnalyzer()


app = Flask(__name__)
CORS(app)

# -------------------------------------------------------------------
# ✅ 2. Gemini AI Configuration
# -------------------------------------------------------------------
try:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        print("✅ Gemini AI configured successfully")
    else:
        print("⚠️ GEMINI_API_KEY not found in environment variables")
except Exception as e:
    print(f"⚠️ Gemini AI not available: {e}")
    genai = None


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
            "risk_score_section": f"Risk Level: {risk.upper()} | Severity Score: {score}/10",
            "recommendation": rec,
            "possible_conditions": possible[:3],
            "disclaimer": "⚕️ This is not a medical diagnosis. Always consult professionals."
        }

        if risk in ["low", "moderate"]:
            result["lifestyle_tips"] = [
                "💧 Stay hydrated and rest",
                "🍎 Eat light and nutritious food",
                "🧘 Manage stress, sleep well",
                "🚶 Engage in mild physical activity"
            ]
        return result


# -------------------------------------------------------------------
# 🧠 SYMPTOM ANALYSIS ROUTE
# -------------------------------------------------------------------
@app.route('/api/symptom-analysis', methods=['POST'])
def analyze_symptoms():
    try:
        data = request.get_json()
        if not data or 'symptoms_input' not in data:
            return jsonify({'error': 'Invalid input. Missing "symptoms_input".'}), 400

        symptoms_input = data.get('symptoms_input', '')
        duration_days = int(data.get('duration_days', 0))
        age = int(data.get('age', 1)) if data.get('age') else None

        # Run analyzer
        result = analyzer.analyze(symptoms_input)
        result.setdefault("severity_score", 0)
        result.setdefault("risk_level", "UNKNOWN")

        # === Gemini AI prompt ===
        prompt = f"""
        You are a medically trained AI assistant with advanced reasoning.
        Read the JSON symptom analysis and provide a short, plain-English summary that sounds human.

        CONTEXT:
        - Patient age: {age if age is not None else "Not provided"}
        - Duration: {duration_days} days
        Symptoms: {symptoms_input}
        JSON Data: {json.dumps(result, indent=2)}

        RULES:
        1. No bullet points or markdown.
        2. Keep it under 180 words.
        3. End with:
           Final severity score: [X/10]
           Final risk assessment: [LOW / MODERATE / HIGH]
           This summary is informational and not a substitute for professional medical evaluation.
        """

        ai_summary = None
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            gemini_response = model.generate_content(prompt)
            ai_summary = gemini_response.text.strip() if hasattr(gemini_response, "text") else None
        except Exception as e:
            ai_summary = f"(Gemini unavailable: {e})"

        result["ai_summary"] = ai_summary or "(No AI summary returned.)"

        # Parse severity and risk if AI updated them
        updated_risk, updated_score = None, None
        if ai_summary:
            score_match = re.search(r"final severity score:\s*([0-9]+(?:\.[0-9]+)?)/?10", ai_summary.lower())
            if score_match:
                updated_score = float(score_match.group(1))
                updated_score = min(max(updated_score, 0), 10)

            risk_match = re.search(r"final risk assessment:\s*(low|moderate|medium|high)", ai_summary.lower())
            if risk_match:
                word = risk_match.group(1)
                updated_risk = {"low": "LOW", "moderate": "MODERATE", "medium": "MODERATE", "high": "HIGH"}.get(word)

        if updated_score is not None:
            result["severity_score"] = round(updated_score, 1)
        if updated_risk:
            result["risk_level"] = updated_risk

        result["risk_score"] = result["severity_score"]

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_hospitals_overpass(lat, lng, radius_km=10):
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
            hospitals.append({
                'id': element['id'],
                'name': name,
                'lat': hospital_lat,
                'lng': hospital_lng,
                'distance': round(distance, 2)
            })
        hospitals.sort(key=lambda x: x['distance'])
        return hospitals[:15]
    except Exception as e:
        print(f"Error fetching hospitals: {e}")
        return []


@app.route('/api/emergency-alert', methods=['POST'])
def emergency_alert():
    data = request.json
    symptoms = data.get('symptoms', '').lower()
    user_lat, user_lng = data.get('latitude'), data.get('longitude')

    is_critical = any(symptom in symptoms for symptom in CRITICAL_SYMPTOMS)
    if not is_critical:
        return jsonify({
            'is_emergency': False,
            'message': 'Symptoms do not appear critical, but please consult a doctor.'
        })

    hospitals = get_hospitals_overpass(user_lat, user_lng, 5)
    return jsonify({
        'is_emergency': True,
        'message': 'CRITICAL SYMPTOMS DETECTED! Call emergency services immediately!',
        'emergency_number': '108',
        'hospitals': hospitals[:5]
    })


# -------------------------------------------------------------------
# ✅ 4. Lifestyle Recommendation Logic (Fixed + Logging + Robust normalization)
# -------------------------------------------------------------------
def build_prompt(health_condition):
    return f"""
You are a professional medical lifestyle assistant.
The user described: "{health_condition}".
Respond only in JSON with 4 sections:
"diet", "activity", "prevention", "wellness_tips".
Each should have 3–5 short actionable points, general + condition-specific.
No markdown, no extra commentary, JSON only.
"""


def clean_gemini_json(text):
    if not isinstance(text, str):
        return ""
    text = text.strip()
    # remove triple backticks wrappers
    text = re.sub(r"^```(json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # try to extract first {...} chunk
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else text


def ensure_array(val):
    """Coerce a value to an array of strings"""
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    if isinstance(val, str):
        # split on newlines, semicolons, or commas if looks like a single string with separators
        parts = [p.strip() for p in re.split(r"[\n;‒–—,-]\s*", val) if p.strip()]
        return parts if parts else [val.strip()]
    return []


def normalize_recommendations(raw: dict) -> dict:
    """
    Ensure final structure:
    {
      diet: { general: [...], specific_conditions: [...] },
      activity: { general: [...], specific_conditions: [...] },
      prevention: { general: [...], specific_conditions: [...] },
      wellness_tips: [...]
    }
    """
    if not isinstance(raw, dict):
        raw = {}

    # Accept multiple wellness keys
    wellness_candidates = []
    for k in ["wellness_tips", "wellness", "wellnessTips", "wellness-tips"]:
        if k in raw:
            wellness_candidates = raw[k]
            break
    if not wellness_candidates and "wellness" in raw:
        wellness_candidates = raw.get("wellness")

    def build_section(key):
        val = raw.get(key, {})
        # if section is a list, treat it as 'general'
        if isinstance(val, list):
            return {"general": ensure_array(val), "specific_conditions": []}
        if isinstance(val, str):
            # single string -> split into general list
            return {"general": ensure_array(val), "specific_conditions": []}
        if isinstance(val, dict):
            return {
                "general": ensure_array(val.get("general", val.get("general_advice", []))),
                "specific_conditions": ensure_array(val.get("specific_conditions", val.get("condition_specific", [])))
            }
        # fallback empty
        return {"general": [], "specific_conditions": []}

    diet = build_section("diet")
    activity = build_section("activity")
    prevention = build_section("prevention")

    # If any of these is empty, try to pick from top-level keys
    if not diet["general"]:
        diet["general"] = ensure_array(raw.get("diet_general", raw.get("nutrition", []))) or ["Eat balanced meals", "Stay hydrated"]
    if not activity["general"]:
        activity["general"] = ensure_array(raw.get("activity_general", raw.get("exercise", []))) or ["Exercise daily", "Walk 30 minutes"]
    if not prevention["general"]:
        prevention["general"] = ensure_array(raw.get("prevention_general", raw.get("prevention_advice", []))) or ["Get enough sleep", "Manage stress"]

    # normalize wellness_tips
    wellness = ensure_array(wellness_candidates or raw.get("wellness_tips", raw.get("wellness", raw.get("wellnessTips", []))))
    if not wellness:
        wellness = ["Maintain consistent routines", "Practice mindfulness", "Stay socially connected"]

    return {
        "diet": diet,
        "activity": activity,
        "prevention": prevention,
        "wellness_tips": wellness
    }


@app.route("/api/lifestyle-recommendations", methods=["POST"])
def lifestyle_recommendations():
    try:
        data = request.json or {}
        condition = (data.get("health_condition") or data.get("healthCondition") or "").strip()
        if not condition:
            return jsonify({"success": False, "error": "Health condition required"}), 400

        using_gemini = False
        raw_recs = {}

        if genai and GEMINI_API_KEY:
            try:
                print(f"🧠 Using Gemini for: {condition}")
                model = genai.GenerativeModel("gemini-2.0-flash")
                response = model.generate_content(build_prompt(condition))
                raw_text = getattr(response, "text", "") or ""
                cleaned = clean_gemini_json(raw_text)
                # Try parse; if fails, fallback
                try:
                    raw_recs = json.loads(cleaned)
                    using_gemini = True
                    print("✅ Gemini JSON parsed successfully.")
                except Exception as parse_err:
                    print(f"⚠️ Gemini parse failed: {parse_err}. Attempting to fallback to heuristics.")
                    # try heuristics: if cleaned looks like lines, create structure
                    raw_recs = {"wellness_tips": ensure_array(cleaned)}
            except Exception as e:
                print(f"⚠️ Gemini call failed → fallback: {e}")
                raw_recs = generate_mock_recommendations(condition)
        else:
            print("⚠️ Gemini unavailable → using mock data.")
            raw_recs = generate_mock_recommendations(condition)

        normalized = normalize_recommendations(raw_recs)
        print(f"✅ Source: {'Gemini' if using_gemini else 'Mock'} | Condition: {condition}")
        return jsonify({"success": True, "recommendations": normalized})

    except Exception as e:
        print(f"❌ Lifestyle generation failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


def generate_mock_recommendations(condition):
    return {
        "diet": {"general": ["Include fruits & vegetables", "Prefer whole grains"], "specific_conditions": ["Limit sugar intake"]},
        "activity": {"general": ["Aim 30 min walk daily", "Include strength training"], "specific_conditions": ["Start gently"]},
        "prevention": {"general": ["Sleep 7-9 hours", "Manage stress"], "specific_conditions": ["Avoid triggers"]},
        "wellness_tips": ["Practice gratitude", "Stay connected", "Take breaks"]
    }


# -------------------------------------------------------------------
# ✅ 5. Save Recommendations PDF (UPDATED with Gemini filename detection)
# -------------------------------------------------------------------
@app.route("/api/download-recommendations", methods=["POST"])
def download_recommendations():
    try:
        data = request.get_json()
        health_condition = data.get("health_condition", "").strip()
        recommendations = data.get("recommendations", {})

        # ✅ Detect symptom name (Gemini or fallback)
        symptom_name = None
        if genai and GEMINI_API_KEY and health_condition:
            try:
                model = genai.GenerativeModel("gemini-2.0-flash")
                detection_prompt = f"""
                You are a medical text interpreter.
                From this input: "{health_condition}"
                Extract only the *main health symptom or condition* in ONE word.
                Reply with only the keyword.
                """
                response = model.generate_content(detection_prompt)
                raw_symptom = response.text.strip().lower()
                symptom_name = re.sub(r"[^a-zA-Z0-9_]", "_", raw_symptom)
                print(f"🧠 Gemini detected symptom: {symptom_name}")
            except Exception as e:
                print(f"⚠️ Gemini symptom detection failed: {e}")
                symptom_name = None

        # ✅ Fallback if Gemini fails
        if not symptom_name:
            words = re.findall(r"[a-zA-Z]+", health_condition)
            ignore = {"i", "have", "been", "am", "with", "feeling", "a", "the"}
            symptom_name = next((w.lower() for w in words if w.lower() not in ignore), "health")

        filename = f"medisense_{symptom_name}_recommendations.pdf"

        # ✅ Build PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        title = Paragraph(
            "<para align='center'><b><font size=18 color='green'>Medisense Lifestyle Recommendations</font></b></para>",
            styles["Title"],
        )
        elements.append(title)
        elements.append(Spacer(1, 0.3 * inch))
        intro = Paragraph(f"<b>Based on your condition:</b> {health_condition}", styles["BodyText"])
        elements.append(intro)
        elements.append(Spacer(1, 0.2 * inch))

        def render_data(d):
            out = ""
            if isinstance(d, dict):
                for k, v in d.items():
                    out += f"<b>{k.title()}</b><br/>" + render_data(v)
            elif isinstance(d, list):
                for item in d:
                    out += f"- {item}<br/>"
            else:
                out += f"{d}<br/>"
            return out

        elements.append(Paragraph(render_data(recommendations), styles["BodyText"]))
        elements.append(Spacer(1, 0.5 * inch))
        footer = Paragraph(
            "<para align='center'><font size=10 color='gray'>Generated by Medisense AI Health Assistant</font></para>",
            styles["BodyText"],
        )
        elements.append(footer)

        doc.build(elements)
        buffer.seek(0)

        # ✅ Send file
        response = send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype="application/pdf",
        )

        # ⚠️ CRUCIAL: expose filename header for frontend access
        response.headers.add("Access-Control-Expose-Headers", "Content-Disposition")
        return response

    except Exception as e:
        print("❌ Error generating PDF:", e)
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------------------------
# ✅ 6. Health Check
# -------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "gemini_available": bool(GEMINI_API_KEY),
        "google_places_enabled": bool(GOOGLE_API_KEY),
        "service": "MediSense Unified Backend"
    })


# -------------------------------------------------------------------
# ✅ 7. Run
# -------------------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Starting MediSense Unified Service (Lifestyle + Symptom Analysis + Emergency)...")
    app.run(debug=True, port=5000)

from io import BytesIO
from flask_cors import CORS
from dotenv import load_dotenv
from google.genai import Client
import os, json, re, math, requests
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter
from flask import Flask, jsonify, request, send_file
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


from symptom_analyser import SymptomAnalyzer

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
CORS(app)

if not GEMINI_API_KEY:
    raise RuntimeError("❌ Missing GEMINI_API_KEY environment variable.")

analyzer = SymptomAnalyzer()
client = Client(api_key=GEMINI_API_KEY)
print("✅ Gemini client initialized successfully.")

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
    mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
        "https://overpass.nchc.org.tw/api/interpreter",
    ]

    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:{radius_km * 1000},{lat},{lng});
      way["amenity"="hospital"](around:{radius_km * 1000},{lat},{lng});
    );
    out center tags;
    """

    for url in mirrors:
        try:
            print(f"🔍 Trying Overpass endpoint: {url}")
            response = requests.post(url, data={'data': query}, timeout=25)
            response.raise_for_status()

            data = response.json()
            if not data.get("elements"):
                print(f"⚠️ No data returned from {url}, trying next mirror...")
                continue

            hospitals, seen = [], set()
            for element in data["elements"]:
                tags = element.get("tags", {})
                name = tags.get("name", "Hospital")
                if name in seen:
                    continue
                seen.add(name)
                hospital_lat = element["lat"] if element["type"] == "node" else element.get("center", {}).get("lat")
                hospital_lng = element["lon"] if element["type"] == "node" else element.get("center", {}).get("lon")
                if not hospital_lat or not hospital_lng:
                    continue

                distance = calculate_distance(lat, lng, hospital_lat, hospital_lng)
                hospitals.append({
                    "id": element["id"],
                    "name": name,
                    "lat": hospital_lat,
                    "lng": hospital_lng,
                    "distance": round(distance, 2)
                })

            if hospitals:
                hospitals.sort(key=lambda x: x["distance"])
                print(f"✅ Found {len(hospitals)} hospitals from {url}")
                return hospitals[:15]

        except Exception as e:
            print(f"⚠️ Overpass mirror {url} failed: {e}")
            continue

    print("❌ All Overpass mirrors failed. Returning empty list.")
    return []

@app.route('/api/emergency-alert', methods=['POST'])
def emergency_alert():
    data = request.json or {}
    symptoms = (data.get('symptoms') or "").lower()
    user_lat, user_lng = data.get('latitude'), data.get('longitude')

    print(f"📩 Incoming /api/emergency-alert → lat={user_lat}, lng={user_lng}, symptoms='{symptoms}'")

    if not user_lat or not user_lng:
        return jsonify({"error": "Missing latitude or longitude"}), 400

    is_critical = any(symptom in symptoms for symptom in CRITICAL_SYMPTOMS)
    hospitals = get_hospitals_overpass(user_lat, user_lng, 5)

    if not hospitals:
        print("⚠️ No hospitals from Overpass. Returning fallback list.")
        hospitals = [
            {"id": 1, "name": "City Care Hospital", "lat": user_lat, "lng": user_lng, "distance": 1.5},
            {"id": 2, "name": "Metro Health Center", "lat": user_lat, "lng": user_lng, "distance": 2.1},
            {"id": 3, "name": "LifeLine Medical Institute", "lat": user_lat, "lng": user_lng, "distance": 3.8},
        ]

    return jsonify({
        'is_emergency': bool(is_critical),
        'message': 'CRITICAL SYMPTOMS DETECTED! Call emergency services immediately!' if is_critical
                   else 'Symptoms do not appear critical, but please consult a doctor.',
        'emergency_number': '108',
        'hospitals': hospitals[:5]
    })

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
    text = re.sub(r"^```(json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else text


def ensure_array(val):
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    if isinstance(val, str):
        parts = [p.strip() for p in re.split(r"[\n;‒–—,-]\s*", val) if p.strip()]
        return parts if parts else [val.strip()]
    return []


def normalize_recommendations(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raw = {}

    def build_section(key):
        val = raw.get(key, {})
        if isinstance(val, list):
            return {"general": ensure_array(val), "specific_conditions": []}
        if isinstance(val, str):
            return {"general": ensure_array(val), "specific_conditions": []}
        if isinstance(val, dict):
            return {
                "general": ensure_array(val.get("general", [])),
                "specific_conditions": ensure_array(val.get("specific_conditions", []))
            }
        return {"general": [], "specific_conditions": []}

    diet = build_section("diet")
    activity = build_section("activity")
    prevention = build_section("prevention")
    wellness = ensure_array(raw.get("wellness_tips", []))

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
    data = request.json or {}
    condition = (data.get("health_condition") or data.get("healthCondition") or "").strip()
    if not condition:
        return jsonify({"success": False, "error": "Health condition required"}), 400

    try:
        print(f"🧠 Using Gemini for condition: {condition}")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=build_prompt(condition)
        )
        raw_text = getattr(response, "text", "") or ""
        cleaned = clean_gemini_json(raw_text)
        raw_recs = json.loads(cleaned)
        print("✅ Gemini JSON parsed successfully.")
    except Exception as e:
        print(f"⚠️ Gemini call failed or invalid JSON → fallback: {e}")
        raw_recs = {
            "diet": {"general": ["Eat fruits & vegetables"], "specific_conditions": []},
            "activity": {"general": ["Walk 30 minutes daily"], "specific_conditions": []},
            "prevention": {"general": ["Sleep 7-9 hours"], "specific_conditions": []},
            "wellness_tips": ["Stay positive"]
        }

    normalized = normalize_recommendations(raw_recs)
    return jsonify({"success": True, "recommendations": normalized})

@app.route("/api/download-recommendations", methods=["POST"])
def download_recommendations():
    data = request.get_json()
    health_condition = data.get("health_condition", "").strip()
    recommendations = data.get("recommendations", {})

    try:
        detection_prompt = f"""
        You are a medical text interpreter.
        From this input: "{health_condition}"
        Extract only the *main health symptom or condition* in ONE word.
        Reply with only the keyword.
        """
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=detection_prompt
        )
        raw_symptom = response.text.strip().lower()
        symptom_name = re.sub(r"[^a-zA-Z0-9_]", "_", raw_symptom)
    except Exception:
        words = re.findall(r"[a-zA-Z]+", health_condition)
        ignore = {"i", "have", "been", "am", "with", "feeling", "a", "the"}
        symptom_name = next((w.lower() for w in words if w.lower() not in ignore), "health")

    filename = f"medisense_{symptom_name}_recommendations.pdf"

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph(
        "<para align='center'><b><font size=18 color='green'>Medisense Lifestyle Recommendations</font></b></para>",
        styles["Title"],
    )
    elements += [title, Spacer(1, 0.3 * inch)]
    intro = Paragraph(f"<b>Based on your condition:</b> {health_condition}", styles["BodyText"])
    elements += [intro, Spacer(1, 0.2 * inch)]

    def render_data(d):
        if isinstance(d, dict):
            return "".join(f"<b>{k.title()}</b><br/>{render_data(v)}" for k, v in d.items())
        if isinstance(d, list):
            return "".join(f"- {item}<br/>" for item in d)
        return f"{d}<br/>"

    elements.append(Paragraph(render_data(recommendations), styles["BodyText"]))
    elements += [Spacer(1, 0.5 * inch),
                 Paragraph("<para align='center'><font size=10 color='gray'>Generated by Medisense AI Health Assistant</font></para>", styles["BodyText"])]

    doc.build(elements)
    buffer.seek(0)

    response = send_file(buffer, as_attachment=True, download_name=filename, mimetype="application/pdf")
    response.headers.add("Access-Control-Expose-Headers", "Content-Disposition")
    return response


# === Gemini AI summary ===
@app.route('/api/symptom-analysis', methods=['POST'])
def analyze_symptoms():
    try:
        data = request.get_json()
        if not data or 'symptoms_input' not in data:
            return jsonify({'error': 'Invalid input. Missing "symptoms_input".'}), 400

        symptoms_input = data.get('symptoms_input', '')
        symptoms_input = re.sub(
            r'\b(i have|i am|im|my|i feel|i got|i suffer from|having|got|is|was|the|a|an)\b',
            '',
            re.sub(r'[^a-z0-9 ,.-]', '', re.sub(r'\s+', ' ', str(symptoms_input).strip().lower()))
        ).strip()
        duration_days = int(data.get('duration_days', 0))
        age = int(data.get('age', 1)) if data.get('age') else None

        result = analyzer.analyze(symptoms_input, age, duration_days)

        result.setdefault("severity_score", 0)
        result.setdefault("severity_category", "UNKNOWN")
        result.setdefault("detected_symptoms", [])

        prompt = f"""
            You are a medically trained AI assistant with advanced reasoning and communication skills.
            Read the JSON symptom analysis and provide a short, plain-English summary that sounds natural and human.

            PURPOSE:
            Explain what the symptoms might mean, how serious they could be, and what the user should do next.
            The tone should be calm, clear, and slightly empathetic — like a doctor explaining something simply to a patient.

            IMPORTANT:
            The JSON data below contains a machine-generated severity analysis. 
            Use it as guidance, but do not assume it is fully accurate. 
            Rely on your own medical reasoning and judgment to interpret the case fairly.

            ADDITIONAL CONTEXT:
            - Patient age: {age if age is not None else "Not provided"}
            - Symptom duration: {duration_days} days
            Use this context to guide your reasoning. For example, longer duration or older age may increase medical concern.

            RULES:
            1. Do not use bullet points, emojis, Markdown, or headings.
            2. Write in short paragraphs of natural, flowing text.
            3. Mention the key symptoms, what they could indicate, and how urgent they might be.
            4. Give specific, realistic advice (for example: "See a doctor soon," or "Call emergency services if pain worsens").
            5. Keep the summary under 180 words.
            6. At the end of your response, include exactly two lines in this format:
            Final severity score: [X/10]
            Final risk assessment: [LOW / MODERATE / HIGH]
            7. After that, add this sentence:
            This summary is informational and not a substitute for professional medical evaluation.

            Human input:
            {symptoms_input}

            JSON input:
            {analyzer.feed_to_gemini(result, symptoms_input)}
            """
        
        ai_summary = None

        try:
            gemini_response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if hasattr(gemini_response, "text"):
                ai_summary = gemini_response.text.strip()
        except Exception as e:
            ai_summary = f"(Gemini unavailable: {e})"

        result["ai_summary"] = ai_summary or "(No AI summary returned.)"

        updated_risk = None
        updated_score = None

        if ai_summary:
            score_match = re.search(r"final severity score:\s*([0-9]+(?:\.[0-9]+)?)/?10", ai_summary.lower())
            if score_match:
                updated_score = float(score_match.group(1))
                if updated_score > 10:
                    updated_score = 10.0
                if updated_score < 0:
                    updated_score = 0.0

            risk_match = re.search(r"final risk assessment:\s*(low|moderate|medium|high)", ai_summary.lower())
            if risk_match:
                word = risk_match.group(1)
                if word in ["moderate", "medium"]:
                    updated_risk = "MODERATE"
                elif word == "high":
                    updated_risk = "HIGH"
                elif word == "low":
                    updated_risk = "LOW"

        if updated_score is not None:
            result["severity_score"] = round(updated_score, 1)

        if updated_risk:
            result["risk_level"] = updated_risk

        result["risk_score"] = result["severity_score"]

        response = {
            "symptoms_input": symptoms_input,
            "detected_symptoms": result.get("detected_symptoms", []),
            "severity_score": result.get("severity_score", 0),
            "risk_level": result.get("risk_level", "UNKNOWN"),
            "ai_summary": ai_summary,
            "disclaimer": "This summary is informational and not a substitute for professional medical evaluation."
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)

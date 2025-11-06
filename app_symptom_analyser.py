from flask import Flask, request, jsonify
from flask_cors import CORS
from symptom_analyser import SymptomAnalyzer
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

analyzer = SymptomAnalyzer()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@app.route('/api/symptom-analysis', methods=['POST'])
def analyze_symptoms():
    try:
        data = request.get_json()
        if not data or 'symptoms_input' not in data:
            return jsonify({'error': 'Invalid input. Missing "symptoms_input".'}), 400

        symptoms_input = data.get('symptoms_input', '')
        duration_days = int(data.get('duration_days', 0))
        age = int(data.get('age', 0)) if data.get('age') else None

        # Run analyzer
        result = analyzer.analyze(symptoms_input, duration_days, age)

        # === Ensure numeric severity_score and risk_level exist ===
        if "severity_score" not in result:
            result["severity_score"] = 0
        if "risk_level" not in result:
            result["risk_level"] = "UNKNOWN"

        # === Gemini AI summary ===
        gemini_prompt = f"""
        You are a concise medical assistant.
        Analyze the following JSON and write a 3-5 line summary:
        {analyzer.feed_to_gemini(result, symptoms_input)}
        """
        ai_summary = None
        try:
            gemini_response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=gemini_prompt,
            )
            if hasattr(gemini_response, "text"):
                ai_summary = gemini_response.text.strip()
        except Exception as e:
            ai_summary = f"(Gemini unavailable: {e})"

        result["ai_summary"] = ai_summary or "(No AI summary returned.)"

        # Always send risk_score explicitly for JSX
        result["risk_score"] = result["severity_score"]

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

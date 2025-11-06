from flask import Flask, request, jsonify
from flask_cors import CORS
from symptom_analyser import SymptomAnalyzer
from google import genai
import os
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

analyzer = SymptomAnalyzer()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        # === Gemini AI summary ===
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
        You are a medically trained AI assistant with advanced reasoning and communication skills.
        Read the JSON symptom analysis and provide a short, plain-English summary that sounds natural and human.
        
        PURPOSE:
        Explain what the symptoms might mean, how serious they could be, and what the user should do next.
        The tone should be calm, clear, and slightly empathetic — like a doctor explaining something simply to a patient.

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
                model="gemini-2.5-flash-lite",
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

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)


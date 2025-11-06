# -*- coding: utf-8 -*-
from flask import Flask, jsonify, render_template_string
import google.generativeai as genai
from dotenv import load_dotenv
import os, json, re

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# --- Simulated Data ---
user_history = {
    "user_id": "A123",
    "chats": [
        {"date": "2025-09-21", "symptom": "fatigue", "response": "Possible mild dehydration"},
        {"date": "2025-09-22", "symptom": "headache", "response": "Suggested hydration and rest"},
        {"date": "2025-09-25", "symptom": "insomnia", "response": "Advised evening relaxation"}
    ],
    "appointments": [
        {"date": "2025-09-28", "doctor": "Dr. Meena", "diagnosis": "Mild anxiety", "treatment": "Sleep hygiene"},
        {"date": "2025-10-05", "doctor": "Dr. Rahul", "diagnosis": "Vitamin D deficiency", "treatment": "Supplements"}
    ]
}

# --- Function to Create Prompt ---
def build_prompt(user_history):
    chat_summary = "\n".join([f"- {c['date']}: Reported {c['symptom']} → {c['response']}" for c in user_history["chats"]])
    appointment_summary = "\n".join([f"- {a['date']}: {a['diagnosis']} (Treatment: {a['treatment']})" for a in user_history["appointments"]])

    all_conditions = list({c['symptom'] for c in user_history['chats']} | {a['diagnosis'] for a in user_history['appointments']})
    conditions_str = ", ".join(all_conditions)

    prompt = f"""
    You are a medical lifestyle assistant for a healthcare AI system.
    The user has experienced the following conditions: {conditions_str}.
    For each condition, provide personalized suggestions that clearly mention which condition the advice helps prevent or manage.

    ### User Chat History:
    {chat_summary}

    ### Past Appointments:
    {appointment_summary}

    Provide recommendations in this JSON format:
    {{
      "diet": {{ "fatigue": [...], "headache": [...], "insomnia": [...], ... }},
      "activity": {{ "fatigue": [...], "headache": [...], ... }},
      "prevention": {{ "fatigue": [...], "headache": [...], ... }}
    }}

    Keep the advice general, safe, and encouraging.
    """
    return prompt.strip()

# --- Route for Lifestyle Recommendations ---
@app.route('/recommendations', methods=['GET'])
def get_recommendations():
    prompt = build_prompt(user_history)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)

    text = response.text.strip()
    text = re.sub(r"^```json|```$", "", text).strip()

    try:
        recommendations = json.loads(text)
    except Exception as e:
        print("⚠️ JSON parsing failed:", e)
        recommendations = {"diet": {}, "activity": {}, "prevention": {}}

    # Print to terminal
    print("\n=== 🧠 Lifestyle Recommendations for User:", user_history["user_id"], "===\n")
    print(json.dumps(recommendations, indent=2, ensure_ascii=False))
    print("\n============================================\n")

    # --- Frontend HTML Template with Dropdown ---
    html_template = """
    <html>
    <head>
        <title>🧠 Lifestyle Recommendations</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; padding: 20px; }
            .card { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); margin-bottom: 20px; }
            h1 { text-align: center; color: #3b3b98; }
            h2 { color: #2e8b57; }
            select { padding: 8px; font-size: 16px; border-radius: 10px; }
            ul { line-height: 1.6; }
            .hidden { display: none; }
        </style>
    </head>
    <body>
        <h1>🧠 Personalized Lifestyle Recommendations</h1>
        <p style="text-align:center;">Select a health condition to view tailored diet, activity, and preventive suggestions.</p>

        <div style="text-align:center; margin-bottom:20px;">
            <label for="conditionSelect"><b>Select Condition:</b></label>
            <select id="conditionSelect" onchange="showCondition(this.value)">
                <option value="">-- Choose a condition --</option>
                {% for cond in recommendations.diet.keys() %}
                    <option value="{{ cond }}">{{ cond.title() }}</option>
                {% endfor %}
            </select>
        </div>

        {% for cond in recommendations.diet.keys() %}
        <div id="{{ cond }}" class="condition-section hidden">
            <div class="card">
                <h2>🥗 Diet for {{ cond.title() }}</h2>
                <ul>
                    {% for item in recommendations.diet[cond] %}
                        <li>{{ item }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% if cond in recommendations.activity %}
            <div class="card">
                <h2>🏃 Activity for {{ cond.title() }}</h2>
                <ul>
                    {% for item in recommendations.activity[cond] %}
                        <li>{{ item }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}
            {% if cond in recommendations.prevention %}
            <div class="card">
                <h2>🩺 Preventive Care for {{ cond.title() }}</h2>
                <ul>
                    {% for item in recommendations.prevention[cond] %}
                        <li>{{ item }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}
        </div>
        {% endfor %}

        <script>
        function showCondition(cond) {
            document.querySelectorAll('.condition-section').forEach(sec => sec.classList.add('hidden'));
            if (cond) document.getElementById(cond).classList.remove('hidden');
        }
        </script>
    </body>
    </html>
    """

    return render_template_string(html_template, recommendations=recommendations)

# --- Run the App ---
if __name__ == "__main__":
    app.run(debug=True)

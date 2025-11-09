import { useState, useEffect } from "react";
import {
  Heart,
  Activity,
  Utensils,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  Send,
  Stethoscope,
} from "lucide-react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit
} from "firebase/firestore";

const LifestyleRecommendations = ({ userData, onClose }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    diet: true,
    activity: true,
    prevention: true,
    wellness: true,
  });
  const [healthInput, setHealthInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ---- Fetch user symptoms from Firebase ----
useEffect(() => {
  const loadUserSymptoms = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return;

      const ref = collection(db, "users", String(user.id), "symptom_records");
      const q = query(ref, orderBy("created_at", "desc"), limit(1)); // latest only
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        const detected = Array.isArray(latest.detected_symptoms)
          ? latest.detected_symptoms
          : [];

        if (detected.length > 0) {
          setHealthInput(`${detected.join(", ")}`);
        }
        else {
          setHealthInput(latest.symptoms_input);
        }
      }
    } catch (err) {
      console.error("Failed to load latest symptoms from Firebase:", err);
    }
  };

  loadUserSymptoms();
}, [userData]);

  // ---- Normalize recommendations ----
  const normalizeFrontendRecommendations = (rec) => {
    if (!rec || typeof rec !== "object") {
      return {
        diet: { general: [], specific_conditions: [] },
        activity: { general: [], specific_conditions: [] },
        prevention: { general: [], specific_conditions: [] },
        wellness_tips: [],
      };
    }

    const safeList = (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        return v.split(/[\n;,-]+/).map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    const getSection = (k) => {
      const val = rec[k];
      if (val == null) return { general: [], specific_conditions: [] };
      if (Array.isArray(val)) return { general: val, specific_conditions: [] };
      if (typeof val === "object") {
        return {
          general: safeList(val.general || val.general_advice || []),
          specific_conditions: safeList(
            val.specific_conditions || val.condition_specific || []
          ),
        };
      }
      return { general: [], specific_conditions: [] };
    };

    return {
      diet: getSection("diet"),
      activity: getSection("activity"),
      prevention: getSection("prevention"),
      wellness_tips: safeList(rec.wellness_tips || rec.wellness || []),
    };
  };


const fetchRecommendations = async (healthCondition) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "http://127.0.0.1:5000/api/lifestyle-recommendations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ health_condition: healthCondition }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch recommendations");
      }

      setRecommendations(normalizeFrontendRecommendations(data.recommendations));
      setSubmitted(true);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("Unable to load recommendations. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (healthInput.trim()) fetchRecommendations(healthInput);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ---- Section component ----
  const RecommendationSection = ({ icon: Icon, title, color, sectionKey, items }) => {
    const safeItems = Array.isArray(items)
      ? items
      : typeof items === "string"
      ? [items]
      : [];
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
              <p className="text-gray-600 text-sm">
                {safeItems.length} recommendations
              </p>
            </div>
          </div>
          {expandedSections[sectionKey] ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSections[sectionKey] && safeItems.length > 0 && (
          <div className="px-6 pb-6">
            <ul className="space-y-3">
              {safeItems.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ---- Conditional UI Rendering ----
  if (!submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Lifestyle Recommendations
                </h1>
                <p className="text-gray-600">
                  Tell us about your health for personalized advice
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Describe your health condition or symptoms
                </label>
                <textarea
                  value={healthInput}
                  onChange={(e) => setHealthInput(e.target.value)}
                  placeholder="For example: 'I have frequent headaches and fatigue', 'I struggle with sleep issues', or 'I want to improve my overall wellness'"
                  rows="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Be specific for more accurate recommendations
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !healthInput.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Recommendations...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Get Personalized Recommendations</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Examples:</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div>• Headaches or migraines</div>
              <div>• Sleep problems</div>
              <div>• Fatigue or low energy</div>
              <div>• Stress or anxiety</div>
              <div>• Digestive issues</div>
              <div>• Joint or muscle pain</div>
              <div>• Weight management</div>
              <div>• General wellness</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            Generating personalized health recommendations...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Recommendations
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const dietItems = [
    ...(recommendations?.diet?.general || []),
    ...(recommendations?.diet?.specific_conditions || []),
  ];
  const activityItems = [
    ...(recommendations?.activity?.general || []),
    ...(recommendations?.activity?.specific_conditions || []),
  ];
  const preventionItems = [
    ...(recommendations?.prevention?.general || []),
    ...(recommendations?.prevention?.specific_conditions || []),
  ];
  const wellnessItems =
    recommendations?.wellness_tips || recommendations?.wellness || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Your Lifestyle Recommendations
              </h1>
              <p className="text-gray-600">
                Personalized health advice based on your input
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 max-w-2xl mx-auto">
            <p className="text-sm text-gray-600 mb-1">Based on:</p>
            <p className="text-gray-800 font-medium">"{healthInput}"</p>
          </div>
        </div>

        <div className="space-y-6">
          <RecommendationSection
            icon={Utensils}
            title="🥗 Diet & Nutrition"
            color="bg-gradient-to-r from-green-500 to-emerald-500"
            sectionKey="diet"
            items={dietItems}
          />
          <RecommendationSection
            icon={Activity}
            title="🏃 Activity & Exercise"
            color="bg-gradient-to-r from-blue-500 to-cyan-500"
            sectionKey="activity"
            items={activityItems}
          />
          <RecommendationSection
            icon={Shield}
            title="🩺 Prevention & Care"
            color="bg-gradient-to-r from-purple-500 to-indigo-500"
            sectionKey="prevention"
            items={preventionItems}
          />
          <RecommendationSection
            icon={Heart}
            title="💫 Wellness Tips"
            color="bg-gradient-to-r from-pink-500 to-rose-500"
            sectionKey="wellness"
            items={wellnessItems}
          />
        </div>

        <div className="flex justify-center space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
          >
            New Recommendation
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
                  <button
            onClick={async () => {
              try {
                const response = await fetch("http://127.0.0.1:5000/api/download-recommendations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    health_condition: healthInput,
                    recommendations: {
                      diet: { general: dietItems, specific_conditions: [] },
                      activity: { general: activityItems, specific_conditions: [] },
                      prevention: { general: preventionItems, specific_conditions: [] },
                      wellness_tips: wellnessItems
                    }
                  }),
                });

                if (!response.ok) throw new Error("Failed to download PDF");

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const disposition = response.headers.get("Content-Disposition");
                let filename = "medisense_health_recommendations.pdf";
                if (disposition && disposition.includes("filename=")) {
                  const match = disposition.match(/filename="?([^"]+)"?/);
                  if (match && match[1]) filename = match[1];
                }

                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();

                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error("Download failed:", err);
                alert("Failed to save recommendations. Try again.");
              }
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            Save Recommendations
          </button>
        </div>
      </div>
    </div>
  );
};

export default LifestyleRecommendations;

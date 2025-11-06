import React, { useState } from 'react';
import {
  Activity,
  Mic,
  MicOff,
  ArrowLeft,
  Loader2,
  Brain,
  HeartPulse
} from 'lucide-react';

const SymptomAnalysis = ({ onBackToDashboard, onAnalysisComplete }) => {
  const [formData, setFormData] = useState({ symptoms: '', duration: '', age: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    setIsRecording(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData((prev) => ({ ...prev, symptoms: prev.symptoms + ' ' + transcript }));
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
  };

  const analyzeSymptoms = async () => {
    if (!formData.symptoms.trim()) {
      setError('Please describe your symptoms before analysis.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/symptom-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms_input: formData.symptoms,
          duration_days: formData.duration || 0,
          age: formData.age || null
        })
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        if (onAnalysisComplete) onAnalysisComplete(data);
        console.log(data);
      }
    } catch (err) {
      setError('⚠️ Unable to connect to backend. Please ensure Flask is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Symptom Analysis
              </h1>
              <p className="text-gray-600">Describe what you’re feeling</p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={onBackToDashboard}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {/* Input Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-6">
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                What symptoms are you experiencing?
              </label>
              <div className="relative">
                <textarea
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="E.g., I have chest pain, dizziness, and shortness of breath..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={handleVoiceInput}
                  disabled={isRecording}
                  className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                    isRecording
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
              {isRecording && (
                <p className="text-sm text-red-600 mt-2 flex items-center">
                  <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></span>
                  Listening... Speak now
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (days)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="e.g. 25"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={analyzeSymptoms}
              disabled={loading || !formData.symptoms.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  <span>Analyze Symptoms</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

  {/* Results Section */}
  {result && !error && (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <HeartPulse className="w-6 h-6 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-900">Analysis Result</h2>
      </div>

      {result.detected_symptoms?.length > 0 && (
        <p className="text-gray-600">
          <strong>Detected Symptoms:</strong> {result.detected_symptoms.join(', ')}
        </p>
      )}

      <p className="text-gray-600">
        <strong>Severity Score:</strong> {result.severity_score ?? 'N/A'}/10
      </p>

      <p className="text-gray-600">
        <strong>Risk Level:</strong> {result.risk_level ?? 'Unknown'}
      </p>

      {/* Risk visualization bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full ${
            result.severity_score >= 8
              ? 'bg-red-500'
              : result.severity_score >= 5
              ? 'bg-yellow-400'
              : 'bg-green-500'
          }`}
          style={{ width: `${(result.severity_score / 10) * 100}%` }}
        />
      </div>

    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <p className="font-semibold text-blue-700">
        {result.recommendation?.action ?? 'No recommendation available'}
      </p>
      <p className="text-sm text-gray-600">
        Urgency: {result.recommendation?.urgency ?? 'N/A'}
      </p>
    </div>

    {/* Gemini summary */}
    {typeof result.ai_summary === 'string' && result.ai_summary.trim() !== '' && (
      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-700 mb-2">🧠 AI Summary</h3>
        <p className="text-gray-700 whitespace-pre-line">{result.ai_summary}</p>
      </div>
    )}

    {result.possible_conditions?.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Possible Conditions</h3>
        <ul className="list-disc ml-6 space-y-1 text-gray-700">
          {result.possible_conditions.map((cond, i) => (
            <li key={i}>
              <strong>{cond.condition}</strong> ({cond.match_score}% match) – {cond.advice}
            </li>
          ))}
        </ul>
      </div>
    )}

    <p className="text-xs text-gray-500 italic">{result.disclaimer}</p>
  </div>
)}
      </div>
    </div>
  );
};

export default SymptomAnalysis;

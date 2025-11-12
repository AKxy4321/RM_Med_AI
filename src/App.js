import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import SymptomAnalysis from './components/SymptomAnalysis/SymptomAnalysis';
import AppointmentScheduler from './components/AppointmentScheduler/AppointmentScheduler';
import LifestyleRecommendations from './components/LifestyleRecommendations/LifeStyleRecommendations';
import EmergencySupport from './components/EmergencySupport/EmergencySupport';
import HealthRecords from './components/HealthRecords/HealthRecords';
import { filterHealthRecords } from "./utils/filterHealthRecords";

import './index.css';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  //   useEffect(() => {
  //   // Clears all persisted data when the app first mounts
  //   localStorage.clear();
  // }, []);

  const [symptomAnalysisResult, setSymptomAnalysisResult] = useState(null);
  const [filteredResults, setFilteredResults] = useState([]); // live search results
  const navigate = useNavigate();

  // 🔍 Global search handler (filters only, no navigation)
  const handleGlobalSearch = (term) => {
    try {
      const storedRecords = JSON.parse(localStorage.getItem("healthRecords")) || [];
      const results = filterHealthRecords(storedRecords, term);
      setFilteredResults(results);
    } catch (err) {
      console.error("Error during global search:", err);
    }
  };

  return (
    <Routes>
      {/* 🔐 Login */}
      <Route path="/login" element={<Login />} />

      {/* 🏠 Dashboard with live search */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard
              onSearch={handleGlobalSearch}
              searchResults={filteredResults} // pass live results
              onNavigateToSymptomAnalysis={() => navigate('/symptom-analysis')}
              onNavigateToAppointment={() => {
                setSymptomAnalysisResult(null);
                navigate('/appointment-scheduling');
              }}
              onNavigateToLifestyleRecs={() => navigate('/lifestyle-recommendations')}
              onNavigateToEmergencySupport={() => navigate('/emergency-support')}
              onNavigateToHealthRecords={() => navigate('/health-records')}
            />
          </ProtectedRoute>
        }
      />

      {/* 🤒 Symptom Analysis */}
      <Route
        path="/symptom-analysis"
        element={
          <ProtectedRoute>
            <SymptomAnalysis
              onBackToDashboard={() => navigate(-1)}
              onAnalysisComplete={(result) => setSymptomAnalysisResult(result)}
            />
          </ProtectedRoute>
        }
      />

      {/* 📅 Appointment Scheduling */}
      <Route
        path="/appointment-scheduling"
        element={
          <ProtectedRoute>
            <AppointmentScheduler
              symptomAnalysis={symptomAnalysisResult}
              onBackToDashboard={() => navigate(-1)}
              onShowLifestyleRecommendations={() => navigate('/lifestyle-recommendations')}
            />
          </ProtectedRoute>
        }
      />

      {/* 🚨 Emergency Support */}
      <Route
        path="/emergency-support"
        element={
          <ProtectedRoute>
            <EmergencySupport onBackToDashboard={() => navigate(-1)} />
          </ProtectedRoute>
        }
      />

      {/* 💡 Lifestyle Recommendations */}
      <Route
        path="/lifestyle-recommendations"
        element={
          <ProtectedRoute>
            <LifestyleRecommendations
              userData={{
                symptoms: symptomAnalysisResult?.detectedSymptoms || [],
                conditions:
                  symptomAnalysisResult?.possibleConditions?.map((c) => c.condition) || [],
                medical_history: [],
              }}
              onClose={() => navigate(-1)}
            />
          </ProtectedRoute>
        }
      />

      {/* 📋 Health Records (independent page, still supports prefiltered data) */}
      <Route
        path="/health-records"
        element={
          <ProtectedRoute>
            <HealthRecords
              onBackToDashboard={() => navigate(-1)}
              prefilteredRecords={filteredResults.length > 0 ? filteredResults : null}
            />
          </ProtectedRoute>
        }
      />

      {/* 🌐 Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

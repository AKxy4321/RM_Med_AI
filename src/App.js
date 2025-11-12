import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import SymptomAnalysis from './components/SymptomAnalysis/SymptomAnalysis';
import AppointmentScheduler from './components/AppointmentScheduler/AppointmentScheduler';
import LifestyleRecommendations from './components/LifestyleRecommendations/LifeStyleRecommendations';
import EmergencySupport from './components/EmergencySupport/EmergencySupport';
import HealthRecords from './components/HealthRecords/HealthRecords';

import './index.css';
import { useState } from 'react';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" />;
};

// ==== Wrapper inside Router so we can use hooks like useNavigate ====
function AppContent() {
  const [symptomAnalysisResult, setSymptomAnalysisResult] = useState(null);
  const navigate = useNavigate();

  return (
    <Routes>
      {/* 🔐 Login */}
      <Route path="/login" element={<Login />} />

      {/* 🏠 Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard
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

      <Route
        path="/health-records"
        element={
          <ProtectedRoute>
            <HealthRecords onBackToDashboard={() => navigate(-1)} />
          </ProtectedRoute>
        }
      />


      {/* 🌐 Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

// ==== Main App: only wraps Router ====
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

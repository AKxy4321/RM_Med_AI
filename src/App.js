import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import SymptomAnalysis from './components/SymptomAnalysis/SymptomAnalysis';
import AppointmentScheduler from './components/AppointmentScheduler/AppointmentScheduler';
import LifestyleRecommendations from './components/LifestyleRecommendations/LifeStyleRecommendations';
import EmergencySupport from './components/EmergencySupport/EmergencySupport';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" />;
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [symptomAnalysisResult, setSymptomAnalysisResult] = useState(null);
  const [showLifestyleRecs, setShowLifestyleRecs] = useState(false);

  const renderContent = () => {
    // Lifestyle Recommendation Modal
    if (showLifestyleRecs) {
      return (
        <LifestyleRecommendations
          userData={{
            symptoms: symptomAnalysisResult?.detectedSymptoms || [],
            conditions:
              symptomAnalysisResult?.possibleConditions?.map((c) => c.condition) || [],
            medical_history: [],
          }}
          onClose={() => {
            setShowLifestyleRecs(false);
            setCurrentView('dashboard');
          }}
        />
      );
    }

    // Handle navigation between main modules
    switch (currentView) {
      case 'symptom-analysis':
        return (
          <SymptomAnalysis
            onBackToDashboard={() => setCurrentView('dashboard')}
            onAnalysisComplete={(result) => {
              setSymptomAnalysisResult(result);
              setCurrentView('appointment-scheduling');
            }}
          />
        );

      case 'appointment-scheduling':
        return (
          <AppointmentScheduler
            symptomAnalysis={symptomAnalysisResult}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onShowLifestyleRecommendations={() => setShowLifestyleRecs(true)}
          />
        );

      case 'emergency-support':
        return (
          <EmergencySupport
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        );

      case 'dashboard':
      default:
        return (
          <Dashboard
            onNavigateToSymptomAnalysis={() => setCurrentView('symptom-analysis')}
            onNavigateToAppointment={() => {
              setSymptomAnalysisResult(null);
              setCurrentView('appointment-scheduling');
            }}
            onNavigateToLifestyleRecs={() => setShowLifestyleRecs(true)}
            onNavigateToEmergencySupport={() => setCurrentView('emergency-support')}
          />
        );
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 🔐 Login */}
          <Route path="/login" element={<Login />} />

          {/* 🏠 Dashboard (Protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {renderContent()}
              </ProtectedRoute>
            }
          />

          {/* 🤒 Symptom Analysis */}
          <Route
            path="/symptom-analysis"
            element={
              <ProtectedRoute>
                <SymptomAnalysis
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  onAnalysisComplete={(result) => {
                    setSymptomAnalysisResult(result);
                    setCurrentView('appointment-scheduling');
                  }}
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
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  onShowLifestyleRecommendations={() => setShowLifestyleRecs(true)}
                />
              </ProtectedRoute>
            }
          />

          {/* 🚨 Emergency Support */}
          <Route
            path="/emergency-support"
            element={
              <ProtectedRoute>
                <EmergencySupport />
              </ProtectedRoute>
            }
          />

          {/* 🧠 Lifestyle Recommendations */}
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
                  onClose={() => {
                    setShowLifestyleRecs(false);
                    setCurrentView('dashboard');
                  }}
                />
              </ProtectedRoute>
            }
          />

          {/* 🌐 Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

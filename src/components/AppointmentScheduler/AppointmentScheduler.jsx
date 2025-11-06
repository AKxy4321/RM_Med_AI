import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Stethoscope, 
  User, 
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Zap,
  Settings,
  Star,
  Phone,
  Mail,
  Video,
  Shield,
  Bell,
  Sparkles,
  Heart
} from 'lucide-react';

const AppointmentScheduler = ({ symptomAnalysis, onBackToDashboard, onShowLifestyleRecommendations }) => {
  const [bookingMode, setBookingMode] = useState(null); // 'auto' or 'manual'
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoBookingProgress, setAutoBookingProgress] = useState([]);

  // Mock data - would come from APIs
  const hospitals = [
    {
      id: 1,
      name: "City General Hospital",
      specialization: "General Practice & Emergency",
      address: "123 Medical Center Dr, Healthcare District",
      distance: "2.3 km",
      rating: 4.5,
      reviewCount: 284,
      waitTime: "15-30 mins",
      urgencyScore: 4.7,
      features: ["Emergency", "Pharmacy", "Lab", "X-Ray", "ICU"],
      availableSlots: [
        { id: 1, date: "2024-01-15", time: "09:00 AM", type: "Urgent", duration: "30 min" },
        { id: 2, date: "2024-01-15", time: "10:30 AM", type: "Standard", duration: "30 min" },
        { id: 3, date: "2024-01-15", time: "02:00 PM", type: "Standard", duration: "30 min" }
      ]
    },
    {
      id: 2,
      name: "Heart & Vascular Center",
      specialization: "Cardiology & Internal Medicine",
      address: "456 Heart Avenue, Medical Complex",
      distance: "5.1 km",
      rating: 4.8,
      reviewCount: 156,
      waitTime: "30-45 mins",
      urgencyScore: 4.9,
      features: ["Cardiac ICU", "Echo Lab", "Cath Lab", "24/7 Emergency"],
      availableSlots: [
        { id: 4, date: "2024-01-15", time: "11:00 AM", type: "Urgent", duration: "45 min" },
        { id: 5, date: "2024-01-15", time: "03:30 PM", type: "Standard", duration: "45 min" }
      ]
    },
    {
      id: 3,
      name: "NeuroCare Institute",
      specialization: "Neurology & Neurosurgery",
      address: "789 Brain Street, Science Park",
      distance: "3.7 km",
      rating: 4.6,
      reviewCount: 198,
      waitTime: "20-40 mins",
      urgencyScore: 4.5,
      features: ["MRI", "EEG", "Neurosurgery", "Stroke Center"],
      availableSlots: [
        { id: 6, date: "2024-01-15", time: "01:15 PM", type: "Standard", duration: "60 min" },
        { id: 7, date: "2024-01-15", time: "04:00 PM", type: "Standard", duration: "60 min" }
      ]
    }
  ];

  const getUrgencyRecommendation = () => {
    if (!symptomAnalysis) return 'manual';
    
    const severity = symptomAnalysis.severityScore;
    if (severity >= 8) return 'auto';
    if (severity >= 5) return 'recommended-auto';
    return 'manual';
  };

  const simulateAutoBooking = async () => {
    setLoading(true);
    setAutoBookingProgress(['Analyzing symptom urgency...']);
    
    // Step 1: Find suitable hospitals
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAutoBookingProgress(prev => [...prev, 'Finding hospitals matching your symptoms...']);
    
    // Step 2: Check availability
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAutoBookingProgress(prev => [...prev, 'Checking real-time availability...']);
    
    // Step 3: Select best slot
    await new Promise(resolve => setTimeout(resolve, 1000));
    setAutoBookingProgress(prev => [...prev, 'Selecting optimal time slot...']);
    
    // Step 4: Book appointment
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAutoBookingProgress(prev => [...prev, 'Confirming appointment...']);
    
    // Simulate booking result
    const recommendedHospital = hospitals.find(h => h.urgencyScore >= 4.5);
    const recommendedSlot = recommendedHospital?.availableSlots.find(s => s.type === 'Urgent') || 
                           recommendedHospital?.availableSlots[0];
    
    setSelectedHospital(recommendedHospital);
    setSelectedSlot(recommendedSlot);
    setCurrentStep(3);
    setLoading(false);
  };

  const handleAutoBooking = () => {
    setBookingMode('auto');
    setCurrentStep(2);
    simulateAutoBooking();
  };

  const handleManualBooking = () => {
    setBookingMode('manual');
    setCurrentStep(2);
  };

  const handleHospitalSelect = (hospital) => {
    setSelectedHospital(hospital);
    setCurrentStep(3);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setCurrentStep(4);
  };

  const confirmAppointment = async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setAppointmentDetails({
      id: `APT-${Date.now()}`,
      hospital: selectedHospital,
      slot: selectedSlot,
      patientInfo: JSON.parse(localStorage.getItem('user')),
      confirmationNumber: `MC${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      bookedAt: new Date().toISOString()
    });
    
    setCurrentStep(5);
    setLoading(false);
  };

  const BookingModeSelector = () => {
    const urgencyRec = getUrgencyRecommendation();
    
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Book Your Appointment
          </h1>
          <p className="text-gray-600 text-lg">
            Based on your symptoms, we recommend scheduling a consultation
          </p>
        </div>

        {/* Symptom Analysis Summary */}
        {symptomAnalysis && (
          <div className="card p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Symptom Analysis Result
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Severity: {symptomAnalysis.severityScore}/10</span>
                  <span>Risk: {symptomAnalysis.riskLevel}</span>
                  <span>{symptomAnalysis.recommendation.action}</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                symptomAnalysis.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
                symptomAnalysis.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {symptomAnalysis.riskLevel} RISK
              </div>
            </div>
          </div>
        )}

        {/* Booking Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Automatic Booking */}
          <div className={`card p-6 cursor-pointer transition-all duration-300 ${
            urgencyRec === 'auto' ? 'ring-2 ring-red-500 bg-red-50' :
            urgencyRec === 'recommended-auto' ? 'ring-2 ring-yellow-500 bg-yellow-50' :
            'hover:shadow-lg'
          }`} onClick={handleAutoBooking}>
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl ${
                urgencyRec === 'auto' ? 'bg-red-500' :
                urgencyRec === 'recommended-auto' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">Automatic Booking</h3>
                  {urgencyRec === 'auto' && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium">
                      RECOMMENDED
                    </span>
                  )}
                  {urgencyRec === 'recommended-auto' && (
                    <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full font-medium">
                      SUGGESTED
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">
                  Let our AI find the best available appointment based on your symptom urgency and location.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Priority scheduling for urgent cases</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Real-time availability matching</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Automatic calendar integration</span>
                  </li>
                </ul>
                {urgencyRec === 'auto' && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">High severity detected - Automatic booking recommended</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manual Booking */}
          <div className="card p-6 cursor-pointer hover:shadow-lg transition-all duration-300" onClick={handleManualBooking}>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-gray-500 rounded-xl">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Manual Booking</h3>
                <p className="text-gray-600 mb-4">
                  Browse available hospitals and time slots to choose your preferred appointment.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Full control over selection</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Compare hospitals and reviews</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Flexible timing options</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  };

  const AutoBookingProgress = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Finding Your Best Appointment
        </h2>
        <p className="text-gray-600">
          Our AI is working to find the optimal appointment based on your symptoms
        </p>
      </div>

      <div className="card p-8">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        </div>

        <div className="space-y-4">
          {autoBookingProgress.map((step, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-gray-700">{step}</span>
              {index === autoBookingProgress.length - 1 ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin ml-auto" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          This usually takes 15-30 seconds...
        </div>
      </div>
    </div>
  );

  const HospitalSelection = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select a Healthcare Facility
        </h2>
        <p className="text-gray-600">
          Choose from available hospitals and clinics near you
        </p>
      </div>

      <div className="space-y-4">
        {hospitals.map((hospital) => (
          <div
            key={hospital.id}
            className="card p-6 cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => handleHospitalSelect(hospital)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {hospital.name}
                    </h3>
                    <p className="text-blue-600 font-medium">{hospital.specialization}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-yellow-500 mb-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{hospital.rating}</span>
                      <span className="text-gray-500">({hospital.reviewCount})</span>
                    </div>
                    <div className="text-sm text-gray-500">{hospital.distance} away</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{hospital.address}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Wait: {hospital.waitTime}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {hospital.features.slice(0, 4).map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600 font-medium">
                      {hospital.availableSlots.length} slots available today
                    </span>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Select
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TimeSlotSelection = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Time Slot
        </h2>
        <p className="text-gray-600">
          Choose your preferred appointment time at {selectedHospital?.name}
        </p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{selectedHospital?.name}</h3>
            <p className="text-gray-600 text-sm">{selectedHospital?.specialization}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedHospital?.availableSlots.map((slot) => (
          <div
            key={slot.id}
            className={`card p-4 cursor-pointer transition-all duration-200 ${
              selectedSlot?.id === slot.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleSlotSelect(slot)}
          >
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {slot.time}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {new Date(slot.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                slot.type === 'Urgent' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {slot.type === 'Urgent' ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                <span>{slot.type}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">{slot.duration}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setCurrentStep(4)}
            className="btn-primary shadow-lg"
          >
            Continue to Confirmation
          </button>
        </div>
      )}
    </div>
  );

  const AppointmentConfirmation = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Confirm Your Appointment
        </h2>
        <p className="text-gray-600">
          Review your appointment details before confirmation
        </p>
      </div>

      <div className="card p-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Hospital</span>
            <span className="font-semibold text-gray-900">{selectedHospital?.name}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Date & Time</span>
            <span className="font-semibold text-gray-900">
              {selectedSlot?.date} at {selectedSlot?.time}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Specialization</span>
            <span className="font-semibold text-gray-900">{selectedHospital?.specialization}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <span className="text-gray-600">Address</span>
            <span className="font-semibold text-gray-900 text-right">{selectedHospital?.address}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Appointment Type</span>
            <span className="font-semibold text-gray-900">{selectedSlot?.type} Consultation</span>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <span>Reminder Settings</span>
        </h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <span className="text-gray-700">Email reminder 24 hours before</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            <span className="text-gray-700">SMS reminder 2 hours before</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" className="rounded text-blue-600" />
            <span className="text-gray-700">Add to calendar (Google/Outlook)</span>
          </label>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setCurrentStep(3)}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={confirmAppointment}
          disabled={loading}
          className="flex-1 btn-primary disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming...</span>
            </div>
          ) : (
            'Confirm Appointment'
          )}
        </button>
      </div>
    </div>
  );

  const BookingComplete = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="card p-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Appointment Confirmed!
        </h2>
        
        <p className="text-gray-600 mb-6">
          Your appointment has been successfully scheduled
        </p>

        <div className="card p-6 bg-green-50 border border-green-200 mb-6">
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmation Number:</span>
              <span className="font-mono font-semibold">{appointmentDetails?.confirmationNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Hospital:</span>
              <span className="font-semibold">{appointmentDetails?.hospital.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span className="font-semibold">
                {appointmentDetails?.slot.date} at {appointmentDetails?.slot.time}
              </span>
            </div>
          </div>
        </div>

        {/* Lifestyle Recommendations Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-gray-900">Personalized Health Guidance</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Get AI-powered lifestyle recommendations based on your symptoms to support your recovery and overall wellness.
          </p>
          <button
            onClick={onShowLifestyleRecommendations}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <Heart className="w-5 h-5" />
            <span>View Lifestyle Recommendations</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <button
            onClick={onBackToDashboard}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            Add to Calendar
          </button>
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Header */}
        {(currentStep > 1 && currentStep < 5) && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-8">
              {[
                { step: 1, label: 'Booking Mode' },
                { step: 2, label: bookingMode === 'auto' ? 'Finding Slot' : 'Select Hospital' },
                { step: 3, label: bookingMode === 'auto' ? 'Review' : 'Select Time' },
                { step: 4, label: 'Confirm' }
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 text-gray-400'
                  } font-semibold transition-all duration-300`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                    } transition-all duration-300`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && <BookingModeSelector />}
        {currentStep === 2 && bookingMode === 'auto' && <AutoBookingProgress />}
        {currentStep === 2 && bookingMode === 'manual' && <HospitalSelection />}
        {currentStep === 3 && bookingMode === 'manual' && <TimeSlotSelection />}
        {currentStep === 3 && bookingMode === 'auto' && <AppointmentConfirmation />}
        {currentStep === 4 && <AppointmentConfirmation />}
        {currentStep === 5 && <BookingComplete />}
      </div>
    </div>
  );
};

export default AppointmentScheduler;
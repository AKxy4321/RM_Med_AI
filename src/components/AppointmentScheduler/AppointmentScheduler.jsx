import React, { useState, useEffect } from "react";

import {
  Clock,
  MapPin,
  CheckCircle,
  Loader2,
  Zap,
  Settings,
  Star,
  Sparkles,
  Heart,
  Brain
} from "lucide-react";

import {
  collection,
  getDocs,
  orderBy,
  query,
  limit
} from "firebase/firestore";
import { db } from "../../firebase";


const AppointmentScheduler = ({
  onBackToDashboard,
  onShowLifestyleRecommendations,
}) => {
  const [bookingMode, setBookingMode] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoBookingProgress, setAutoBookingProgress] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [healthInput, setHealthInput] = useState("");
  const [localAnalysis, setLocalAnalysis] = useState({
  severity_score: 0,
  risk_level: "UNKNOWN",
  ai_summary: "",
  recommendation: {},
});
const analysis = localAnalysis;

useEffect(() => {
  const loadUserSymptoms = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return;

      const ref = collection(db, "users", String(user.id), "symptom_records");
      const q = query(ref, orderBy("created_at", "desc"), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        const detected = Array.isArray(latest.detected_symptoms)
          ? latest.detected_symptoms
          : [];

        if (detected.length > 0) {
          setHealthInput(detected.join(", "));
        } else if (latest.ai_summary) {
          setHealthInput(latest.ai_summary);
        }

        setLocalAnalysis({
          severity_score: latest.severity_score ?? 0,
          risk_level: latest.risk_level ?? "UNKNOWN",
          ai_summary: latest.ai_summary ?? "",
          recommendation: latest.recommendation || {},
        });
      }
    } catch (err) {
      console.error("Failed to load latest symptoms from Firebase:", err);
    }
  };

  loadUserSymptoms();
}, []);

  useEffect(() => {
    if (userLocation) {
      fetchHospitals(userLocation);
    }
  }, [userLocation]);

  const enableLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { 
          latitude: pos.coords.latitude, 
          longitude: pos.coords.longitude 
        };
        setUserLocation(coords);
        setLocationEnabled(true);
        setLoading(false);
      },
      (err) => {
        console.error("Location error:", err);
        setLoading(false);
        alert("Unable to get location. Please allow access or try again.");
      }
    );
  };

  const fetchHospitals = async (coords) => {
    try {
      console.log("Fetching hospitals with coordinates:", coords);
      const response = await fetch("http://localhost:5000/api/emergency-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: healthInput || "general",
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Hospital API response:", data);
      
      if (data.hospitals && Array.isArray(data.hospitals) && data.hospitals.length > 0) {
        const formattedHospitals = data.hospitals.map((h, i) => ({
          id: i + 1,
          name: h.name || "Nearby Hospital",
          address: h.address || "Address unavailable",
          distance: h.distance ? h.distance.toString() : (2 + i * 0.5).toString(),
          specialization: h.specialization || "General Medicine",
          rating: h.rating || 4.0 + (Math.random() * 0.8),
          reviewCount: h.reviewCount || Math.floor(Math.random() * 200),
          waitTime: h.waitTime || "20–40 mins",
          availableSlots: h.availableSlots || [
            {
              id: 100 + i,
              date: new Date().toISOString().split("T")[0],
              time: "10:30 AM",
              type: "Standard",
              duration: "30 min",
            },
            {
              id: 200 + i,
              date: new Date().toISOString().split("T")[0],
              time: "03:00 PM",
              type: "Standard",
              duration: "30 min",
            },
          ],
        }));
        console.log("Formatted hospitals:", formattedHospitals);
        setHospitals(formattedHospitals);
      } else {
        throw new Error("No hospitals found from API response.");
      }
    } catch (err) {
      console.error("Hospital fetch error:", err);
      alert("Failed to load hospitals. Please try again later.");
      setHospitals([]);
    }
  };

  const getUrgencyRecommendation = () => {
    const severity = analysis?.severity_score || 0;
    if (severity >= 8) return "auto";
    if (severity >= 5) return "recommended-auto";
    return "manual";
  };

  const handleAutoBooking = async () => {
    setBookingMode("auto");
    setCurrentStep(2);
    
    // Ensure we have hospitals data before proceeding
    if (hospitals.length === 0 && userLocation) {
      setAutoBookingProgress(["Getting your location...", "Fetching nearby hospitals..."]);
      await fetchHospitals(userLocation);
    }
    
    await simulateAutoBooking();
  };

  const simulateAutoBooking = async () => {
    setLoading(true);
    setAutoBookingProgress(["Analyzing symptoms...", "Finding best hospital..."]);
    await new Promise((r) => setTimeout(r, 1500));
  
    let availableHospitals = [];

    if (hospitals.length > 0) {
      availableHospitals = hospitals;
    } else {
      console.error("No hospitals found at all. Cannot continue booking.");
      alert("No hospitals were found nearby. Please try again later or adjust your location settings.");
      setLoading(false);
      setCurrentStep(1);
      return;
    }

    console.log("Available hospitals for auto-booking:", availableHospitals);
  
    let nearestHospital = null;

    if (availableHospitals.length > 0) {
      try {
        nearestHospital = availableHospitals.reduce((closest, current) => {
          const distA = parseFloat(closest.distance);
          const distB = parseFloat(current.distance);
          console.log(`Comparing ${closest.name} (${distA}) vs ${current.name} (${distB})`);
          return distA < distB ? closest : current;
        });
      } catch (err) {
        console.warn("Error determining nearest hospital, using first one:", err);
        nearestHospital = availableHospitals[0];
      }
    } else {
      console.error("No hospitals available to select from.");
      alert("No hospitals found nearby. Please try again later.");
      setLoading(false);
      setCurrentStep(1);
      return;
    }
  
    console.log("Selected nearest hospital:", nearestHospital);
    setAutoBookingProgress((p) => [...p, `Selected: ${nearestHospital.name}`]);
    await new Promise((r) => setTimeout(r, 1500));
  
    // ✅ Step 2: Choose earliest time slot
    let earliestSlot = null;
    if (nearestHospital.availableSlots?.length > 0) {
      try {
        earliestSlot = nearestHospital.availableSlots.reduce((earliest, current) => {
          const parseTime = (t) => {
            const [time, period] = t.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (period === "PM" && hours !== 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0;
            return hours * 60 + minutes;
          };
          return parseTime(earliest.time) < parseTime(current.time) ? earliest : current;
        });
      } catch (err) {
        console.warn("Error selecting earliest slot, using first one:", err);
        earliestSlot = nearestHospital.availableSlots[0];
      }
    } else {
      earliestSlot = {
        id: 999,
        date: new Date().toISOString().split("T")[0],
        time: "09:00 AM",
        type: "Standard",
        duration: "30 min",
      };
    }
  
    setAutoBookingProgress((p) => [...p, `Selected time: ${earliestSlot.time}`]);
    await new Promise((r) => setTimeout(r, 1500));
  
    // ✅ Step 3: Create appointment details
    const appointment = {
      id: `APT-${Date.now()}`,
      hospital: nearestHospital,
      slot: earliestSlot,
      confirmationNumber: `MC${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      bookedAt: new Date().toISOString(),
    };
    
    setAppointmentDetails(appointment);
    setSelectedHospital(nearestHospital);
    setSelectedSlot(earliestSlot);
    
    setAutoBookingProgress((p) => [...p, "Appointment confirmed!"]);
    await new Promise((r) => setTimeout(r, 1000));
  
    // ✅ Step 4: Move to completion
    setLoading(false);
    setCurrentStep(5);
  };

  const handleManualBooking = () => {
    setBookingMode("manual");
    setCurrentStep(2);
  };

  const AutoBookingProgress = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-4">Automatic Booking in Progress</h3>
        
        <div className="space-y-3 mb-6">
          {autoBookingProgress.map((step, index) => (
            <div key={index} className="flex items-center space-x-3 text-left">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{step}</span>
            </div>
          ))}
        </div>
        
        <p className="text-gray-600">Please wait while we book your appointment...</p>
      </div>
    </div>
  );

  const BookingModeSelector = () => {
    const urgencyRec = getUrgencyRecommendation();

    return (
      <div className="max-w-4xl mx-auto space-y-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Book Your Appointment
        </h1>
        <p className="text-gray-600 text-lg">
          Based on your symptoms, we recommend scheduling a consultation
        </p>

        {/* Location Toggle */}
        <div className="flex justify-center items-center mt-4 space-x-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <span className="text-gray-700">Enable location to find nearby hospitals</span>
          <button
            onClick={enableLocation}
            disabled={loading}
            className={`ml-3 px-4 py-2 rounded-xl text-white ${
              locationEnabled ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Getting Location..." : locationEnabled ? "Enabled ✅" : "Enable"}
          </button>
        </div>

        {/* AI Summary */}
        {analysis?.ai_summary && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl border border-blue-200 text-left mt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="w-6 h-6 text-blue-700" />
              <h3 className="font-semibold text-blue-700">AI Summary</h3>
            </div>
            <p className="text-gray-700 whitespace-pre-line">{analysis.ai_summary}</p>
          </div>
        )}

        {/* Analysis Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Summary</h3>
          <p className="text-gray-700">
            Severity: {analysis?.severity_score || 0}/10 | Risk: {analysis?.risk_level || "Medium"}
          </p>
          <p className="text-blue-700 mt-1">{analysis?.recommendation?.action || "Schedule a consultation"}</p>
        </div>

        {/* Booking Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`cursor-pointer p-6 rounded-2xl border hover:shadow-lg transition ${
              urgencyRec === "auto" 
                ? "border-red-400 bg-red-50 ring-2 ring-red-200" 
                : urgencyRec === "recommended-auto"
                ? "border-orange-400 bg-orange-50"
                : "border-gray-200"
            }`}
            onClick={handleAutoBooking}
          >
            <Zap className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Automatic Booking</h3>
            <p className="text-gray-600 text-sm">Let AI book an appointment for you quickly.</p>
            {urgencyRec === "auto" && (
              <div className="mt-2 text-sm text-red-600 font-medium">
                🔴 Recommended for your symptoms
              </div>
            )}
            {urgencyRec === "recommended-auto" && (
              <div className="mt-2 text-sm text-orange-600 font-medium">
                🟡 Suggested for faster booking
              </div>
            )}
          </div>

          <div
            className="cursor-pointer p-6 rounded-2xl border border-gray-200 hover:shadow-lg bg-white"
            onClick={handleManualBooking}
          >
            <Settings className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Manual Booking</h3>
            <p className="text-gray-600 text-sm">Choose your hospital and time slot yourself.</p>
          </div>
        </div>
      </div>
    );
  };

  const HospitalSelection = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {hospitals.length > 0 ? "Select a Hospital Near You" : "Loading Hospitals..."}
      </h2>
      
      {hospitals.length === 0 ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Finding nearby hospitals...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hospitals.map((h) => (
            <div
              key={h.id}
              className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md cursor-pointer transition-all"
              onClick={() => { setSelectedHospital(h); setCurrentStep(3); }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{h.name}</h3>
                  <p className="text-sm text-gray-600">{h.specialization}</p>
                </div>
                <div className="text-right text-gray-500 text-sm">{h.distance} km away</div>
              </div>
              <p className="text-gray-700 text-sm mt-2">{h.address}</p>
              <div className="flex items-center mt-3 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 mr-1" />
                  {h.rating?.toFixed(1)} ({h.reviewCount} reviews)
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-blue-500 mr-1" />
                  Wait: {h.waitTime}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const TimeSlotSelection = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Select a Time Slot</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {selectedHospital?.availableSlots?.map((slot) => (
          <div
            key={slot.id}
            className={`border p-4 rounded-xl text-center cursor-pointer transition ${
              selectedSlot?.id === slot.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:shadow-md"
            }`}
            onClick={() => setSelectedSlot(slot)}
          >
            <p className="font-semibold text-gray-900">{slot.time}</p>
            <p className="text-sm text-gray-600">{slot.duration}</p>
            <p className="text-xs text-gray-500">{slot.type} slot</p>
          </div>
        ))}
      </div>
      {selectedSlot && (
        <div className="text-center mt-6">
          <button
            onClick={() => setCurrentStep(4)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
          >
            Continue to Confirmation
          </button>
        </div>
      )}
    </div>
  );

  const AppointmentConfirmation = () => (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Confirm Appointment Details</h2>
      <div className="space-y-3 text-gray-700">
        <p><strong>Hospital:</strong> {selectedHospital?.name}</p>
        <p><strong>Date & Time:</strong> {selectedSlot?.date} at {selectedSlot?.time}</p>
        <p><strong>Specialization:</strong> {selectedHospital?.specialization}</p>
        <p><strong>Address:</strong> {selectedHospital?.address}</p>
        <p><strong>Distance:</strong> {selectedHospital?.distance} km away</p>
      </div>
      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={() => setCurrentStep(3)}
          className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            await new Promise((r) => setTimeout(r, 1500));
            setAppointmentDetails({
              id: `APT-${Date.now()}`,
              hospital: selectedHospital,
              slot: selectedSlot,
              confirmationNumber: `MC${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              bookedAt: new Date().toISOString(),
            });
            setLoading(false);
            setCurrentStep(5);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          Confirm Appointment
        </button>
      </div>
    </div>
  );

  const BookingComplete = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Appointment Confirmed!</h2>
        <p className="text-gray-600 mb-6">Your appointment has been successfully scheduled.</p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 text-left">
          <p><strong>Confirmation:</strong> {appointmentDetails?.confirmationNumber}</p>
          <p><strong>Hospital:</strong> {appointmentDetails?.hospital.name}</p>
          <p><strong>Date & Time:</strong> {appointmentDetails?.slot.date} at {appointmentDetails?.slot.time}</p>
          <p><strong>Address:</strong> {appointmentDetails?.hospital.address}</p>
          <p><strong>Distance:</strong> {appointmentDetails?.hospital.distance} km away</p>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
          <div className="flex items-center space-x-3 mb-3">
            <Sparkles className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-gray-900">Personalized Health Guidance</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Get AI-powered lifestyle recommendations to support your recovery and wellness.
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
          <button
            onClick={() => {
              const { hospital, slot, confirmationNumber } = appointmentDetails;
              const start = new Date(`${slot.date} ${slot.time}`);
              const end = new Date(start.getTime() + 30 * 60000);
              const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
              const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Medisense Scheduler//EN
BEGIN:VEVENT
UID:${confirmationNumber}@medisense
DTSTAMP:${fmt(new Date())}
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:Appointment at ${hospital.name}
DESCRIPTION:Appointment confirmation: ${confirmationNumber}\\nSpecialization: ${hospital.specialization}\\nAddress: ${hospital.address}
LOCATION:${hospital.address}
END:VEVENT
END:VCALENDAR`.trim();
              const blob = new Blob([ics], { type: "text/calendar" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `${hospital.name.replace(/\s+/g, "_")}_appointment.ics`;
              link.click();
              URL.revokeObjectURL(link.href);
            }}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Add to Calendar
          </button>
          <button
            onClick={() => {
              const { hospital, slot, confirmationNumber } = appointmentDetails;
              const win = window.open("", "_blank", "width=700,height=800");
              win.document.write(`
<html><head><title>Confirmation</title></head><body style="font-family:Arial;padding:20px">
<h1 style="color:#16a34a">Appointment Confirmation</h1>
<p><b>Confirmation:</b> ${confirmationNumber}</p>
<p><b>Hospital:</b> ${hospital.name}</p>
<p><b>Date & Time:</b> ${slot.date} at ${slot.time}</p>
<p><b>Address:</b> ${hospital.address}</p><hr><small>Generated by Medisense Scheduler</small></body></html>
`);
              win.document.close();
              win.print();
            }}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentStep === 1 && <BookingModeSelector />}
        
        {currentStep === 2 && bookingMode === "manual" && <HospitalSelection />}
        
        {currentStep === 2 && bookingMode === "auto" && (
          loading ? <AutoBookingProgress /> : null
        )}
        
        {currentStep === 3 && bookingMode === "manual" && <TimeSlotSelection />}
        
        {currentStep === 4 && bookingMode === "manual" && <AppointmentConfirmation />}
        
        {currentStep === 5 && <BookingComplete />}
      </div>
    </div>
  );
};

export default AppointmentScheduler;

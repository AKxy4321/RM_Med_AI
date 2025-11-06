// src/components/EmergencySupport/EmergencySupport.jsx
import React, { useState, useEffect } from 'react';
import { Phone, MapPin, AlertCircle, Hospital, Navigation } from 'lucide-react';
import '../../App.css';

export default function EmergencySupport() {
  const [symptoms, setSymptoms] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [emergencyData, setEmergencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedPhone, setCopiedPhone] = useState('');

  const getUserLocation = () => {
    setLocationLoading(true);
    setError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationLoading(false);
        },
        () => {
          setError('Unable to get your location. Please enable location services.');
          setLocationLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
    }
  };

  const checkSymptoms = async () => {
    if (!symptoms.trim()) {
      setError('Please enter symptoms');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/emergency-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude
        })
      });

      const data = await response.json();
      setEmergencyData(data);

      if (data.hospitals?.length > 0) {
        setHospitals(data.hospitals);
        setError('');
      } else {
        setError('No hospitals found nearby. Try enabling location or call emergency services at 108.');
      }
    } catch {
      setError('Error connecting to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getNearbyHospitals = async () => {
    if (!userLocation) {
      setError('Please enable location first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/nearby-hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          max_distance: 10
        })
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();

      if (data.hospitals?.length > 0) {
        setHospitals(data.hospitals);
        setError('');
      } else {
        setError(data.message || 'No hospitals found nearby. Try Google Maps or call 108.');
      }
    } catch {
      setError('Error connecting to server. Ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const copyPhoneNumber = (phoneNumber, hospitalName) => {
    if (!phoneNumber || phoneNumber === 'N/A') {
      alert(
        `⚠️ Phone number not available for ${hospitalName}.\n\nPlease use Directions or call emergency services: 108`
      );
      return;
    }

    navigator.clipboard
      .writeText(phoneNumber)
      .then(() => {
        setCopiedPhone(phoneNumber);
        alert(`✅ Phone number copied!\n\n${hospitalName}\n📞 ${phoneNumber}`);
        setTimeout(() => setCopiedPhone(''), 3000);
      })
      .catch(() => {
        alert(`${hospitalName}\n📞 ${phoneNumber}\n\n(Long-press to copy this number)`);
      });
  };

  const openInMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="header-card">
          <div className="header-title">
            <AlertCircle className="icon-red icon-lg" />
            <h1>Emergency Support System</h1>
          </div>
          <p className="header-subtitle">Quick access to emergency medical assistance</p>
        </div>

        <div className="location-card">
          <div className="location-status">
            <div className="location-info">
              <MapPin className="icon-blue icon-sm" />
              <span>Your Location:</span>
              {userLocation ? (
                <span className="status-enabled">✓ Enabled</span>
              ) : (
                <span className="status-disabled">Not enabled</span>
              )}
            </div>
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="btn btn-primary"
            >
              {locationLoading ? 'Getting Location...' : 'Enable Location'}
            </button>
          </div>
        </div>

        <div className="section-card">
          <h2 className="section-title">
            <AlertCircle className="icon-red icon-md" />
            Check Your Symptoms
          </h2>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe your symptoms (e.g., chest pain, difficulty breathing, severe bleeding...)"
            className="symptom-textarea"
            rows="4"
          />
          <button
            onClick={checkSymptoms}
            disabled={loading || !symptoms.trim()}
            className="btn btn-danger btn-full"
          >
            {loading ? 'Checking...' : 'Check Symptoms & Get Emergency Help'}
          </button>
        </div>

        {emergencyData?.is_emergency && (
          <div className="emergency-alert">
            <h2>⚠️ EMERGENCY DETECTED!</h2>
            <p>{emergencyData.message}</p>
            <p className="bold-text">Call emergency services immediately: 108</p>
          </div>
        )}

        <div className="section-card">
          <h2 className="section-title">
            <Hospital className="icon-blue icon-md" />
            Find Nearby Hospitals
          </h2>
          <button
            onClick={getNearbyHospitals}
            disabled={loading || !userLocation}
            className="btn btn-primary btn-full"
          >
            {loading ? 'Finding Hospitals...' : 'Show Nearby Hospitals'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            {userLocation && (
              <button
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/hospitals+near+me/@${userLocation.latitude},${userLocation.longitude},13z`,
                    '_blank'
                  )
                }
                className="btn btn-primary btn-full"
              >
                🔍 Search Hospitals on Google Maps
              </button>
            )}
          </div>
        )}

        {hospitals.length > 0 && (
          <div>
            <h2 className="hospitals-header">
              Nearby Hospitals ({hospitals.length})
            </h2>
            {hospitals.map((hospital) => (
              <div key={hospital.id} className="hospital-card">
                <div className="hospital-header">
                  <div className="hospital-info">
                    <h3>{hospital.name}</h3>
                    <p>{hospital.address}</p>
                    {hospital.phone && hospital.phone !== 'N/A' ? (
                      <p className="phone-hint">📞 Click below to copy number</p>
                    ) : (
                      <p className="no-phone">⚠️ Phone not available</p>
                    )}
                  </div>
                  {hospital.distance && (
                    <div className="distance-badge">{hospital.distance} km</div>
                  )}
                </div>

                <div className="hospital-actions">
                  <button
                    onClick={() => copyPhoneNumber(hospital.phone, hospital.name)}
                    className="btn-success"
                    disabled={!hospital.phone || hospital.phone === 'N/A'}
                  >
                    <Phone className="icon-sm" />
                    {copiedPhone === hospital.phone
                      ? '✓ Copied!'
                      : hospital.phone && hospital.phone !== 'N/A'
                      ? 'Get Phone'
                      : 'No Phone'}
                  </button>

                  <button
                    onClick={() => openInMaps(hospital.lat, hospital.lng)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <Navigation className="icon-sm" />
                    Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="emergency-services-card">
          <h3>Emergency Services</h3>
          <p>For immediate emergency assistance, call:</p>
          <button
            onClick={() => copyPhoneNumber('108', 'Emergency Ambulance Service')}
            className="emergency-number-btn"
          >
            📞 {copiedPhone === '108' ? '✓ Copied! 108' : '108 (Ambulance)'}
          </button>
        </div>
      </div>
    </div>
  );
}

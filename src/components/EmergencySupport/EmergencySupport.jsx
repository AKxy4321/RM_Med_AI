import { useState, useEffect } from 'react';
import { Phone, MapPin, AlertCircle, Hospital, Navigation, ArrowLeft } from 'lucide-react';

const EmergencySupport = ({ onBackToDashboard }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
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
            longitude: position.coords.longitude,
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

  const getNearbyHospitals = async () => {
    if (!userLocation) {
      setError('Please enable location first.');
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
          max_distance: 10,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      if (data.hospitals?.length > 0) {
        setHospitals(data.hospitals);
      } else {
        setError(data.message || 'No hospitals found nearby.');
      }
    } catch {
      setError('Error connecting to server. Ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const copyPhoneNumber = (phoneNumber, hospitalName) => {
    if (!phoneNumber || phoneNumber === 'N/A') {
      alert(`⚠️ Phone number not available for ${hospitalName}. Try Directions or call 108.`);
      return;
    }
    navigator.clipboard
      .writeText(phoneNumber)
      .then(() => {
        setCopiedPhone(phoneNumber);
        alert(`✅ Phone number copied!\n${hospitalName}\n📞 ${phoneNumber}`);
        setTimeout(() => setCopiedPhone(''), 3000);
      })
      .catch(() => alert(`${hospitalName}\n📞 ${phoneNumber}`));
  };

  const openInMaps = (lat, lng) =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');

  useEffect(() => {
    getUserLocation();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-red-600 to-pink-500 rounded-2xl shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent">
                Emergency Support
              </h1>
              <p className="text-gray-600">Quick access to emergency help</p>
            </div>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={onBackToDashboard}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {/* Location Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MapPin className="text-blue-600 w-5 h-5" />
              <div>
                <p className="font-medium text-gray-800">Your Location</p>
                <p className="text-sm text-gray-500">
                  {userLocation ? '✓ Enabled' : 'Not enabled'}
                </p>
              </div>
            </div>
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition disabled:opacity-50"
            >
              {locationLoading ? 'Getting...' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Hospital Finder */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Hospital className="text-blue-600 w-6 h-6" />
            <h2 className="text-xl font-semibold text-gray-900">Find Nearby Hospitals</h2>
          </div>
          <button
            onClick={getNearbyHospitals}
            disabled={loading || !userLocation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Finding Hospitals...' : 'Show Nearby Hospitals'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            <p>{error}</p>
            {userLocation && (
              <button
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/hospitals+near+me/@${userLocation.latitude},${userLocation.longitude},13z`,
                    '_blank'
                  )
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl mt-3 transition"
              >
                Search on Google Maps
              </button>
            )}
          </div>
        )}

        {/* Hospitals */}
        {hospitals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Nearby Hospitals</h2>
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
                    <p className="text-gray-600 text-sm">{hospital.address}</p>
                    {hospital.phone && hospital.phone !== 'N/A' ? (
                      <p className="text-xs text-gray-500 mt-1">📞 Tap to copy</p>
                    ) : (
                      <p className="text-xs text-red-500 mt-1">⚠️ No phone available</p>
                    )}
                  </div>
                  {hospital.distance && (
                    <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded-lg">
                      {hospital.distance} km
                    </span>
                  )}
                </div>

                <div className="flex mt-4 space-x-3">
                  <button
                    onClick={() => copyPhoneNumber(hospital.phone, hospital.name)}
                    disabled={!hospital.phone || hospital.phone === 'N/A'}
                    className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl w-1/2 transition disabled:opacity-50"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {copiedPhone === hospital.phone ? '✓ Copied!' : 'Get Phone'}
                  </button>
                  <button
                    onClick={() => openInMaps(hospital.lat, hospital.lng)}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl w-1/2 transition"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emergency number */}
        <div className="bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-2xl p-6 mt-8 text-center shadow-md">
          <h3 className="text-xl font-semibold mb-2">Emergency Services</h3>
          <p className="text-sm mb-3">For urgent medical help, call:</p>
          <button
            onClick={() => copyPhoneNumber('108', 'Emergency Ambulance Service')}
            className="bg-white text-red-600 font-bold px-6 py-3 rounded-xl hover:bg-red-50 transition"
          >
            {copiedPhone === '108' ? '✓ Copied! 108' : '📞 108 (Ambulance)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencySupport;

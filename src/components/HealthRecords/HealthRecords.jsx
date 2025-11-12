import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Download,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock4,
  ArrowLeft
} from 'lucide-react';

const HealthRecords = ({ onBackToDashboard }) => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load records from localStorage on component mount
  useEffect(() => {
    loadRecords();
  }, []);

  // Filter records when search term or filters change
  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, dateFilter]);

  const loadRecords = () => {
    try {
      const storedRecords = localStorage.getItem('healthRecords');
      console.log('Loaded records from localStorage:', storedRecords);
      if (storedRecords) {
        const parsedRecords = JSON.parse(storedRecords);
        setRecords(parsedRecords);
      }
    } catch (error) {
      console.error('Error loading health records:', error);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.hospital?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.hospital?.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.confirmationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.slot.date);
        switch (dateFilter) {
          case 'today':
            return recordDate.getTime() === today.getTime();
          case 'upcoming':
            return recordDate >= today;
          case 'past':
            return recordDate < today;
          default:
            return true;
        }
      });
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.slot.date) - new Date(a.slot.date));
    
    setFilteredRecords(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'upcoming':
        return <Clock4 className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateStatus = (record) => {
    const today = new Date();
    const recordDate = new Date(record.slot.date);
    
    if (record.status === 'cancelled') return 'cancelled';
    if (recordDate < today) return 'completed';
    return 'upcoming';
  };

  const updateRecordStatus = (recordId, newStatus) => {
    const updatedRecords = records.map(record => {
      if (record.id === recordId) {
        return { ...record, status: newStatus };
      }
      return record;
    });
    
    setRecords(updatedRecords);
    localStorage.setItem('healthRecords', JSON.stringify(updatedRecords));
  };

  const deleteRecord = (recordId) => {
    const updatedRecords = records.filter(record => record.id !== recordId);
    setRecords(updatedRecords);
    localStorage.setItem('healthRecords', JSON.stringify(updatedRecords));
  };

  const clearAllRecords = () => {
    localStorage.removeItem('healthRecords');
    setRecords([]);
    setShowClearConfirm(false);
  };

  const exportRecords = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-records-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const RecordCard = ({ record }) => {
    const isExpanded = expandedRecord === record.id;
    const status = record.status || calculateStatus(record);

    return (
      <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">{record.hospital.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)} flex items-center space-x-1`}>
                  {getStatusIcon(status)}
                  <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(record.slot.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{record.slot.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{record.hospital.distance} km away</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Appointment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confirmation Number:</span>
                      <span className="font-medium">{record.confirmationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Specialization:</span>
                      <span className="font-medium">{record.hospital.specialization}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{record.slot.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booked On:</span>
                      <span className="font-medium">
                        {new Date(record.bookedAt).toLocaleDateString()} at {new Date(record.bookedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Hospital Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium text-right max-w-xs">{record.hospital.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium">{record.hospital.rating}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wait Time:</span>
                      <span className="font-medium">{record.hospital.waitTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {status === 'upcoming' && (
                  <>
                    <button
                      onClick={() => updateRecordStatus(record.id, 'completed')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => updateRecordStatus(record.id, 'cancelled')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Cancel Appointment
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteRecord(record.id)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Record</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Health Records</h1>
              <p className="text-gray-600">Manage and view your medical appointments and history</p>
            </div>
            <button
              onClick={onBackToDashboard}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{records.length}</div>
              <div className="text-gray-600 text-sm">Total Records</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">
                {records.filter(r => calculateStatus(r) === 'upcoming').length}
              </div>
              <div className="text-gray-600 text-sm">Upcoming</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-green-600">
                {records.filter(r => calculateStatus(r) === 'completed').length}
              </div>
              <div className="text-gray-600 text-sm">Completed</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-red-600">
                {records.filter(r => r.status === 'cancelled').length}
              </div>
              <div className="text-gray-600 text-sm">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search hospitals, specializations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={exportRecords}
                disabled={records.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={records.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="space-y-4">
          {filteredRecords.length > 0 ? (
            filteredRecords.map(record => (
              <RecordCard key={record.id} record={record} />
            ))
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No records found</h3>
              <p className="text-gray-600 mb-6">
                {records.length === 0 
                  ? "You don't have any health records yet. Book an appointment to get started."
                  : "No records match your current filters."
                }
              </p>
              {records.length === 0 && (
                <button
                  onClick={onBackToDashboard}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book an Appointment
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Clear All Records</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all health records? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllRecords}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecords;
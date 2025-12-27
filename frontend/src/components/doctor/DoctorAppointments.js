import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Filter, Search, Loader, DollarSign, CheckCircle, RefreshCw } from 'lucide-react';
import { getTodaysAppointments, completeAppointment, getPatientRecords, updateAppointmentStatus, normalizePatient } from '../../services/doctorService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const DoctorAppointments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [completionData, setCompletionData] = useState({
    diagnosis: '',
    treatmentNotes: '',
    followUpRequired: false
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null);

  // FIX: Safe data extraction function
  const extractAppointmentsData = (response) => {
    console.log('Raw appointments response:', response);
    
    if (!response) {
      console.warn('No response received');
      return [];
    }
    
    // If response is already an array, return it
    if (Array.isArray(response)) {
      return response;
    }
    
    // If response has a data property that's an array
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // If response has a nested data structure
    if (response.success && response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Check for common array properties
      const possibleArrayProps = ['appointments', 'records', 'items', 'list'];
      for (const prop of possibleArrayProps) {
        if (Array.isArray(response.data[prop])) {
          return response.data[prop];
        }
      }
    }
    
    // If no array found, return empty array
    console.warn('No appointments array found in response, returning empty array');
    return [];
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setIsLoading(true);
        const data = await getTodaysAppointments();
        
        // FIX: Use safe data extraction
        const appointmentsData = extractAppointmentsData(data);
        console.log('Extracted appointments:', appointmentsData);

        // Normalize appointments: ensure a patient object exists with common fields
        const normalized = (Array.isArray(appointmentsData) ? appointmentsData : []).map((apt) => {
          // prefer the appointment's patient object; normalize various shapes
          const resolved = normalizePatient(apt.patient || apt) || {};

          // If normalizePatient didn't find a name/username but appointment has direct fields, use them
          const patient = {
            id: resolved.id || apt.patientId || apt.patient_id || null,
            username: resolved.username || apt.username || null,
            first_name: resolved.first_name || apt.patient?.first_name || apt.first_name || null,
            last_name: resolved.last_name || apt.patient?.last_name || apt.last_name || null,
            email: resolved.email || apt.patient?.email || apt.email || null,
            patientId: resolved.patientId || apt.patientId || apt.patient_id || null,
            raw: resolved.raw || apt.patient || apt
          };

          return { ...apt, patient };
        });

        setAppointments(normalized);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load appointments');
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchAppointments();
    }
  }, [user]);

  // FIX: Safe filtering with array check
  const filteredAppointments = Array.isArray(appointments) 
    ? appointments.filter(appointment => {
        if (filter === 'all') return true;
        return appointment.status === filter;
      })
    : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'waiting':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const handleCompleteAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setCompletionData({
      diagnosis: '',
      treatmentNotes: '',
      followUpRequired: false
    });
    setShowCompleteModal(true);
  };

  const submitCompleteAppointment = async () => {
    try {
      if (!completionData.treatmentNotes.trim()) {
        toast.error('Please enter treatment notes');
        return;
      }

      await completeAppointment(selectedAppointment.id, completionData);
      
      setAppointments(prev => 
        Array.isArray(prev) 
          ? prev.map(apt => 
              apt.id === selectedAppointment.id 
                ? { ...apt, status: 'completed' }
                : apt
            )
          : []
      );

      toast.success('Appointment completed successfully.');
      setShowCompleteModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Failed to complete appointment');
    }
  };

  const handleStartConsultation = async (appointment) => {
    try {
      setIsUpdatingStatus(appointment.id);
      
      await updateAppointmentStatus(appointment.id, 'in_progress');
      
      setAppointments(prev => 
        Array.isArray(prev)
          ? prev.map(apt => 
              apt.id === appointment.id 
                ? { ...apt, status: 'in_progress' }
                : apt
            )
          : []
      );
      
      toast.success('Consultation started');
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Failed to start consultation');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleViewPatient = async (appointment) => {
    try {
      // Support multiple possible id fields (patient.id, patientId, patient_id)
      const pid = appointment.patient?.id || appointment.patientId || appointment.patient_id || appointment.patient?.patientId || null;
      if (!pid) {
        toast.error('Patient information not available');
        return;
      }

      navigate(`/doctor/patients/${pid}`);
    } catch (error) {
      console.error('Error viewing patient:', error);
      toast.error('Failed to view patient details');
    }
  };

  const refreshAppointments = async () => {
    try {
      setIsLoading(true);
      const data = await getTodaysAppointments();
      const appointmentsData = extractAppointmentsData(data);
      const normalized = (Array.isArray(appointmentsData) ? appointmentsData : []).map((apt) => {
        const resolved = normalizePatient(apt.patient || apt) || {};
        const patient = {
          id: resolved.id || apt.patientId || apt.patient_id || null,
          username: resolved.username || apt.username || null,
          first_name: resolved.first_name || apt.patient?.first_name || apt.first_name || null,
          last_name: resolved.last_name || apt.patient?.last_name || apt.last_name || null,
          email: resolved.email || apt.patient?.email || apt.email || null,
          patientId: resolved.patientId || apt.patientId || apt.patient_id || null,
          raw: resolved.raw || apt.patient || apt
        };

        return { ...apt, patient };
      });

      setAppointments(normalized);
      toast.success('Appointments refreshed');
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      toast.error('Failed to refresh appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const getPatientName = (appointment) => {
    // Try multiple common fields for name/username/id
    const patient = appointment.patient || {};
    const name = patient.username || patient.name || appointment.patientName || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    const username = patient.username || appointment.username || null;
    const rawId = patient.patientId || patient.id || appointment.patientId || appointment.patient_id || null;

    // Format id to PATxxxxxx when numeric
    let formattedId = null;
    if (rawId !== null && rawId !== undefined && rawId !== '') {
      const parsed = parseInt(rawId);
      formattedId = !isNaN(parsed) ? `PAT${String(parsed).padStart(6, '0')}` : String(rawId);
    }

    if (name) return name;
    if (username) return username.startsWith('@') ? username : `@${username}`;
    if (formattedId) return formattedId;
    return 'Patient Name N/A';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Appointments</h1>
          <p className="text-gray-600">Manage your patient appointments for today</p>
        </div>
        <button 
          onClick={refreshAppointments}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-blue-600">Total Today</h3>
              <p className="text-2xl font-bold text-blue-600">
                {Array.isArray(appointments) ? appointments.length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-yellow-600">Scheduled</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {Array.isArray(appointments) ? appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-green-600">Completed</h3>
              <p className="text-2xl font-bold text-green-600">
                {Array.isArray(appointments) ? appointments.filter(a => a.status === 'completed').length : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-red-600">In Progress</h3>
              <p className="text-2xl font-bold text-red-600">
                {Array.isArray(appointments) ? appointments.filter(a => a.status === 'in_progress').length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          <div className="flex space-x-2 flex-wrap gap-2">
            {['all', 'scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                  filter === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {Array.isArray(filteredAppointments) && filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getPatientName(appointment)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {appointment.visit_type?.replace('_', ' ') || 
                         appointment.visitType?.replace('_', ' ') || 
                         appointment.type?.replace('_', ' ') || 
                         'Consultation'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {appointment.appointment_date 
                            ? new Date(appointment.appointment_date).toLocaleDateString()
                            : appointment.date
                            ? new Date(appointment.date).toLocaleDateString()
                            : 'Date not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          {appointment.start_time 
                            ? `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`
                            : appointment.time
                            ? formatTime(appointment.time)
                            : 'Time not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{appointment.room_number ? `Room ${appointment.room_number}` : 'Room TBD'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Duration: </span>
                        <span className="font-medium">{appointment.duration_minutes || 30} minutes</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Notes: </span>
                        <span className="font-medium">{appointment.notes || 'No notes'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status?.replace('_', ' ').charAt(0).toUpperCase() + 
                           appointment.status?.replace('_', ' ').slice(1) || 'Scheduled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {(appointment.status === 'scheduled' || appointment.status === 'confirmed' || appointment.status === 'waiting') && (
                    <button 
                      onClick={() => handleStartConsultation(appointment)}
                      disabled={isUpdatingStatus === appointment.id}
                      className="btn-primary text-sm px-3 py-1 flex items-center justify-center"
                    >
                      {isUpdatingStatus === appointment.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        'Start Consultation'
                      )}
                    </button>
                  )}
                  {appointment.status === 'in_progress' && (
                    <button 
                      onClick={() => handleCompleteAppointment(appointment)}
                      className="btn-success text-sm px-3 py-1 flex items-center space-x-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Complete & Bill</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleViewPatient(appointment)}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    View Patient
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You don't have any appointments scheduled for today."
                : `No ${filter.replace('_', ' ')} appointments found.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Complete Appointment Modal */}
      {showCompleteModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Complete Appointment
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient
                </label>
                <p className="text-sm text-gray-600">
                  {getPatientName(selectedAppointment)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnosis (Optional)
                </label>
                <input
                  type="text"
                  value={completionData.diagnosis}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter diagnosis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Treatment Notes *
                </label>
                <textarea
                  value={completionData.treatmentNotes}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, treatmentNotes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="4"
                  placeholder="Enter treatment details and notes..."
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={completionData.followUpRequired}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="followUpRequired" className="ml-2 block text-sm text-gray-900">
                  Follow-up appointment required
                </label>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg mt-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After completion, the patient will need to visit reception for billing and payment processing.
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitCompleteAppointment}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Complete Appointment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Filter, Loader, X, AlertCircle, CheckCircle, PauseCircle } from 'lucide-react';
import { 
  getAppointmentRequests, 
  requestAppointment, 
  cancelAppointmentRequest 
} from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const PatientAppointmentRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    preferredDate: '',
    preferredTimeSlot: '',
    visitType: '',
    urgency: 'normal',
    symptoms: '',
    preferredDoctorId: '',
    notes: ''
  });

  // Appointment requests are loaded from backend via service

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      let data;
      
      try {
        const data = await getAppointmentRequests();
        setRequests(data || []);
      } catch (error) {
        console.error('Failed to load appointment requests from backend:', error);
        toast.error('Failed to load appointment requests');
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching appointment requests:', error);
      toast.error('Failed to load appointment requests from server');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
      try {
        await requestAppointment(formData);
        toast.success('Appointment request submitted successfully');
        setShowRequestForm(false);
        setFormData({
          preferredDate: '',
          preferredTimeSlot: '',
          visitType: '',
          urgency: 'normal',
          symptoms: '',
          preferredDoctorId: '',
          notes: ''
        });
        fetchRequests();
      } catch (error) {
        console.error('Error submitting appointment request:', error);
        toast.error(error.message || 'Failed to submit appointment request');
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment request?')) {
      return;
    }

      try {
        await cancelAppointmentRequest(requestId);
        toast.success('Appointment request cancelled successfully');
        fetchRequests();
      } catch (error) {
        console.error('Error cancelling appointment request:', error);
        toast.error(error.message || 'Failed to cancel appointment request');
      }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <PauseCircle className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status) => {
    return status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'Unknown';
  };

  const timeSlots = [
    'morning', 'afternoon', 'evening'
  ];

  const timeSlotLabels = {
    'morning': 'Morning (8:00 AM - 12:00 PM)',
    'afternoon': 'Afternoon (12:00 PM - 5:00 PM)', 
    'evening': 'Evening (5:00 PM - 8:00 PM)'
  };

  const visitTypes = [
    'consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure'
  ];

  const visitTypeLabels = {
    'consultation': 'Consultation',
    'follow_up': 'Follow-up Visit',
    'emergency': 'Emergency Visit',
    'routine_checkup': 'Routine Checkup',
    'procedure': 'Medical Procedure'
  };

  const urgencyOptions = [
    { value: 'low', label: 'Low', description: 'Routine, can wait 1-2 weeks' },
    { value: 'normal', label: 'Normal', description: 'Standard priority' },
    { value: 'high', label: 'High', description: 'Urgent, within 2-3 days' }
  ];

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your appointment requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Requests</h1>
          <p className="text-gray-600">Manage your appointment requests</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {filteredRequests.length} of {requests.length} requests
          </div>
          <button 
            onClick={() => setShowRequestForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Demo notice removed - appointment requests are retrieved from backend */}

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Request New Appointment</h2>
              <button 
                onClick={() => setShowRequestForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({...formData, preferredDate: e.target.value})}
                    className="input-field w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time *
                  </label>
                  <select
                    required
                    value={formData.preferredTimeSlot}
                    onChange={(e) => setFormData({...formData, preferredTimeSlot: e.target.value})}
                    className="input-field w-full"
                  >
                    <option value="">Select time slot</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{timeSlotLabels[slot]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visit Type *
                  </label>
                  <select
                    required
                    value={formData.visitType}
                    onChange={(e) => setFormData({...formData, visitType: e.target.value})}
                    className="input-field w-full"
                  >
                    <option value="">Select visit type</option>
                    {visitTypes.map(type => (
                      <option key={type} value={type}>
                        {visitTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                    className="input-field w-full"
                  >
                    {urgencyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Doctor (Optional)
                  </label>
                  <select
                    value={formData.preferredDoctorId}
                    onChange={(e) => setFormData({...formData, preferredDoctorId: e.target.value})}
                    className="input-field w-full"
                  >
                    <option value="">Any available doctor</option>
                    {/* Doctor list should be provided by backend; no demo options shown */}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symptoms & Reason for Visit *
                </label>
                <textarea
                  required
                  value={formData.symptoms}
                  onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                  className="input-field w-full resize-none"
                  rows="4"
                  placeholder="Please describe your symptoms, concerns, or reason for this appointment..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="input-field w-full resize-none"
                  rows="3"
                  placeholder="Any additional information, special requests, or notes for the doctor..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="btn-secondary flex-1 order-2 sm:order-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 order-1 sm:order-2 font-semibold disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin inline mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Appointment Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                  filter === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div key={request.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {visitTypeLabels[request.visit_type] || request.visit_type?.replace('_', ' ').charAt(0).toUpperCase() + 
                             request.visit_type?.replace('_', ' ').slice(1) || 'Appointment Request'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Requested on {new Date(request.created_at || request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(request.urgency)}`}>
                            {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)} Priority
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span>{getStatusText(request.status)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {request.preferred_date 
                            ? new Date(request.preferred_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : 'Date not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{timeSlotLabels[request.preferred_time_slot] || request.preferred_time_slot || 'Time not set'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Symptoms: </span>
                        <span className="font-medium">{request.symptoms || 'None specified'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Notes: </span>
                        <span className="font-medium">{request.notes || 'No additional notes'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor's Note */}
                  {request.doctor_note && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Doctor's Note: </span>
                        <span className="text-gray-800">{request.doctor_note}</span>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Appointment Info */}
                  {request.scheduled_appointment_id && (
                    <div className="mt-2">
                      <div className="text-sm text-green-600 font-medium">
                        ✓ Appointment has been scheduled (ID: {request.scheduled_appointment_id})
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                  {request.status === 'pending' && (
                    <button 
                      onClick={() => handleCancelRequest(request.id)}
                      className="btn-danger text-sm px-3 py-2 whitespace-nowrap"
                    >
                      Cancel Request
                    </button>
                  )}
                  {request.status === 'approved' && (
                    <button className="btn-secondary text-sm px-3 py-2 whitespace-nowrap">
                      View Appointment
                    </button>
                  )}
                  {request.status === 'rejected' && (
                    <button 
                      onClick={() => setShowRequestForm(true)}
                      className="btn-primary text-sm px-3 py-2 whitespace-nowrap"
                    >
                      Request Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointment requests found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? "You haven't submitted any appointment requests yet."
                : `No ${filter} appointment requests found.`
              }
            </p>
            <button 
              onClick={() => setShowRequestForm(true)}
              className="btn-primary"
            >
              Submit Your First Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAppointmentRequests;
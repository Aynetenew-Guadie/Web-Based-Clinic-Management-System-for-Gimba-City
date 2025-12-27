import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Phone, Filter, Loader, X, CheckCircle, AlertCircle, Edit } from 'lucide-react';
import { getPatientAppointments, cancelAppointment, rescheduleAppointment } from '../../services/patientService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const PatientAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    preferredDate: '',
    preferredTimeSlot: '',
    reason: ''
  });

  // No inline mock data — appointments fetched from backend via service

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setIsLoading(true);
        const data = await getPatientAppointments();
        setAppointments(data || []);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load appointments from backend');
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return appointment.status === 'scheduled' || appointment.status === 'confirmed' || appointment.status === 'waiting';
    if (filter === 'completed') return appointment.status === 'completed';
    if (filter === 'cancelled') return appointment.status === 'cancelled' || appointment.status === 'no_show';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'no_show':
        return 'bg-red-100 text-red-800';
      case 'waiting':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return <Calendar className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
      case 'no_show':
        return <X className="h-4 w-4" />;
      case 'waiting':
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'confirmed':
        return 'Confirmed';
      case 'waiting':
        return 'Waiting';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'Unknown';
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

  const isUpcomingAppointment = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    return appointmentDate > now && (appointment.status === 'scheduled' || appointment.status === 'confirmed' || appointment.status === 'waiting');
  };

  const handleCancelAppointment = async (appointment) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      // Call the API to cancel
      await cancelAppointment(appointment.id);
      setAppointments(prev => prev.map(apt => 
        apt.id === appointment.id ? { ...apt, status: 'cancelled' } : apt
      ));
      toast.success('Appointment cancelled successfully');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(error.message || 'Failed to cancel appointment');
    }
  };

  const handleRescheduleClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
    setRescheduleData({
      preferredDate: '',
      preferredTimeSlot: '',
      reason: ''
    });
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rescheduleData.preferredDate || !rescheduleData.preferredTimeSlot) {
      toast.error('Please select a preferred date and time slot');
      return;
    }

    try {
      await rescheduleAppointment(selectedAppointment.id, rescheduleData);
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      toast.success('Reschedule request submitted successfully. You will be notified once it is processed.');
    } catch (error) {
      console.error('Error requesting reschedule:', error);
      toast.error(error.message || 'Failed to submit reschedule request');
    }
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setSelectedAppointment(null);
    setRescheduleData({
      preferredDate: '',
      preferredTimeSlot: '',
      reason: ''
    });
  };

  const getTimeSlots = () => {
    return [
      '09:00-10:00',
      '10:00-11:00', 
      '11:00-12:00',
      '12:00-13:00',
      '14:00-15:00',
      '15:00-16:00',
      '16:00-17:00'
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600">Manage your scheduled appointments</p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredAppointments.length} of {appointments.length} appointments
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'upcoming', 'completed', 'cancelled'].map((status) => (
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

      {/* Demo notice removed - appointments load from backend */}

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {(() => {
                              const dn = appointment.doctor?.username || appointment.doctorName || appointment.doctor_name || 'Unknown Doctor';
                              return (/^Dr/i.test(dn) ? dn : `Dr. ${dn}`);
                            })()}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {appointment.doctor?.specialization || 'General Medicine'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ml-2 ${getStatusColor(appointment.status)} flex-shrink-0`}>
                          {getStatusIcon(appointment.status)}
                          <span>{getStatusText(appointment.status)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {appointment.appointment_date 
                            ? new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'Date not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {appointment.start_time 
                            ? `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`
                            : 'Time not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{appointment.room_number ? `Room ${appointment.room_number}` : 'Room TBD'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Type: </span>
                        <span className="font-medium">{appointment.visit_type || 'General Consultation'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Duration: </span>
                        <span className="font-medium">{appointment.duration_minutes || 30} minutes</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Department: </span>
                        <span className="font-medium">{appointment.department || 'General Medicine'}</span>
                      </div>
                      {appointment.priority && (
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">Priority: </span>
                          <span className={`font-medium capitalize ${
                            appointment.priority === 'urgent' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {appointment.priority}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notes: </span>
                        {appointment.notes}
                      </p>
                    </div>
                  )}

                  {appointment.cancellation_reason && (
                    <div className="mt-2">
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Cancellation Reason: </span>
                        {appointment.cancellation_reason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                  {isUpcomingAppointment(appointment) && (
                    <>
                      <button 
                        onClick={() => handleRescheduleClick(appointment)}
                        className="btn-primary text-sm px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Reschedule</span>
                      </button>
                      <button 
                        onClick={() => handleCancelAppointment(appointment)}
                        className="btn-danger text-sm px-3 py-2 whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {appointment.status === 'completed' && (
                    <button className="btn-secondary text-sm px-3 py-2 whitespace-nowrap">
                      View Details
                    </button>
                  )}
                  {appointment.status === 'cancelled' && (
                    <button className="btn-secondary text-sm px-3 py-2 whitespace-nowrap">
                      Request New
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? "You don't have any appointments scheduled yet."
                : `No ${filter} appointments found.`
              }
            </p>
            <button className="btn-primary">
              Request Your First Appointment
            </button>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reschedule Appointment
                </h3>
                <button 
                  onClick={closeRescheduleModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Appointment
                  </label>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <p><strong>Date:</strong> {new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                    <p><strong>Time:</strong> {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
                    <p>
                      <strong>Doctor:</strong>{' '}
                      {(() => {
                        const dn = selectedAppointment.doctor?.username || selectedAppointment.doctorName || selectedAppointment.doctor_name || 'Unknown Doctor';
                        return (/^Dr/i.test(dn) ? dn : `Dr. ${dn}`);
                      })()}
                    </p>
                    <p><strong>Type:</strong> {selectedAppointment.visit_type || 'General Consultation'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred New Date *
                  </label>
                  <input
                    type="date"
                    value={rescheduleData.preferredDate}
                    onChange={(e) => setRescheduleData({...rescheduleData, preferredDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={rescheduleData.preferredTimeSlot}
                    onChange={(e) => setRescheduleData({...rescheduleData, preferredTimeSlot: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select a time slot</option>
                    {getTimeSlots().map((slot) => (
                      <option key={slot} value={slot}>
                        {slot.split('-').map(time => formatTime(time + ':00')).join(' - ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Reschedule (Optional)
                  </label>
                  <textarea
                    value={rescheduleData.reason}
                    onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                    className="input-field"
                    rows={3}
                    placeholder="Please provide a reason for rescheduling..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeRescheduleModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, DollarSign, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getScheduledAppointments,
  getAllBilling,
  createBillingForAppointment 
} from '../../services/receptionistService';
import toast from 'react-hot-toast';
import { getPatientName, getDoctorName } from '../../utils/nameHelpers';

const ReceptionistCompletedAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [billingData, setBillingData] = useState({
    serviceType: 'consultation',
    amount: '',
    description: '',
    notes: ''
  });
  const [isCreatingBilling, setIsCreatingBilling] = useState(false);
  const [existingBilling, setExistingBilling] = useState([]);

  useEffect(() => {
    fetchCompletedAppointments();
  }, []);

  const fetchCompletedAppointments = async () => {
    try {
      setIsLoading(true);
      
      // Fetch both appointments and existing billing records
      const [appointmentsResponse, billingResponse] = await Promise.allSettled([
        getScheduledAppointments(),
        getAllBilling()
      ]);

      // Extract appointments data
      const allAppointments = appointmentsResponse.status === 'fulfilled' 
        ? (appointmentsResponse.value?.data || appointmentsResponse.value || [])
        : [];

      // Extract billing data
      const billingRecords = billingResponse.status === 'fulfilled'
        ? (billingResponse.value?.data || billingResponse.value || [])
        : [];

      setExistingBilling(billingRecords);

      // Filter completed appointments that don't have billing records
      const completedAppointments = allAppointments.filter(appointment => {
        const isCompleted = appointment.status === 'completed' || 
                           appointment.status === 'finished' ||
                           (appointment.end_time && new Date(appointment.end_time) < new Date());
        
        // Check if billing already exists for this appointment
        const hasBilling = billingRecords.some(billing => 
          billing.appointment_id === appointment.id || 
          billing.appointmentId === appointment.id
        );

        return isCompleted && !hasBilling;
      });

      console.log('Completed appointments without billing:', completedAppointments);
      setAppointments(completedAppointments);

      if (completedAppointments.length === 0) {
        toast.info('No completed appointments pending billing');
      }

    } catch (error) {
      console.error('Error fetching completed appointments:', error);
      toast.error('Failed to load completed appointments');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBilling = (appointment) => {
    setSelectedAppointment(appointment);
    
    // Set default billing data based on appointment type
    const defaultAmount = getDefaultAmount(appointment.visit_type);
    const defaultDescription = getDefaultDescription(appointment);
    
    setBillingData({
      serviceType: appointment.visit_type || 'consultation',
      amount: defaultAmount,
      description: defaultDescription,
      notes: appointment.notes || ''
    });
    setShowBillingModal(true);
  };

  const getDefaultAmount = (visitType) => {
    switch (visitType) {
      case 'consultation':
        return '150.00';
      case 'follow_up':
        return '100.00';
      case 'emergency':
        return '250.00';
      case 'routine_checkup':
        return '120.00';
      case 'procedure':
        return '500.00';
      default:
        return '150.00';
    }
  };

  const getDefaultDescription = (appointment) => {
    const doctorName = appointment.doctor?.first_name && appointment.doctor?.last_name 
      ? `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`
      : appointment.doctor?.username 
      ? `Dr. ${appointment.doctor.username}`
      : 'Doctor';
    
    const visitType = appointment.visit_type || 'consultation';
    const formattedType = visitType.replace('_', ' ');
    
    return `${formattedType.charAt(0).toUpperCase() + formattedType.slice(1)} with ${doctorName}`;
  };

  const submitBilling = async () => {
    try {
      if (!billingData.amount || parseFloat(billingData.amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      if (!selectedAppointment) {
        toast.error('No appointment selected');
        return;
      }

      setIsCreatingBilling(true);
      
      const billingPayload = {
        appointmentId: selectedAppointment.id,
        patientId: selectedAppointment.patient_id || selectedAppointment.patient?.id,
        doctorId: selectedAppointment.doctor_id || selectedAppointment.doctor?.id,
        serviceType: billingData.serviceType,
        amount: parseFloat(billingData.amount),
        description: billingData.description,
        notes: billingData.notes,
        billingDate: new Date().toISOString().split('T')[0],
        status: 'pending'
      };

      console.log('Creating billing with payload:', billingPayload);

      // Try to create billing using the service
      await createBillingForAppointment(billingPayload);
      
      // Remove the appointment from the list after successful billing creation
      setAppointments(prev => prev.filter(apt => apt.id !== selectedAppointment.id));
      
      toast.success('Billing record created successfully');
      closeBillingModal();
      
      // Refresh the list to ensure we have current data
      setTimeout(() => {
        fetchCompletedAppointments();
      }, 1000);
      
    } catch (error) {
      console.error('Error creating billing:', error);
      
      // Fallback: Create billing locally if service fails
      console.warn('Service failed, using fallback billing creation');
      await createBillingFallback();
      
    } finally {
      setIsCreatingBilling(false);
    }
  };

  const createBillingFallback = async () => {
    try {
      const fallbackBilling = {
        id: Date.now(),
        appointment_id: selectedAppointment.id,
        patient_id: selectedAppointment.patient_id || selectedAppointment.patient?.id,
        doctor_id: selectedAppointment.doctor_id || selectedAppointment.doctor?.id,
        service_type: billingData.serviceType,
        amount: parseFloat(billingData.amount),
        description: billingData.description,
        notes: billingData.notes,
        billing_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Store in localStorage as fallback
      const existingBilling = JSON.parse(localStorage.getItem('fallback_billing') || '[]');
      existingBilling.push(fallbackBilling);
      localStorage.setItem('fallback_billing', JSON.stringify(existingBilling));

      // Remove appointment from list
      setAppointments(prev => prev.filter(apt => apt.id !== selectedAppointment.id));
      
      toast.success('Billing record created locally (backend unavailable)');
      closeBillingModal();
      
    } catch (fallbackError) {
      toast.error('Failed to create billing record');
    }
  };

  const closeBillingModal = () => {
    setShowBillingModal(false);
    setSelectedAppointment(null);
    setBillingData({
      serviceType: 'consultation',
      amount: '',
      description: '',
      notes: ''
    });
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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading completed appointments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Completed Appointments</h1>
          <p className="text-gray-600">Create billing records for completed appointments</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span>{appointments.length} pending billing</span>
          </div>
          <button
            onClick={fetchCompletedAppointments}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Loader className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div key={appointment.id} className="card border-l-4 border-l-green-400 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getPatientName(appointment)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {appointment.patient?.username && `Username: ${appointment.patient.username}`}
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
                            : 'Date not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          {appointment.start_time 
                            ? `${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}`
                            : 'Time not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{(() => { const dn = getDoctorName(appointment); return /^Dr/i.test(dn) ? dn : `Dr. ${dn}` })()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Visit Type: </span>
                        <span className="font-medium capitalize">
                          {appointment.visit_type?.replace('_', ' ') || 'Consultation'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Status: </span>
                        <span className="font-medium text-green-600">
                          Completed
                        </span>
                      </div>
                      {appointment.notes && (
                        <div className="text-sm">
                          <span className="text-gray-600">Notes: </span>
                          <span className="font-medium">{appointment.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button 
                    onClick={() => handleCreateBilling(appointment)}
                    className="btn-primary text-sm px-4 py-2 flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Create Bill</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600 mb-4">
              No completed appointments pending billing at the moment.
            </p>
            <p className="text-sm text-gray-500">
              Completed appointments will appear here automatically for billing creation.
            </p>
          </div>
        )}
      </div>

      {/* Billing Creation Modal */}
      {showBillingModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create Billing Record
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Patient:</strong> {getPatientName(selectedAppointment)}</p>
                <p><strong>Doctor:</strong> {(() => { const dn = getDoctorName(selectedAppointment); return /^Dr/i.test(dn) ? dn : `Dr. ${dn}` })()}</p>
                <p><strong>Date:</strong> {new Date(selectedAppointment.appointment_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {formatTime(selectedAppointment.start_time)}</p>
                <p><strong>Visit Type:</strong> {selectedAppointment.visit_type?.replace('_', ' ') || 'Consultation'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type *
                </label>
                <select
                  value={billingData.serviceType}
                  onChange={(e) => setBillingData(prev => ({ ...prev, serviceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="procedure">Procedure</option>
                  <option value="emergency">Emergency</option>
                  <option value="routine_checkup">Routine Checkup</option>
                  <option value="lab_test">Lab Test</option>
                  <option value="prescription">Prescription</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={billingData.amount}
                  onChange={(e) => setBillingData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: ${getDefaultAmount(selectedAppointment.visit_type)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={billingData.description}
                  onChange={(e) => setBillingData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Service description"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={billingData.notes}
                  onChange={(e) => setBillingData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  placeholder="Additional billing notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeBillingModal}
                disabled={isCreatingBilling}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitBilling}
                disabled={isCreatingBilling || !billingData.amount || !billingData.description}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-2 disabled:opacity-50 transition-colors"
              >
                {isCreatingBilling ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>{isCreatingBilling ? 'Creating...' : 'Create Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistCompletedAppointments;
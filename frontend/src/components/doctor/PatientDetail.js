import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Calendar, Activity, FileText, Pill, Loader } from 'lucide-react';
import { getPatientRecords, getPatientSummary } from '../../services/doctorService';
import toast from 'react-hot-toast';
import { getPatientName as getPatientNameHelper } from '../../utils/nameHelpers';

const PatientDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // No mock fallback: require backend data for patient detail

  const fetchPatientData = async () => {
    try {
      setIsLoading(true);
      
      // Try to get patient records first
      let recordsData;
      try {
        recordsData = await getPatientRecords(patientId);
      } catch (recordsError) {
        console.error('Error fetching patient records:', recordsError);
        recordsData = null;
      }

      // Try to get patient summary
      let summaryData;
      try {
        summaryData = await getPatientSummary(patientId);
      } catch (summaryError) {
        console.error('Error fetching patient summary:', summaryError);
        summaryData = null;
      }

      // If we have at least one backend response, build the patientData
      if (recordsData || summaryData) {
        const combinedData = {
          patient: (recordsData?.patient || summaryData?.patient) || null,
          medicalRecords: Array.isArray(recordsData) ? recordsData : recordsData?.medicalRecords || [],
          summary: summaryData || null
        };
        setPatientData(combinedData);
      } else {
        // No backend data available
        setPatientData(null);
        toast.error('Failed to load patient details from backend');
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      setPatientData(null);
      toast.error('Failed to load patient details from backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const getPatientName = (patient) => getPatientNameHelper(patient);

  const getPatientAge = (patient) => {
    if (patient?.age) {
      return patient.age;
    }
    if (patient?.date_of_birth) {
      try {
        const birthDate = new Date(patient.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      } catch {
        return 'N/A';
      }
    }
    return 'N/A';
  };

  const getPatientGender = (patient) => {
    if (!patient?.gender) return 'N/A';
    const g = String(patient.gender).toLowerCase();
    if (g === 'm' || g === 'male') return 'Male';
    if (g === 'f' || g === 'female') return 'Female';
    return patient.gender;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!patientData || !patientData.patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/doctor/appointments')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Appointments</span>
          </button>
        </div>
        <div className="card text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Patient not found</h3>
          <p className="text-gray-600">The requested patient could not be found.</p>
        </div>
      </div>
    );
  }

  const { patient } = patientData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/doctor/appointments')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Appointments</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Details</h1>
            <p className="text-gray-600">Complete patient information and medical history</p>
          </div>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="w-20 h-20 bg-primary-100 rounded-lg flex items-center justify-center">
            <User className="h-10 w-10 text-primary-600" />
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getPatientName(patient)}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">Patient ID:</span>
                  <span className="text-blue-600 font-medium">
                    {patient.patientId || patient.roleSpecificId || patient.id || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">Age:</span>
                  <span>{getPatientAge(patient)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">Gender:</span>
                  <span>{getPatientGender(patient)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{patient.phone || 'Phone not available'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{patient.email || 'Email not available'}</span>
                </div>
                {patient.blood_type && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Blood Type:</span>
                    <span className="text-red-600 font-medium">{patient.blood_type}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Registered: {formatDate(patient.createdAt)}</span>
                </div>
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Allergies:</span>
                    <div className="mt-1">
                      {patient.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {patientData.summary?.totalRecords || patientData.medicalRecords?.length || 0}
          </div>
          <div className="text-sm text-blue-800">Medical Records</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {patientData.summary?.totalPrescriptions || patientData.prescriptions?.length || 0}
          </div>
          <div className="text-sm text-green-800">Prescriptions</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {patientData.summary?.totalLabResults || patientData.labResults?.length || 0}
          </div>
          <div className="text-sm text-purple-800">Lab Results</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {patientData.summary?.totalAppointments || patientData.appointments?.length || 0}
          </div>
          <div className="text-sm text-orange-800">Appointments</div>
        </div>
      </div>

      {/* Medical History Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical Records */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" />
            Recent Medical Records
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patientData.medicalRecords?.length > 0 ? (
              patientData.medicalRecords.slice(0, 5).map((record) => (
                <div key={record.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {record.diagnosis || 'General Consultation'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(record.record_date || record.date)}
                    </div>
                  </div>
                  {record.symptoms && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Symptoms:</strong> {record.symptoms}
                    </div>
                  )}
                  {record.treatment && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Treatment:</strong> {record.treatment}
                    </div>
                  )}
                  {record.notes && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Notes:</strong> {record.notes}
                    </div>
                  )}
                  {record.doctor && (
                    <div className="text-xs text-gray-500">
                      Dr. {record.doctor.first_name} {record.doctor.last_name}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">No medical records found</div>
            )}
          </div>
        </div>

        {/* Prescriptions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Pill className="h-5 w-5" />
            Recent Prescriptions
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patientData.prescriptions?.length > 0 ? (
              patientData.prescriptions.slice(0, 5).map((prescription) => (
                <div key={prescription.id} className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {prescription.medication}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(prescription.dateIssued || prescription.date)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Dosage:</strong> {prescription.dosage}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Instructions:</strong> {prescription.instructions}
                  </div>
                  {prescription.doctor && (
                    <div className="text-xs text-gray-500">
                      Prescribed by Dr. {prescription.doctor.first_name} {prescription.doctor.last_name}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">No prescriptions found</div>
            )}
          </div>
        </div>

        {/* Lab Results */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5" />
            Recent Lab Results
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patientData.labResults?.length > 0 ? (
              patientData.labResults.slice(0, 5).map((result) => (
                <div key={result.id} className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {result.labRequest?.testType || result.testType || 'Lab Test'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(result.date)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Result:</strong> {result.resultDetails || result.result || 'No details available'}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      result.status === 'normal' ? 'bg-green-100 text-green-800' :
                      result.status === 'abnormal' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status || 'Completed'}
                    </span>
                  </div>
                  {result.labRequest?.doctor && (
                    <div className="text-xs text-gray-500">
                      Requested by Dr. {result.labRequest.doctor.first_name} {result.labRequest.doctor.last_name}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">No lab results found</div>
            )}
          </div>
        </div>

        {/* Appointment History */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            Recent Appointments
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patientData.appointments?.length > 0 ? (
              patientData.appointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {appointment.visit_type?.replace('_', ' ') || appointment.type || 'General Visit'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(appointment.appointment_date || appointment.date)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  {appointment.doctor && (
                    <div className="text-xs text-gray-500">
                      Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">No appointments found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
import React, { useState, useEffect } from 'react';
import { Search, Users, Eye, Calendar, Phone, Mail, User, ChevronDown, ChevronUp, X, FileText, Pill, Activity, Loader } from 'lucide-react';
import { searchPatients, getPatientRecords, getPatientSummary, getTodaysAppointments } from '../../services/doctorService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const DoctorPatients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [recordsByPatient, setRecordsByPatient] = useState({});
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // No inline mock data — component relies on backend via services

  // Normalize different backend shapes into a consistent patient object
  const normalizePatient = (item) => {
    if (!item) return null;

    // If item already looks like a patient
    if (item.username || item.first_name || item.email || item.patientId || item.id) {
      return {
        id: item.id || item.patientId || item._id || null,
        username: item.username || (item.user && item.user.username) || (item.auth && item.auth.username) || null,
        first_name: item.first_name || item.name?.split(' ')?.[0] || null,
        last_name: item.last_name || item.name?.split(' ')?.slice(1).join(' ') || null,
        email: item.email || (item.user && item.user.email) || null,
        phone: item.phone || null,
        age: item.age || null,
        date_of_birth: item.date_of_birth || null,
        gender: item.gender || null,
        patientId: item.patientId || item.roleSpecificId || item.employee_id || item.id || null,
        blood_type: item.blood_type || item.blood_group || null,
        allergies: item.allergies || null,
        raw: item
      };
    }

    // If item looks like an appointment with nested patient
    if (item.patient || item.patient_id || item.patientId) {
      const p = item.patient || item.patient_id || item.patientId;
      return normalizePatient(p);
    }

    // Last resort: if item has nested values, try to find a nested user/patient
    if (item.data && typeof item.data === 'object') {
      return normalizePatient(item.data);
    }

    return null;
  };

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const data = await searchPatients('');

      let candidates = Array.isArray(data) ? data : (data ? [data] : []);

      // If searchPatients returned appointments or other shapes, normalize to patient objects
      let normalized = candidates.map(normalizePatient).filter(Boolean);

      // If no patients found from patient endpoints, try pulling today's appointments and extract patients
      if (normalized.length === 0) {
        try {
          const appointments = await getTodaysAppointments();
          if (Array.isArray(appointments) && appointments.length > 0) {
            const fromAppointments = appointments.map(normalizePatient).filter(Boolean);
            normalized = normalized.concat(fromAppointments);
          }
        } catch (apptErr) {
          console.warn('Failed to fetch appointments fallback:', apptErr);
        }
      }

      // Deduplicate by id or email
      const seen = new Set();
      const unique = [];
      for (const p of normalized) {
        const key = p.id || p.email || p.username;
        if (!key) continue;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(p);
        }
      }

      setPatients(unique);
      setFilteredPatients(unique);
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Backend not available — show empty state and notify
      setPatients([]);
      setFilteredPatients([]);
      toast.error('Failed to load patients from backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const q = searchTerm.toLowerCase();
      const filtered = patients.filter(patient => {
        if (!patient) return false;
        return (
          (patient.username || '').toLowerCase().includes(q) ||
          (patient.first_name || '').toLowerCase().includes(q) ||
          (patient.last_name || '').toLowerCase().includes(q) ||
          (patient.email || '').toLowerCase().includes(q)
        );
      });
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await searchPatients(searchTerm);
      setFilteredPatients(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error('Failed to search patients. Using local search.');
      // Fallback to local search
      const filtered = patients.filter(patient => 
        patient.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  const getPatientName = (patient) => {
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`;
    }
    return patient.username || 'Unknown Patient';
  };

  const getPatientAge = (patient) => {
    if (patient.age) {
      return patient.age;
    }
    if (patient.date_of_birth) {
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

  const toggleViewProfile = async (patient) => {
    const id = patient.id;
    setExpandedId(expandedId === id ? null : id);
    
    if (expandedId === id) return;
    
    try {
      const summary = await getPatientSummary(id);
      setRecordsByPatient(prev => ({ ...prev, [id]: summary }));
    } catch (error) {
      console.error('Error loading patient summary:', error);
      // Backend failed — set empty summary for this patient
      setRecordsByPatient(prev => ({ ...prev, [id]: null }));
      toast.error('Failed to load patient details');
    }
  };

  const loadMedicalHistory = async (patient) => {
    try {
      setLoadingHistory(true);
      const historyData = await getPatientRecords(patient.id);
      setSelectedPatientHistory(historyData);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error loading medical history:', error);
      // Backend failed — show modal with empty history message
      setSelectedPatientHistory({ patient: { first_name: patient.first_name, last_name: patient.last_name, patientId: patient.patientId || patient.roleSpecificId } });
      setShowHistoryModal(true);
      toast.error('Failed to load medical history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setSelectedPatientHistory(null);
    setShowHistoryModal(false);
  };

  if (isLoading && patients.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600">Manage your patient list</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, username, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="input-field pl-10"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="btn-primary px-4 py-2 flex items-center space-x-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Patients List */}
      <div className="space-y-4">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <div key={patient.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getPatientName(patient)}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-3">
                        <span>Age: {getPatientAge(patient)}</span>
                        <span>Gender: {getPatientGender(patient)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{patient.phone || 'Phone not available'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{patient.email || 'Email not available'}</span>
                      </div>
                      {patient.blood_type && (
                        <div className="flex items-center space-x-2">
                          <span>Blood Type: {patient.blood_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Patient ID: </span>
                    <span className="font-medium text-blue-600">{patient.patientId || patient.roleSpecificId || 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Username: </span>
                    <span className="font-medium">{patient.username || 'N/A'}</span>
                  </div>
                  {patient.allergies && (
                    <div className="text-sm">
                      <span className="text-gray-600">Allergies: </span>
                      <span className="font-medium text-red-600">
                        {Array.isArray(patient.allergies) && patient.allergies.length > 0 
                          ? patient.allergies.join(', ') 
                          : 'None'
                        }
                      </span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => toggleViewProfile(patient)} 
                      className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Profile</span>
                    </button>
                    <button 
                      onClick={() => loadMedicalHistory(patient)} 
                      className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                      disabled={loadingHistory}
                    >
                      {loadingHistory ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span>Medical History</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedId === patient.id && (
                <div className="mt-4 border-t pt-4 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><span className="text-gray-500">Patient ID:</span> <span className="font-medium text-blue-600">{patient.patientId || patient.roleSpecificId || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Email:</span> {patient.email || 'N/A'}</div>
                    <div><span className="text-gray-500">Phone:</span> {patient.phone || 'N/A'}</div>
                    <div><span className="text-gray-500">Registration Date:</span> {formatDate(patient.createdAt)}</div>
                  </div>
                  
                  {recordsByPatient[patient.id]?.appointments && (
                    <div className="mt-3">
                      <div className="font-semibold">Recent Appointments</div>
                      <ul className="list-disc pl-5 text-gray-600">
                        {(recordsByPatient[patient.id].appointments.slice(0,3) || []).map((a, index) => (
                          <li key={a.id || index}>
                            {formatDate(a.appointment_date)} • {a.visit_type?.replace('_',' ') || 'Visit'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {recordsByPatient[patient.id]?.medicalRecords && (
                    <div className="mt-3">
                      <div className="font-semibold">Latest Notes</div>
                      <ul className="list-disc pl-5 text-gray-600">
                        {(recordsByPatient[patient.id].medicalRecords.slice(0,3) || []).map((r, index) => (
                          <li key={r.id || index}>
                            {formatDate(r.record_date)} • {r.diagnosis || 'Note'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No patients found' : 'No patients available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No patients match your search for "${searchTerm}"`
                : 'There are no patients in the system yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Medical History Modal */}
      {showHistoryModal && selectedPatientHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Medical History</h2>
                {selectedPatientHistory.patient && (
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-gray-600">
                      {selectedPatientHistory.patient.first_name} {selectedPatientHistory.patient.last_name}
                    </p>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      {selectedPatientHistory.patient.patientId}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={closeHistoryModal}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedPatientHistory.summary?.totalRecords || selectedPatientHistory.medicalRecords?.length || 0}
                  </div>
                  <div className="text-sm text-blue-800">Medical Records</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedPatientHistory.summary?.totalPrescriptions || selectedPatientHistory.prescriptions?.length || 0}
                  </div>
                  <div className="text-sm text-green-800">Prescriptions</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedPatientHistory.summary?.totalLabResults || selectedPatientHistory.labResults?.length || 0}
                  </div>
                  <div className="text-sm text-purple-800">Lab Results</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedPatientHistory.summary?.totalAppointments || selectedPatientHistory.appointments?.length || 0}
                  </div>
                  <div className="text-sm text-orange-800">Appointments</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Medical Records */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Medical Records
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedPatientHistory.medicalRecords?.length > 0 ? (
                      selectedPatientHistory.medicalRecords.map((record, index) => (
                        <div key={record.id || index} className="bg-gray-50 p-4 rounded-lg">
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Prescriptions
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedPatientHistory.prescriptions?.length > 0 ? (
                      selectedPatientHistory.prescriptions.map((prescription, index) => (
                        <div key={prescription.id || index} className="bg-green-50 p-4 rounded-lg">
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Lab Results
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedPatientHistory.labResults?.length > 0 ? (
                      selectedPatientHistory.labResults.map((result, index) => (
                        <div key={result.id || index} className="bg-purple-50 p-4 rounded-lg">
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

                {/* Appointments History */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Appointment History
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedPatientHistory.appointments?.length > 0 ? (
                      selectedPatientHistory.appointments.map((appointment, index) => (
                        <div key={appointment.id || index} className="bg-orange-50 p-4 rounded-lg">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;
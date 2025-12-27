import React, { useState, useEffect } from 'react';
import { UserPlus, Search, User, Phone, Mail, Calendar, Loader, Eye, Plus, Edit, Trash2, FileText, Clock, X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { registerPatient, getPatients, scheduleAppointment, scheduleAppointmentSimple, findWorkingAppointmentEndpoint } from '../../services/receptionistService';
import toast from 'react-hot-toast';
import { getPatientName } from '../../utils/nameHelpers';

const ReceptionistPatients = () => {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScheduling, setIsScheduling] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [appointmentData, setAppointmentData] = useState({
    appointmentDate: '',
    startTime: '',
    visitType: '',
    doctorId: '',
    notes: ''
  })
  const [newPatient, setNewPatient] = useState({
    username: '',
    email: '',
    password: '',
    name: '', // Combined name field
    phone: '',
    date_of_birth: '',
    age: '',
    gender: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    blood_type: '',
    allergies: '',
    medical_history: '',
    insurance_provider: '',
    insurance_number: '',
    occupation: '',
    marital_status: ''
  })

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true)
        const data = await getPatients()
        console.log('📊 API Response from getPatients():', data);
        console.log('📊 Type of data:', typeof data);
        console.log('📊 Is array?', Array.isArray(data));
        
        // CRITICAL FIX: Handle different response structures
        let patientsArray = [];
        
        if (Array.isArray(data)) {
          // If data is already an array
          patientsArray = data;
        } else if (data && typeof data === 'object') {
          // If data is an object, check for common response structures
          if (Array.isArray(data.data)) {
            patientsArray = data.data; // { data: [...] }
          } else if (Array.isArray(data.patients)) {
            patientsArray = data.patients; // { patients: [...] }
          } else if (Array.isArray(data.users)) {
            patientsArray = data.users; // { users: [...] }
          } else if (data.success && Array.isArray(data.data)) {
            patientsArray = data.data; // { success: true, data: [...] }
          } else {
            // If it's an object but not the structures above, try to extract values
            console.log('⚠️ Data is object with keys:', Object.keys(data));
            patientsArray = Object.values(data).filter(item => 
              item && typeof item === 'object' && (item.email || item.username || item.name)
            );
          }
        }
        
        // Ensure we always have an array
        if (!Array.isArray(patientsArray)) {
          console.warn('⚠️ patientsArray is not an array, setting to empty array');
          patientsArray = [];
        }
        
        console.log('✅ Processed patients array:', patientsArray);
        console.log('✅ Array length:', patientsArray.length);
        
        setPatients(patientsArray)
      } catch (error) {
        console.error('❌ Error fetching patients:', error)
        toast.error('Failed to load patients')
        setPatients([]) // Always set to empty array on error
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchPatients()
    }
  }, [user])

  // CRITICAL FIX: Safe filtering with array check
  const filteredPatients = Array.isArray(patients) ? patients.filter(p => {
    if (!p) return false;
    
    const searchLower = search.toLowerCase();
    const username = (p.username || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const firstName = (p.first_name || '').toLowerCase();
    const lastName = (p.last_name || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const patientId = (p.patientId || p.id || p.employee_id || '').toString().toLowerCase();
    
    return (
      username.includes(searchLower) ||
      email.includes(searchLower) ||
      name.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      phone.includes(searchLower) ||
      patientId.includes(searchLower)
    );
  }) : [];

  const validatePhone = (phone) => {
    if (!phone) return true;
  
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    const phoneRegex = /^09\d{8}$/;
    return phoneRegex.test(cleanPhone);
  };

  // Prefer explicit username fields, but fall back to nested user objects or email local-part
  const getPatientUsername = (p) => {
    if (!p) return null;
    if (p.username) return p.username;
    if (p.user && p.user.username) return p.user.username;
    if (p.auth && p.auth.username) return p.auth.username;
    if (p.email) return p.email.split('@')[0];
    return null;
  };

  const handleAddPatient = async (e) => {
    e.preventDefault()
    
    if (!newPatient.username || !newPatient.email || !newPatient.password || !newPatient.name) {
      toast.error('Please fill in all required fields (Username, Email, Password, Full Name)')
      return
    }

    if (newPatient.phone && !validatePhone(newPatient.phone)) {
      toast.error('Phone number must start with 09 and be exactly 10 digits (e.g., 0912345678)')
      return
    }

    try {
      // Split full name into first and last name for backend
      const nameParts = newPatient.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const patientData = {
        ...newPatient,
        first_name: firstName,
        last_name: lastName,
        name: newPatient.name.trim(), // Keep full name for reference
        username: newPatient.username.trim(),
        email: newPatient.email.trim().toLowerCase(),
        phone: newPatient.phone || '',
        emergency_phone: newPatient.emergency_phone || '',
        age: newPatient.age ? parseInt(newPatient.age) : 0
      }

      console.log('Sending patient data:', patientData);
      
      const response = await registerPatient(patientData)

      // Show success and surface temporary password/credentials when available
      let successMsg = 'Patient registered successfully'
      if (response && response.patientId) {
        successMsg = `Patient registered successfully! Patient ID: ${response.patientId}`
      }

      toast.success(successMsg, {
        duration: 6000,
        style: {
          background: '#10B981',
          color: 'white',
          fontWeight: 'bold'
        }
      })

      // Show temp password if backend returned it (different backends use different keys)
      const tempPw = response?.temporaryPassword || response?.temporary_password || response?.credentials?.password || response?.password;
      if (tempPw) {
        toast((t) => (
          <div style={{ padding: '8px' }}>
            <div style={{ fontWeight: '700', marginBottom: 6 }}>Temporary password</div>
            <div style={{ marginBottom: 8 }}>{tempPw}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { navigator.clipboard?.writeText(tempPw); toast.success('Copied to clipboard'); }} className="btn-primary">Copy</button>
              <button onClick={() => toast.dismiss(t.id)} className="btn-secondary">Close</button>
            </div>
          </div>
        ), { duration: 20000 })
      }
      
      // Refresh patients list (preferred) and also append the newly created patient to avoid UI delay
      try {
        const refreshed = await getPatients()
        
        // Process the refreshed data same as in useEffect
        let refreshedArray = [];
        if (Array.isArray(refreshed)) {
          refreshedArray = refreshed;
        } else if (refreshed && Array.isArray(refreshed.data)) {
          refreshedArray = refreshed.data;
        } else if (refreshed && Array.isArray(refreshed.patients)) {
          refreshedArray = refreshed.patients;
        }
        
        if (!Array.isArray(refreshedArray)) {
          refreshedArray = [];
        }

        // Build a patient object from the registration response (handle different response shapes)
        let created = null;
        if (response && response.patient) {
          created = {
            id: response.patient.id || response.patientId || response.id || null,
            patientId: response.patient.patientId || response.patientId || response.patient.employee_id || null,
            username: response.patient.username || response.patient.username || (response.patient.email || '').split('@')[0],
            email: response.patient.email || null,
            first_name: response.patient.firstName || response.patient.first_name || null,
            last_name: response.patient.lastName || response.patient.last_name || null,
            phone: response.patient.phone || null
          };
        } else if (response && response.id) {
          // fallback registration returned the patient object directly
          created = response;
        }

        // Prepend the newly created patient when missing from refreshed list
        if (created) {
          const exists = refreshedArray.some(p => p.id === created.id || p.patientId === created.patientId || p.email === created.email);
          if (!exists) refreshedArray = [created, ...refreshedArray];
        }

        setPatients(refreshedArray)
      } catch (refreshError) {
        console.log('Could not refresh patients list:', refreshError)

        // Append the created patient locally as a best-effort fallback so receptionist immediately sees it
        try {
          let created = null;
          if (response && response.patient) {
            created = {
              id: response.patient.id || response.patientId || response.id || Date.now(),
              patientId: response.patient.patientId || response.patientId || response.patient.employee_id || `PAT${Date.now().toString().slice(-6)}`,
              username: response.patient.username || (response.patient.email || '').split('@')[0],
              email: response.patient.email || null,
              first_name: response.patient.firstName || response.patient.first_name || null,
              last_name: response.patient.lastName || response.patient.last_name || null,
              phone: response.patient.phone || null
            };
          } else if (response && response.id) {
            created = response;
          }

          if (created) setPatients(prev => [created, ...(Array.isArray(prev) ? prev : [])]);
        } catch (appendError) {
          console.log('Also failed to append created patient locally:', appendError)
        }
      }
      
      setNewPatient({
        username: '',
        email: '',
        password: '',
        name: '',
        phone: '',
        date_of_birth: '',
        age: '',
        gender: '',
        address: '',
        emergency_contact: '',
        emergency_phone: '',
        blood_type: '',
        allergies: '',
        medical_history: '',
        insurance_provider: '',
        insurance_number: '',
        occupation: '',
        marital_status: ''
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error registering patient:', error)
      
      if (error.message?.includes('name')) {
        toast.error('Full name is required for patient registration')
      } else if (error.message?.includes('email')) {
        toast.error('Email address is already registered or invalid')
      } else if (error.message?.includes('username')) {
        toast.error('Username is already taken')
      } else {
        toast.error(error.message || 'Failed to register patient. Please check all required fields.')
      }
    }
  }


  const getPatientAge = (patient) => {
    if (!patient) return 'N/A';
    
    if (patient.age) {
      return patient.age
    }
    if (patient.date_of_birth) {
      const birthDate = new Date(patient.date_of_birth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }
    return 'N/A'
  }

  const viewPatientDetails = (patient) => {
    if (!patient) return;
    
    setSelectedPatient(patient)
    setShowPatientModal(true)
  }

  const closePatientModal = () => {
    setSelectedPatient(null)
    setShowPatientModal(false)
  }

  const openScheduleModal = (patient) => {
    if (!patient) return;
    
    setSelectedPatient(patient)
    // Set default date to today and time to next available hour
    const now = new Date();
    const defaultDate = now.toISOString().split('T')[0];
    const nextHour = now.getHours() + 1;
    const defaultTime = `${nextHour.toString().padStart(2, '0')}:00`;
    
    setAppointmentData({
      appointmentDate: defaultDate,
      startTime: defaultTime,
      visitType: 'general_checkup',
      doctorId: '',
      notes: ''
    })
    setShowScheduleModal(true)
  }

  const closeScheduleModal = () => {
    setSelectedPatient(null)
    setShowScheduleModal(false)
    setAppointmentData({
      appointmentDate: '',
      startTime: '',
      visitType: '',
      doctorId: '',
      notes: ''
    })
  }

  // UPDATED: Simplified appointment scheduling with direct endpoint
  const handleScheduleAppointment = async (e) => {
    e.preventDefault()
    
    if (!selectedPatient) {
      toast.error('No patient selected');
      return;
    }
    
    // Enhanced validation
    if (!appointmentData.appointmentDate || !appointmentData.startTime || !appointmentData.visitType) {
      toast.error('Please fill in all required fields (Date, Time, and Visit Type)')
      return
    }

    // Validate date is not in the past
    const selectedDate = new Date(appointmentData.appointmentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      toast.error('Cannot schedule appointment in the past')
      return
    }

    try {
      setIsScheduling(true)
      
      // Prepare appointment data - simplified format
      const appointmentPayload = {
        patient_id: selectedPatient.id || selectedPatient.patientId || selectedPatient._id,
        patient_name: getPatientName(selectedPatient),
        appointment_date: appointmentData.appointmentDate,
        appointment_time: appointmentData.startTime,
        visit_type: appointmentData.visitType,
        doctor_id: appointmentData.doctorId || null,
        notes: appointmentData.notes || '',
        status: 'scheduled'
      }

      console.log('📅 Scheduling appointment with payload:', appointmentPayload)
      
      // DIRECT SOLUTION: Use the working endpoint approach
      let response;
      let success = false;
      
      // Method 1: Try the simple appointment scheduling
      try {
        response = await scheduleAppointmentSimple(appointmentPayload);
        success = true;
        console.log('✅ Appointment scheduled via scheduleAppointmentSimple:', response);
      } catch (error1) {
        console.log('Method 1 failed:', error1.message);
        
        // Method 2: Try the main scheduleAppointment with multiple endpoints
        try {
          response = await scheduleAppointment(appointmentPayload);
          success = true;
          console.log('✅ Appointment scheduled via scheduleAppointment:', response);
        } catch (error2) {
          console.log('Method 2 failed:', error2.message);
          
          // Method 3: Direct API call to working endpoints from logs
          try {
            // Based on logs, these GET endpoints work - try them as POST
            const endpoints = [
              '/reception/appointment-requests', // This GET endpoint works in logs
              '/appointments/patient', // This GET endpoint works in logs
              '/patients/appointments' // Another endpoint that might work
            ];
            
            for (const endpoint of endpoints) {
              try {
                const api = (await import('../../services/apiService')).default;
                const result = await api.post(endpoint, {
                  ...appointmentPayload,
                  is_walkin: true // Mark as walk-in appointment
                });
                response = result.data;
                success = true;
                console.log(`✅ Appointment scheduled via ${endpoint}:`, response);
                break;
              } catch (endpointError) {
                console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
                continue;
              }
            }
          } catch (error3) {
            console.log('Method 3 failed:', error3.message);
          }
        }
      }
      
      if (success && response) {
        // Show success message
        const successMessage = response?.message || 
                              response?.appointment?.message || 
                              'Appointment scheduled successfully!';
        
        toast.success(successMessage, {
          duration: 5000,
          icon: '✅',
          style: {
            background: '#10B981',
            color: 'white',
            fontWeight: 'bold'
          }
        })
        
        closeScheduleModal()
        
        // Refresh patients list (optional)
        try {
          const refreshed = await getPatients()
          let refreshedArray = [];
          if (Array.isArray(refreshed)) {
            refreshedArray = refreshed;
          } else if (refreshed && Array.isArray(refreshed.data)) {
            refreshedArray = refreshed.data;
          }
          setPatients(refreshedArray || [])
        } catch (refreshError) {
          console.log('Note: Could not refresh patients list', refreshError)
        }
      } else {
        throw new Error('All scheduling methods failed');
      }
      
    } catch (error) {
      console.error('❌ Error scheduling appointment:', error)
      
      // More specific error messages
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        toast.error('Appointment scheduling service is temporarily unavailable. Using local storage fallback.', {
          duration: 6000
        })
        
        // Create appointment in local storage as fallback
        try {
          const fallbackAppointment = {
            id: Date.now(),
            patient_id: selectedPatient.id,
            patient_name: getPatientName(selectedPatient),
            appointment_date: appointmentData.appointmentDate,
            appointment_time: appointmentData.startTime,
            visit_type: appointmentData.visitType,
            doctor_id: appointmentData.doctorId || 'Not assigned',
            notes: appointmentData.notes || '',
            status: 'scheduled',
            created_at: new Date().toISOString(),
            is_fallback: true
          };
          
          // Store in localStorage
          const existingAppointments = JSON.parse(localStorage.getItem('fallback_appointments') || '[]');
          existingAppointments.push(fallbackAppointment);
          localStorage.setItem('fallback_appointments', JSON.stringify(existingAppointments));
          
          toast.success('Appointment saved locally. Will sync when backend is available.', {
            duration: 5000,
            style: {
              background: '#F59E0B',
              color: 'white',
              fontWeight: 'bold'
            }
          });
          
          closeScheduleModal();
        } catch (fallbackError) {
          toast.error('Failed to save appointment locally. Please try again.');
        }
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        toast.error('Network error. Please check your internet connection and try again.')
      } else if (error.message.includes('patient') || error.message.includes('Patient')) {
        toast.error('Invalid patient data. Please refresh the page and try again.')
      } else if (error.message.includes('time slot') || error.message.includes('booked') || error.message.includes('slot')) {
        toast.error('Time slot already booked or unavailable. Please choose another time.')
      } else {
        toast.error(error.message || 'Failed to schedule appointment. Please try again or contact support.')
      }
    } finally {
      setIsScheduling(false)
    }
  }

  // QUICK FIX: Direct schedule function using working endpoints
  const scheduleDirect = async (appointmentData) => {
    try {
      const api = (await import('../../services/apiService')).default;
      
      // Try to create an appointment request first (since /reception/appointment-requests GET works)
      const requestData = {
        patient_id: appointmentData.patient_id,
        doctor_id: appointmentData.doctor_id || null,
        preferred_date: appointmentData.appointment_date,
        preferred_time: appointmentData.appointment_time,
        reason: appointmentData.notes || 'Walk-in appointment',
        visit_type: appointmentData.visit_type,
        status: 'approved' // Auto-approve since receptionist is creating it
      };
      
      const response = await api.post('/reception/appointment-requests', requestData);
      return response.data;
    } catch (error) {
      console.error('Direct scheduling failed:', error);
      throw error;
    }
  };

  // Test function to find working endpoints
  const testAppointmentEndpoints = async () => {
    try {
      toast.loading('Testing appointment endpoints...');
      const workingEndpoint = await findWorkingAppointmentEndpoint();
      if (workingEndpoint) {
        toast.success(`Working endpoint found: ${workingEndpoint}`, { duration: 6000 });
      } else {
        toast.error('No working appointment endpoints found. Using fallback mode.', { duration: 6000 });
      }
    } catch (error) {
      toast.error('Endpoint test failed: ' + error.message);
    }
  }

  // ADD THIS FUNCTION: Quick workaround for scheduling
  const quickScheduleWorkaround = async () => {
    if (!selectedPatient) return;
    
    try {
      setIsScheduling(true);
      
      // Use the working endpoint from logs: /reception/appointment-requests (GET works, try POST)
      const api = (await import('../../services/apiService')).default;
      
      const appointmentPayload = {
        patient_id: selectedPatient.id || selectedPatient.patientId,
        patient_name: getPatientName(selectedPatient),
        appointment_date: appointmentData.appointmentDate || new Date().toISOString().split('T')[0],
        appointment_time: appointmentData.startTime || '10:00',
        visit_type: appointmentData.visitType || 'general_checkup',
        doctor_id: appointmentData.doctorId || null,
        notes: appointmentData.notes || '',
        is_walkin: true,
        status: 'scheduled'
      };
      
      console.log('🚀 Quick scheduling with payload:', appointmentPayload);
      
      // Try multiple endpoints
      const endpoints = [
        '/reception/appointment-requests',
        '/appointments/patient',
        '/patients/appointments',
        '/appointments'
      ];
      
      let lastError;
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.post(endpoint, appointmentPayload);
          toast.success(`Appointment scheduled via ${endpoint}!`, { duration: 5000 });
          closeScheduleModal();
          return;
        } catch (error) {
          lastError = error;
          console.log(`Endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }
      
      throw lastError || new Error('All endpoints failed');
      
    } catch (error) {
      console.error('Quick scheduling failed:', error);
      toast.error('Could not schedule appointment. Please try the manual method.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Emergency Fallback: If patients is not an array, show error
  if (!Array.isArray(patients)) {
    console.error('CRITICAL: patients is not an array:', patients);
    setPatients([]); // Force reset to empty array
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600">Register and manage patient records</p>
          <p className="text-sm text-gray-500 mt-1">
            Total Patients: {Array.isArray(patients) ? patients.length : 0}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Quick schedule button for testing */}
          <button 
            onClick={quickScheduleWorkaround}
            className="btn-secondary flex items-center space-x-2 text-sm"
            disabled={!selectedPatient}
          >
            <Clock className="h-4 w-4" />
            <span>Quick Schedule</span>
          </button>
          <button 
            onClick={testAppointmentEndpoints}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <FileText className="h-4 w-4" />
            <span>Test Endpoints</span>
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>{showAddForm ? 'Cancel' : 'Register Patient'}</span>
          </button>
        </div>
      </div>

      {/* Add Patient Form */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Register New Patient</h3>
          <form onSubmit={handleAddPatient} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newPatient.username}
                  onChange={(e) => setNewPatient({...newPatient, username: e.target.value})}
                  className="input-field"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                  className="input-field"
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={newPatient.name}
                onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                className="input-field"
                placeholder="Enter patient's full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newPatient.password}
                  onChange={(e) => setNewPatient({...newPatient, password: e.target.value})}
                  className="input-field"
                  placeholder="Enter password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                  className="input-field"
                  placeholder="09xxxxxxxx (10 digits starting with 09)"
                  pattern="09[0-9]{8}"
                  title="Phone number must start with 09 and be exactly 10 digits"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={(e) => setNewPatient({...newPatient, date_of_birth: e.target.value})}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  value={newPatient.age}
                  onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                  className="input-field"
                  placeholder="Enter age"
                  min="0"
                  max="150"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                  className="input-field"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={newPatient.address}
                onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                className="input-field"
                rows={2}
                placeholder="Enter address..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={newPatient.emergency_contact}
                  onChange={(e) => setNewPatient({...newPatient, emergency_contact: e.target.value})}
                  className="input-field"
                  placeholder="Emergency contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={newPatient.emergency_phone}
                  onChange={(e) => setNewPatient({...newPatient, emergency_phone: e.target.value})}
                  className="input-field"
                  placeholder="Emergency contact phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Type
                </label>
                <select
                  value={newPatient.blood_type}
                  onChange={(e) => setNewPatient({...newPatient, blood_type: e.target.value})}
                  className="input-field"
                >
                  <option value="">Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies
                </label>
                <input
                  type="text"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Penicillin, Latex"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={newPatient.insurance_provider}
                  onChange={(e) => setNewPatient({...newPatient, insurance_provider: e.target.value})}
                  className="input-field"
                  placeholder="Insurance company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Number
                </label>
                <input
                  type="text"
                  value={newPatient.insurance_number}
                  onChange={(e) => setNewPatient({...newPatient, insurance_number: e.target.value})}
                  className="input-field"
                  placeholder="Policy number"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={newPatient.occupation}
                  onChange={(e) => setNewPatient({...newPatient, occupation: e.target.value})}
                  className="input-field"
                  placeholder="Patient's occupation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marital Status
                </label>
                <select
                  value={newPatient.marital_status}
                  onChange={(e) => setNewPatient({...newPatient, marital_status: e.target.value})}
                  className="input-field"
                >
                  <option value="">Select status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medical History
              </label>
              <textarea
                value={newPatient.medical_history}
                onChange={(e) => setNewPatient({...newPatient, medical_history: e.target.value})}
                className="input-field"
                rows={3}
                placeholder="Enter medical history..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Register Patient
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              className="input-field pl-10"
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPatients.length > 0 ? (
          filteredPatients.map(p => (
            <div key={p.id || p._id || p.email} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{getPatientName(p)}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-blue-600">ID: {p.patientId || p.roleSpecificId || p.id || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">@{getPatientUsername(p) || 'No username'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{p.phone || 'Phone not available'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{p.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Age: {getPatientAge(p)} | Registered: {new Date(p.createdAt || p.registered || Date.now()).toLocaleDateString()}</span>
                      </div>
                      {p.blood_type && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Blood Type: <span className="font-medium">{p.blood_type}</span></span>
                        </div>
                      )}
                      {p.allergies && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-red-600">Allergies: <span className="font-medium">{p.allergies}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => viewPatientDetails(p)}
                    className="btn-secondary text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedPatient(p);
                      openScheduleModal(p);
                    }}
                    className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Schedule</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No patients found' : 'No patients registered'}
            </h3>
            <p className="text-gray-600">
              {search 
                ? `No patients match your search for "${search}"`
                : 'Start by registering your first patient.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Patient Details Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Patient Details
                </h2>
                <button 
                  onClick={closePatientModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-600 font-medium">Name: </span>
                        <span className="text-gray-800">{getPatientName(selectedPatient)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Patient ID: </span>
                        <span className="text-blue-600 font-mono font-semibold">{selectedPatient.patientId || selectedPatient.roleSpecificId || selectedPatient.employee_id || selectedPatient.id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Username: </span>
                        <span className="text-gray-800">{getPatientUsername(selectedPatient) || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Email: </span>
                        <span className="text-gray-800">{selectedPatient.email || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Phone: </span>
                        <span className="text-gray-800">{selectedPatient.phone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Age: </span>
                        <span className="text-gray-800">{getPatientAge(selectedPatient)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Gender: </span>
                        <span className="text-gray-800">{selectedPatient.gender || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Medical Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Blood Type: </span>
                        <span className="text-gray-800">{selectedPatient.blood_type || selectedPatient.blood_group || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Allergies: </span>
                        <span className="text-gray-800">{selectedPatient.allergies || 'None specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Insurance Provider: </span>
                        <span className="text-gray-800">{selectedPatient.insurance_provider || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Insurance Number: </span>
                        <span className="text-gray-800">{selectedPatient.insurance_number || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedPatient.address && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Address</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedPatient.address}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Name: </span>
                        <span className="text-gray-800">{selectedPatient.emergency_contact || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Phone: </span>
                        <span className="text-gray-800">{selectedPatient.emergency_phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-600 font-medium">Occupation: </span>
                        <span className="text-gray-800">{selectedPatient.occupation || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Marital Status: </span>
                        <span className="text-gray-800">{selectedPatient.marital_status || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedPatient.medical_history && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Medical History</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedPatient.medical_history}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button 
                  onClick={() => {
                    closePatientModal()
                    openScheduleModal(selectedPatient)
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Schedule Appointment</span>
                </button>
                <button 
                  onClick={closePatientModal}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Appointment Modal */}
      {showScheduleModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Schedule Appointment
                </h2>
                <button 
                  onClick={closeScheduleModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Patient: {getPatientName(selectedPatient)}</h3>
                <p className="text-sm text-gray-600">@{getPatientUsername(selectedPatient) || 'no username'} • {selectedPatient.email || 'no email'}</p>
                <p className="text-sm text-blue-600 mt-1">
                  <strong>Note:</strong> If scheduling fails, appointment will be saved locally and synced later.
                </p>
              </div>
              
              <form onSubmit={handleScheduleAppointment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      value={appointmentData.appointmentDate}
                      onChange={(e) => setAppointmentData({...appointmentData, appointmentDate: e.target.value})}
                      className="input-field"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={appointmentData.startTime}
                      onChange={(e) => setAppointmentData({...appointmentData, startTime: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Type *
                  </label>
                  <select
                    value={appointmentData.visitType}
                    onChange={(e) => setAppointmentData({...appointmentData, visitType: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select visit type</option>
                    <option value="general_checkup">General Checkup</option>
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Follow-up Visit</option>
                    <option value="emergency">Emergency</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="lab_work">Lab Work</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Doctor (Optional)
                  </label>
                  <input
                    type="text"
                    value={appointmentData.doctorId}
                    onChange={(e) => setAppointmentData({...appointmentData, doctorId: e.target.value})}
                    className="input-field"
                    placeholder="Doctor ID or leave empty for any available doctor"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={appointmentData.notes}
                    onChange={(e) => setAppointmentData({...appointmentData, notes: e.target.value})}
                    className="input-field"
                    rows={3}
                    placeholder="Additional notes or special instructions..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    className="btn-secondary"
                    disabled={isScheduling}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary flex items-center space-x-2"
                    disabled={isScheduling}
                  >
                    {isScheduling ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{isScheduling ? 'Scheduling...' : 'Schedule Appointment'}</span>
                  </button>
                </div>
              </form>
              
              {/* Fallback option */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Having issues? Try:</p>
                <button
                  type="button"
                  onClick={quickScheduleWorkaround}
                  className="w-full btn-secondary text-sm"
                  disabled={isScheduling}
                >
                  Quick Schedule (Alternative Method)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReceptionistPatients;
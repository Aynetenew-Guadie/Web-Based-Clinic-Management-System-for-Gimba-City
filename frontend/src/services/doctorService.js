import api from './apiService';

// NOTE: Service relies on real backend APIs only

// Helper function to extract data from various response structures
const extractData = (response, dataKey = 'data') => {
  if (!response) return null;
  
  // If API returns { success: true, data: [...] } unwrap the array directly
  if (response.data && Array.isArray(response.data)) return response.data;

  // Handle different response structures
  if (Array.isArray(response)) {
    return response;
  } else if (response[dataKey] !== undefined) {
    return response[dataKey];
  } else if (response.data && response.data[dataKey] !== undefined) {
    return response.data[dataKey];
  } else if (response.appointments !== undefined) {
    return response.appointments;
  } else if (response.stats !== undefined) {
    return response.stats;
  } else if (response.patients !== undefined) {
    return response.patients;
  } else if (typeof response === 'object') {
    return response;
  }
  
  return response;
};

// Normalize various patient/appointment shapes into a consistent patient object
export const normalizePatient = (item) => {
  if (!item) return null;

  // If item looks like a patient already
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

  // If item is an appointment with nested patient
  if (item.patient || item.patient_id || item.patientId) {
    const p = item.patient || item.patient_id || item.patientId;
    return normalizePatient(p);
  }

  // If wrapped in data
  if (item.data && typeof item.data === 'object') {
    return normalizePatient(item.data);
  }

  return null;
};

// Enhanced service functions with proper data extraction
export const getTodaysAppointments = async () => {
  try {
    console.log('Fetching today\'s appointments...');
    
    const endpoints = [
      '/doctor/appointments/today',
      '/doctor/today-appointments',
      '/doctor/appointments?filter=today',
      '/appointments/doctor/today'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        console.log(`✅ Success with endpoint: ${endpoint}`);
        
        // Extract appointments from response and return whatever the backend gives (even empty arrays)
        const appointments = extractData(response, 'appointments') || (response.data && Array.isArray(response.data) ? response.data : []);
        console.log('Raw appointments response:', response.data);
        console.log('Extracted appointments:', appointments);
        return appointments;
      } catch (error) {
        lastError = error;
        console.log(`❌ Failed with endpoint: ${endpoint}`, error.response?.status);
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('No appointments available from backend; returning empty list');
    return [];
    
  } catch (error) {
    console.error('Error in getTodaysAppointments:', error);
    return [];
  }
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const endpoints = [
      `/doctor/appointments/${appointmentId}/status`,
      `/appointments/${appointmentId}/status`,
      `/doctor/update-appointment-status`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint, { status });
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Appointment status update failed - backend endpoints not available');
    throw lastError || new Error('Appointment status update failed');
    
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return {
      success: false,
      message: 'Failed to update appointment status'
    };
  }
};

export const searchPatients = async (searchTerm) => {
  try {
    console.log('Searching patients with query:', searchTerm);
    
    const endpoints = [
      '/doctor/patients/search',
      '/doctor/patients',
      '/patients/doctor',
      '/patients/search'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint, {
          params: { q: searchTerm, search: searchTerm, query: searchTerm }
        });
        // Return backend response even if it's an empty array (means no matches)
        const rawPatients = extractData(response, 'patients') || (response.data && Array.isArray(response.data) ? response.data : []);
        if (Array.isArray(rawPatients)) {
          const normalized = rawPatients.map(normalizePatient).filter(Boolean);
          return normalized;
        }
        return [];
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Patient search failed - backend endpoints not available');
    return [];
    
  } catch (error) {
    console.error('Error in searchPatients:', error);
    return [];
  }
};

export const searchLabTechnicians = async () => {
  try {
    const endpoints = [
      '/doctor/lab-technicians',
      '/lab-technicians',
      '/users/lab-technicians'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const technicians = extractData(response, 'technicians');
        if (Array.isArray(technicians)) {
          return technicians;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Lab technicians unavailable - backend endpoints not available');
    return [];
    
  } catch (error) {
    console.error('Error in searchLabTechnicians:', error);
    return [];
  }
};

export const getPatientRecords = async (patientId) => {
  try {
    const endpoints = [
      `/doctor/patients/${patientId}/records`,
      `/patients/${patientId}/records`,
      `/medical-records/patient/${patientId}`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const records = extractData(response, 'records');
        if (Array.isArray(records)) {
          return records;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Patient records unavailable - backend endpoints not available');
    return [];
    
  } catch (error) {
    console.error('Error fetching patient records:', error);
    return [];
  }
};

export const getPatientSummary = async (patientId) => {
  try {
    const endpoints = [
      `/doctor/patients/${patientId}/summary`,
      `/patients/${patientId}/summary`,
      `/patient-summary/${patientId}`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const summary = extractData(response, 'summary');
        if (summary) {
          return summary;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Patient summary unavailable - backend endpoints not available');
    return null;
    
  } catch (error) {
    console.error('Error fetching patient summary:', error);
    return null;
  }
};

export const createMedicalNote = async (noteData) => {
  try {
    const endpoints = [
      '/doctor/medical-notes',
      '/medical-notes',
      '/doctor/notes'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.post(endpoint, noteData);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Medical note creation failed - backend endpoints not available');
    throw lastError || new Error('Medical note creation failed');
    
  } catch (error) {
    console.error('Error creating medical note:', error);
    return {
      success: false,
      message: 'Failed to create medical note'
    };
  }
};

export const completeAppointment = async (appointmentId, completionData) => {
  try {
    const endpoints = [
      `/doctor/appointments/${appointmentId}/complete`,
      `/appointments/${appointmentId}/complete`,
      `/doctor/complete-appointment`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.post(endpoint, {
          appointmentId,
          ...completionData
        });
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Complete appointment failed - backend endpoints not available');
    throw lastError || new Error('Complete appointment failed');
    
  } catch (error) {
    console.error('Error completing appointment:', error);
    return {
      success: false,
      message: 'Failed to complete appointment'
    };
  }
};

export const createBilling = async (billingData) => {
  try {
    const endpoints = [
      '/doctor/billing',
      '/billing',
      '/doctor/create-billing'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.post(endpoint, billingData);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Billing creation failed - backend endpoints not available');
    throw lastError || new Error('Billing creation failed');
    
  } catch (error) {
    console.error('Error creating billing:', error);
    return {
      success: false,
      message: 'Failed to create billing'
    };
  }
};

export const createPrescription = async (prescriptionData) => {
  try {
    const endpoints = [
      '/doctor/prescriptions',
      '/prescriptions',
      '/doctor/create-prescription'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.post(endpoint, prescriptionData);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Prescription creation failed - backend endpoints not available');
    throw lastError || new Error('Prescription creation failed');
    
  } catch (error) {
    console.error('Error creating prescription:', error);
    return {
      success: false,
      message: 'Failed to create prescription'
    };
  }
};

export const getPrescriptions = async () => {
  try {
    const endpoints = [
      '/doctor/prescriptions',
      '/prescriptions',
      '/doctor/all-prescriptions'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const prescriptions = extractData(response, 'prescriptions');
        if (Array.isArray(prescriptions)) {
          return prescriptions;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('No prescriptions available - backend endpoints not available');
    return [];
    
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return [];
  }
};

export const updatePrescription = async (prescriptionId, data) => {
  try {
    const endpoints = [
      `/doctor/prescriptions/${prescriptionId}`,
      `/prescriptions/${prescriptionId}`,
      `/doctor/update-prescription`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint, data);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Prescription update failed - backend endpoints not available');
    throw lastError || new Error('Prescription update failed');
    
  } catch (error) {
    console.error('Error updating prescription:', error);
    return {
      success: false,
      message: 'Failed to update prescription'
    };
  }
};

export const getLabRequests = async () => {
  try {
    const endpoints = [
      '/doctor/lab-requests',
      '/lab-requests',
      '/doctor/all-lab-requests'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const labRequests = extractData(response, 'labRequests');
        if (Array.isArray(labRequests)) {
          return labRequests;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('No lab requests available - backend endpoints not available');
    return [];
    
  } catch (error) {
    console.error('Error fetching lab requests:', error);
    return [];
  }
};

export const createLabRequest = async (labRequestData) => {
  try {
    const endpoints = [
      '/doctor/lab-requests',
      '/lab-requests',
      '/doctor/create-lab-request'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.post(endpoint, labRequestData);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Lab request creation failed - backend endpoints not available');
    throw lastError || new Error('Lab request creation failed');
    
  } catch (error) {
    console.error('Error creating lab request:', error);
    return {
      success: false,
      message: 'Failed to create lab request'
    };
  }
};

export const updateLabRequest = async (requestId, labRequestData) => {
  try {
    const endpoints = [
      `/doctor/lab-requests/${requestId}`,
      `/lab-requests/${requestId}`,
      `/doctor/update-lab-request`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint, labRequestData);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Lab request update failed - backend endpoints not available');
    throw lastError || new Error('Lab request update failed');
    
  } catch (error) {
    console.error('Error updating lab request:', error);
    return {
      success: false,
      message: 'Failed to update lab request'
    };
  }
};

export const getLabResults = async () => {
  try {
    const endpoints = [
      '/doctor/lab-results',
      '/lab-results',
      '/doctor/all-lab-results'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const labResults = extractData(response, 'labResults');
        if (Array.isArray(labResults)) {
          return labResults;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('No lab results available - backend endpoints not available');
    return [];
    
  } catch (error) {
    console.error('Error fetching lab results:', error);
    return [];
  }
};

export const getDoctorStats = async () => {
  try {
    console.log('Fetching doctor stats...');
    
    const endpoints = [
      '/doctor/stats',
      '/doctor/dashboard-stats',
      '/doctor/statistics',
      '/stats/doctor'
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying stats endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        console.log(`✅ Stats success with endpoint: ${endpoint}`);
        
        const stats = extractData(response, 'stats');
        if (stats && typeof stats === 'object') {
          console.log('Extracted stats:', stats);
          return stats;
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Stats failed with endpoint: ${endpoint}`, error.response?.status);
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Doctor stats unavailable - backend endpoints not available');
    return {};
    
  } catch (error) {
    console.error('Error in getDoctorStats:', error);
    return {};
  }
};

export const releaseLabResultToPatient = async (resultId, diagnosisNotes) => {
  try {
    const endpoints = [
      `/doctor/lab-results/${resultId}/release`,
      `/lab-results/${resultId}/release`,
      `/doctor/release-lab-result`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint, { diagnosisNotes });
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Lab result release failed - backend endpoints not available');
    throw lastError || new Error('Lab result release failed');
    
  } catch (error) {
    console.error('Error releasing lab result:', error);
    return {
      success: false,
      message: 'Failed to release lab result to patient'
    };
  }
};

export const shareLabResultToPatient = async (resultId) => {
  try {
    const endpoints = [
      `/doctor/lab-results/${resultId}/share`,
      `/lab-results/${resultId}/share`,
      `/doctor/share-lab-result`
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status !== 404) {
          break;
        }
      }
    }
    
    console.warn('Lab result share failed - backend endpoints not available');
    throw lastError || new Error('Lab result share failed');
    
  } catch (error) {
    console.error('Error sharing lab result:', error);
    return {
      success: false,
      message: 'Failed to share lab result with patient'
    };
  }
};

// Enhanced utility function to check backend availability
export const checkDoctorBackendAvailability = async () => {
  const testEndpoints = [
    '/doctor/appointments/today',
    '/doctor/stats',
    '/doctor/patients'
  ];
  
  const results = {};
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await api.get(endpoint);
      results[endpoint] = {
        status: 'available',
        data: response.data
      };
    } catch (error) {
      results[endpoint] = {
        status: error.response?.status === 404 ? 'not_found' : 'error',
        error: error.message
      };
    }
  }
  
  console.log('Doctor backend availability check:', results);
  return results;
};

// Export mock data for testing
// No mock exports — service uses real backend endpoints only
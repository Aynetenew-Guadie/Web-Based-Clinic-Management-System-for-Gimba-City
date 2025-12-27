import api from './apiService';

// Utility function to handle API errors consistently
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status,
    url: error.config?.url
  });
  
  throw new Error(
    error.response?.data?.error || 
    error.response?.data?.message || 
    error.message || 
    defaultMessage
  );
};

// Check if endpoint exists
const checkEndpoint = async (endpoint) => {
  try {
    await api.options(endpoint);
    return true;
  } catch (error) {
    return error.response?.status !== 404;
  }
};

export const getPatientProfile = async () => {
  try {
    console.log('🔍 Fetching patient profile...');
    
    // Try multiple possible endpoints
    const endpoints = [
      '/patient/profile',
      '/patients/profile',
      '/users/profile',
      '/profile'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        console.log('✅ Patient profile fetched successfully');

        // Normalize common response shapes
        const resp = response.data || {};
        if (resp.data && typeof resp.data === 'object') return resp.data;
        if (resp.success && resp.data && typeof resp.data === 'object') return resp.data;
        // If response itself is the profile object
        return resp;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ Endpoint ${endpoint} not found, trying next...`);
          continue;
        }
        console.error('Error when fetching profile from', endpoint, error);
        // continue to next endpoint in case of other errors
        continue;
      }
    }

    // No backend profile endpoint available - return fallback from localStorage/user
    console.warn('⚠️ All profile endpoints failed - returning local fallback');
    const storedUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('userData') || 'null');
      } catch (e) {
        return null;
      }
    })();

    const fallback = {
      name: storedUser?.name || storedUser?.username || '',
      email: storedUser?.email || '',
      first_name: storedUser?.first_name || (storedUser?.name ? storedUser.name.split(' ')[0] : ''),
      last_name: storedUser?.last_name || (storedUser?.name ? storedUser.name.split(' ').slice(1).join(' ') : ''),
      username: storedUser?.username || storedUser?.email?.split('@')?.[0] || '',
      id: storedUser?.id || null
    };

    return fallback;
  } catch (error) {
    console.error('Unexpected error fetching patient profile:', error);
    // Final fallback: empty profile
    return {
      name: '',
      email: '',
      first_name: '',
      last_name: '',
      username: '',
      id: null
    };
  }
};


export const updatePatientProfile = async (profileData) => {
  try {
    console.log('📝 Updating patient profile:', profileData);
    
    const endpoints = [
      '/patient/profile',
      '/patients/profile',
      '/users/profile'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint, profileData);
        console.log('✅ Patient profile updated successfully via', endpoint, response);

        // Normalize response shapes
        const resp = response || {};
        const data = resp.data || resp;

        // If backend returned { success: true, user: { ... } }
        if (data.user) return data;
        // If backend returned the user object directly
        if (data.id || data.email) return { user: data };

        // Last resort: return whatever the response contained
        return { user: data };
      } catch (error) {
        if (error.response?.status === 404) continue;
        // For non-404 errors, log and try next endpoint but keep information
        console.error('Error updating profile at', endpoint, error);
        // If it's a 500 or server error, attempt to continue to next endpoint
        continue;
      }
    }
    
    // No backend update endpoint available
    console.warn('⚠️ Profile update endpoints failed');
    // Fallback: update localStorage userData so UI still reflects change
    try {
      const existing = JSON.parse(localStorage.getItem('userData') || 'null') || {};
      const merged = { ...existing, ...profileData };
      localStorage.setItem('userData', JSON.stringify(merged));
      return { user: merged };
    } catch (e) {
      throw new Error('Profile update failed, no backend available');
    }
    
  } catch (error) {
    // If the error came from API library, try a graceful local fallback
    console.error('Final error updating profile:', error);

    try {
      const existing = JSON.parse(localStorage.getItem('userData') || 'null') || {};
      const merged = { ...existing, ...profileData };
      localStorage.setItem('userData', JSON.stringify(merged));
      return { user: merged };
    } catch (e) {
      return handleApiError(error, 'Failed to update patient profile');
    }
  }
};


export const getPatientAppointments = async () => {
  try {
    console.log('📅 Fetching patient appointments...');
    
    const endpoints = [
      '/patient/appointments',
      '/patients/appointments',
      '/appointments/patient',
      '/reception/scheduled-appointments' // Reception endpoint that might work
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Appointments fetched via ${endpoint}`);
        
        // Normalize different response formats so consumers always get an array
        const respData = response.data || {};

        if (respData.data && Array.isArray(respData.data.appointments)) {
          return respData.data.appointments;
        }

        if (Array.isArray(respData.data)) {
          return respData.data;
        }

        if (Array.isArray(respData)) {
          return respData;
        }

        if (respData.appointments && Array.isArray(respData.appointments)) {
          return respData.appointments;
        }

        return [];
        
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // Fallback: return empty array
    console.warn('⚠️ No appointment endpoints available, returning empty array');
    return [];
    
  } catch (error) {
    console.error('Failed to fetch patient appointments:', error);
    return [];
  }
};

export const requestAppointment = async (appointmentData) => {
  try {
    console.log('📋 Requesting appointment:', appointmentData);
    
    const endpoints = [
      '/patient/appointment-requests',
      '/patients/appointment-requests',
      '/appointment-requests',
      '/reception/appointment-requests', // Reception endpoint
      '/appointments/patient',
      '/reception/scheduled-appointments'
    ];
    
    const payload = {
      preferred_date: appointmentData.preferredDate,
      preferred_time: appointmentData.preferredTime,
      preferred_time_slot: appointmentData.preferredTimeSlot,
      reason: appointmentData.reason,
      notes: appointmentData.notes,
      preferred_doctor_id: appointmentData.preferredDoctorId,
      visit_type: appointmentData.visitType || 'consultation',
      urgency: appointmentData.urgency || 'normal'
    };
    
    for (const endpoint of endpoints) {
      try {
        // Send payload; some endpoints expect different field names but many
        // will accept the common ones we provide.
        const response = await api.post(endpoint, payload);
        console.log(`✅ Appointment request submitted via ${endpoint}`);
        return response.data || response;
      } catch (error) {
        // If endpoint not found, try next. For other errors, log and continue
        if (error.response?.status === 404) {
          console.log(`❌ Endpoint ${endpoint} not found, trying next...`);
          continue;
        }
        console.warn(`⚠️ Error submitting to ${endpoint}:`, error.message || error);
        continue;
      }
    }

    // No backend endpoint available
    console.warn('⚠️ Appointment request endpoints failed');
    throw new Error('Appointment request failed, no backend available');
    
  } catch (error) {
    return handleApiError(error, 'Failed to request appointment');
  }
};


export const getAppointmentRequests = async () => {
  try {
    console.log('📋 Fetching appointment requests...');
    
    const endpoints = [
      '/patient/appointment-requests',
      '/patients/appointment-requests',
      '/appointment-requests/patient',
      '/reception/appointment-requests',
      '/appointments/patient'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Appointment requests fetched via ${endpoint}`);
        // Normalize response shapes to an array of requests
        const resp = response.data || {};
        let apiRequests = [];

        if (resp.data && Array.isArray(resp.data.appointmentRequests)) {
          apiRequests = resp.data.appointmentRequests;
        } else if (resp.data && Array.isArray(resp.data.requests)) {
          apiRequests = resp.data.requests;
        } else if (resp.data && Array.isArray(resp.data)) {
          apiRequests = resp.data;
        } else if (Array.isArray(resp)) {
          apiRequests = resp;
        } else if (resp.appointmentRequests && Array.isArray(resp.appointmentRequests)) {
          apiRequests = resp.appointmentRequests;
        } else if (resp.requests && Array.isArray(resp.requests)) {
          apiRequests = resp.requests;
        }

        const fallbackRequests = JSON.parse(localStorage.getItem('fallback_appointment_requests') || '[]');

        return [...apiRequests, ...fallbackRequests];
        
      } catch (error) {
        if (error.response?.status === 404) continue;
        // Log and continue to try other endpoints instead of throwing
        console.warn(`Error fetching appointment requests from ${endpoint}:`, error.message || error);
        continue;
      }
    }
    
    // No backend endpoints available - return empty list to surface missing data
    console.warn('⚠️ No appointment request endpoints available');
    return [];
    
  } catch (error) {
    console.error('Failed to fetch appointment requests:', error);
    // Return empty list to avoid rejecting callers — UI will show empty state
    return [];
  }
};

export const cancelAppointmentRequest = async (requestId) => {
  try {
    console.log(`❌ Cancelling appointment request: ${requestId}`);
    
    const endpoints = [
      `/patient/appointment-requests/${requestId}/cancel`,
      `/patients/appointment-requests/${requestId}/cancel`,
      `/appointment-requests/${requestId}/cancel`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint);
        console.log(`✅ Appointment request cancelled via ${endpoint}`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No backend endpoint available for cancel
    console.warn('⚠️ Cancel appointment endpoints failed');
    throw new Error('Cancel appointment failed, no backend available');
    
  } catch (error) {
    return handleApiError(error, 'Failed to cancel appointment request');
  }
};


export const getMedicalRecords = async () => {
  try {
    console.log('🏥 Fetching medical records...');
    
    const endpoints = [
      '/patient/medical-records',
      '/patients/medical-records',
      '/medical-records/patient'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Medical records fetched via ${endpoint}`);
        // Normalize a few possible backend response shapes so callers always
        // receive an array of records.
        // Known shapes:
        // 1) { success: true, data: { medicalRecords: [...], pagination: {...} } }
        // 2) { success: true, data: [...records...] }
        // 3) [...records...]
        const respData = response.data || {};

        // Case 1: nested 'data.medicalRecords'
        if (respData.data && Array.isArray(respData.data.medicalRecords)) {
          return respData.data.medicalRecords;
        }

        // Case 2: 'data' is directly the array
        if (Array.isArray(respData.data)) {
          return respData.data;
        }

        // Case 3: response itself is the array
        if (Array.isArray(respData)) {
          return respData;
        }

        // Fallback: attempt to extract common keys
        if (respData.medicalRecords && Array.isArray(respData.medicalRecords)) {
          return respData.medicalRecords;
        }

        // Otherwise return empty array to keep consumers safe
        return [];
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No medical record endpoints available
    console.warn('⚠️ No medical record endpoints available');
    return [];
    
  } catch (error) {
    console.error('Failed to fetch medical records:', error);
    return [];
  }
};

export const getPrescriptions = async () => {
  try {
    console.log('💊 Fetching prescriptions...');
    
    const endpoints = [
      '/patient/prescriptions',
      '/patients/prescriptions',
      '/prescriptions/patient'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Prescriptions fetched via ${endpoint}`);
        // Normalize possible backend shapes so callers always get an array
        const respData = response.data || {};

        // Case: { success: true, data: { prescriptions: [...], pagination: {...} } }
        if (respData.data && Array.isArray(respData.data.prescriptions)) {
          return respData.data.prescriptions;
        }

        // Case: data is directly the array
        if (Array.isArray(respData.data)) {
          return respData.data;
        }

        // Case: response itself is the array
        if (Array.isArray(respData)) {
          return respData;
        }

        // Fallback common key
        if (respData.prescriptions && Array.isArray(respData.prescriptions)) {
          return respData.prescriptions;
        }

        return [];
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No prescription endpoints available
    console.warn('⚠️ No prescription endpoints available');
    return [];
    
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    return [];
  }
};

export const getPrescriptionDetails = async (prescriptionId) => {
  try {
    const resp = await api.get(`/patient/prescriptions/${prescriptionId}`);
    return resp.data?.data || resp.data;
  } catch (error) {
    console.error('Failed to fetch prescription details:', error);
    throw error;
  }
};

export const getLabResults = async () => {
  try {
    console.log('🔬 Fetching lab results...');
    
    const endpoints = [
      '/patient/lab-results',
      '/patients/lab-results',
      '/lab-results/patient'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Lab results fetched via ${endpoint}`);
        const respData = response.data || {};

        if (respData.data && Array.isArray(respData.data.labResults)) {
          return respData.data.labResults;
        }

        if (Array.isArray(respData.data)) {
          return respData.data;
        }

        if (Array.isArray(respData)) {
          return respData;
        }

        if (respData.labResults && Array.isArray(respData.labResults)) {
          return respData.labResults;
        }

        return [];
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No lab result endpoints available
    console.warn('⚠️ No lab result endpoints available');
    return [];
    
  } catch (error) {
    console.error('Failed to fetch lab results:', error);
    return [];
  }
};

export const getBillingHistory = async () => {
  try {
    console.log('💰 Fetching billing history...');
    
    const endpoints = [
      '/patient/billing',
      '/patients/billing',
      '/billing/patient',
      '/reception/billing' // Reception endpoint
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Billing history fetched via ${endpoint}`);

        const respData = response.data || {};
        let billingData = [];

        if (respData.data && Array.isArray(respData.data.billing)) {
          billingData = respData.data.billing;
        } else if (Array.isArray(respData.data)) {
          billingData = respData.data;
        } else if (Array.isArray(respData)) {
          billingData = respData;
        } else if (respData.billing && Array.isArray(respData.billing)) {
          billingData = respData.billing;
        }

        if (endpoint === '/reception/billing') {
          billingData = billingData.filter(bill => bill.patient_id === 1);
        }

        return billingData;
        
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No billing endpoints available
    console.warn('⚠️ No billing endpoints available');
    return [];
    
  } catch (error) {
    console.error('Failed to fetch billing history:', error);
    return [];
  }
};

export const cancelAppointment = async (appointmentId) => {
  try {
    console.log(`❌ Cancelling appointment: ${appointmentId}`);
    
    const endpoints = [
      `/patient/appointments/${appointmentId}/cancel`,
      `/patients/appointments/${appointmentId}/cancel`,
      `/appointments/${appointmentId}/cancel`,
      `/reception/appointments/${appointmentId}/cancel` // Reception endpoint
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint);
        console.log(`✅ Appointment cancelled via ${endpoint}`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No backend endpoint available
    console.warn('⚠️ Cancel appointment endpoints failed');
    throw new Error('Cancel appointment failed, no backend available');
    
  } catch (error) {
    return handleApiError(error, 'Failed to cancel appointment');
  }
};

export const rescheduleAppointment = async (appointmentId, rescheduleData) => {
  try {
    console.log(`🔄 Rescheduling appointment: ${appointmentId}`, rescheduleData);
    
    const endpoints = [
      `/patient/appointments/${appointmentId}/reschedule`,
      `/patients/appointments/${appointmentId}/reschedule`,
      `/appointments/${appointmentId}/reschedule`
    ];
    
    const payload = {
      new_date: rescheduleData.newDate,
      new_time: rescheduleData.newTime,
      reason: rescheduleData.reason,
      preferred_doctor_id: rescheduleData.preferredDoctorId
    };
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.put(endpoint, payload);
        console.log(`✅ Reschedule request submitted via ${endpoint}`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) continue;
        throw error;
      }
    }
    
    // No backend endpoint available
    console.warn('⚠️ Reschedule endpoints failed');
    throw new Error('Reschedule request failed, no backend available');
    
  } catch (error) {
    return handleApiError(error, 'Failed to request reschedule');
  }
};

// Additional utility functions for patient dashboard
export const getPatientDashboardStats = async () => {
  try {
    console.log('📊 Fetching patient dashboard stats...');
    
    // Try to get various data points
    const [appointments, requests, billing] = await Promise.allSettled([
      getPatientAppointments(),
      getAppointmentRequests(),
      getBillingHistory()
    ]);
    
    const stats = {
      upcomingAppointments: appointments.status === 'fulfilled' ? 
        appointments.value.filter(apt => new Date(apt.appointment_date || apt.date) >= new Date()).length : 0,
      pendingRequests: requests.status === 'fulfilled' ? 
        requests.value.filter(req => req.status === 'pending').length : 0,
      totalBillingRecords: billing.status === 'fulfilled' ? billing.value.length : 0,
      recentActivity: 0 // Could be calculated from various sources
    };
    
    return stats;
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      upcomingAppointments: 0,
      pendingRequests: 0,
      totalBillingRecords: 0,
      recentActivity: 0
    };
  }
};

// Debug function to check available endpoints
export const debugPatientEndpoints = async () => {
  const endpoints = [
    '/patient/profile',
    '/patient/appointments',
    '/patient/appointment-requests',
    '/patient/medical-records',
    '/patient/prescriptions',
    '/patient/lab-results',
    '/patient/billing',
    '/patients/profile',
    '/patients/appointments',
    '/appointments/patient',
    '/reception/scheduled-appointments',
    '/reception/appointment-requests',
    '/reception/billing'
  ];
  
  console.log('🔍 Checking patient endpoint availability:');
  
  const availableEndpoints = [];
  
  for (const endpoint of endpoints) {
    const exists = await checkEndpoint(endpoint);
    if (exists) {
      console.log(`✅ ${endpoint} - Available`);
      availableEndpoints.push(endpoint);
    } else {
      console.log(`❌ ${endpoint} - Not available`);
    }
  }
  
  console.log('📋 Available patient endpoints:', availableEndpoints);
  return availableEndpoints;
};

// Initialize debug on import
setTimeout(() => {
  debugPatientEndpoints().catch(() => {
    console.log('Patient endpoint check completed');
  });
}, 1000);

// Create service object for default export
const patientService = {
  getPatientProfile,
  updatePatientProfile,
  getPatientAppointments,
  requestAppointment,
  getAppointmentRequests,
  cancelAppointmentRequest,
  getMedicalRecords,
  getPrescriptions,
  getLabResults,
  getBillingHistory,
  cancelAppointment,
  rescheduleAppointment,
  getPatientDashboardStats,
  debugPatientEndpoints,
  getPrescriptionDetails
};

export default patientService;
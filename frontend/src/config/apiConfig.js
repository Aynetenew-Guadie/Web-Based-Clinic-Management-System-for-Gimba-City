export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',

  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh-token',
      LOGOUT: '/auth/logout'
    },
    PATIENT: {
      PROFILE: '/patient/profile',
      APPOINTMENTS: '/patient/appointments',
      APPOINTMENT_REQUESTS: '/patient/appointment-requests',
      MEDICAL_RECORDS: '/patient/medical-records',
      PRESCRIPTIONS: '/patient/prescriptions',
      LAB_RESULTS: '/patient/lab-results',
      BILLING: '/patient/billing'
    },
    DOCTOR: {
      APPOINTMENTS_TODAY: '/doctor/appointments/today',
      PATIENTS_SEARCH: '/doctor/patients/search',
      PATIENT_RECORDS: '/doctor/patients',
      MEDICAL_NOTES: '/doctor/medical-notes',
      PRESCRIPTIONS: '/doctor/prescriptions',
      LAB_REQUESTS: '/doctor/lab-requests',
      LAB_RESULTS: '/doctor/lab-results'
    },
    LAB: {
      PENDING_TESTS: '/lab/pending-tests',
      ACCEPT_TEST: '/lab/accept-test-request',
      ENTER_RESULT: '/lab/enter-test-result',
      COMPLETED_TESTS: '/lab/completed-tests',
      TEST_DETAILS: '/lab/test'
    },
    RECEPTION: {
      REGISTER_PATIENT: '/reception/register-patient',
      SCHEDULE_APPOINTMENT: '/reception/schedule-appointment',
      PATIENT_QUEUE: '/reception/patient-queue',
      CHECK_IN_PATIENT: '/reception/check-in-patient',
      APPOINTMENT_REQUESTS: '/reception/appointment-requests',
      PROCESS_REQUEST: '/reception/process-appointment-request',
      AVAILABLE_DOCTORS: '/reception/available-doctors'
    },
    ADMIN: {
      // User Management
      USERS: '/admin/users',
      USERS_STATS: '/admin/users/stats',
      USER_CREATE: '/admin/users', // POST
      USER_UPDATE: '/admin/users', // PATCH /admin/users/:id
      USER_DELETE: '/admin/users', // DELETE /admin/users/:id
      
      // Dashboard & Overview
      OVERVIEW: '/admin/overview',
      STATS: '/admin/stats',
      BILLING_STATS: '/admin/billing/stats',
      BILLING_OVERVIEW: '/admin/billing',
      
      // System Data
      SYSTEM_DATA: '/system/data',
      ACTIVITY_RECENT: '/activity/recent',
      
      // Other Admin Endpoints
      ATTENDANCE_LOGS: '/admin/attendance-logs',
      SHIFTS: '/admin/shifts'
    },
    DASHBOARD: {
      ROLE_DATA: '/dashboard' // /dashboard/:role
    }
  },
  
  TIMEOUT: 10000,
  
  RATE_LIMIT: {
    AUTH: 5, 
    GENERAL: 100 
  }
};

export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getEndpoint = (category, key) => {
  return API_CONFIG.ENDPOINTS[category]?.[key];
};

// Helper function to build URLs with parameters
export const buildUrlWithParams = (endpoint, params = {}) => {
  let url = buildApiUrl(endpoint);
  
  // Replace path parameters
  Object.keys(params).forEach(key => {
    if (url.includes(`:${key}`)) {
      url = url.replace(`:${key}`, encodeURIComponent(params[key]));
      delete params[key];
    }
  });
  
  // Add query parameters
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParams.append(key, params[key]);
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};

// Helper for specific user operations
export const getUserEndpoints = (userId) => ({
  get: buildApiUrl(`/admin/users/${userId}`),
  update: buildApiUrl(`/admin/users/${userId}`),
  delete: buildApiUrl(`/admin/users/${userId}`),
  toggleStatus: buildApiUrl(`/admin/users/${userId}`)
});
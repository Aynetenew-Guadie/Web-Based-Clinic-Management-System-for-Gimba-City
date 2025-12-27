import api from './apiService';

// Helper function to extract data from various response structures
const extractLabData = (response) => {
  if (!response || !response.data) return null;
  
  const data = response.data;
  
  // Handle different response structures
  if (Array.isArray(data)) {
    return data;
  } else if (data.tests !== undefined) {
    return data.tests;
  } else if (data.data !== undefined) {
    return data.data;
  } else if (Array.isArray(data.data)) {
    return data.data;
  } else if (data.success && data.tests !== undefined) {
    return data.tests;
  } else if (data.success && Array.isArray(data.data)) {
    return data.data;
  }
  
  return data;
};

// Helper function to handle API errors consistently
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', error);
  
  if (error.response?.data) {
    const errorData = error.response.data;
    throw new Error(
      errorData.error || 
      errorData.message || 
      errorData.details || 
      defaultMessage
    );
  }
  
  throw new Error(defaultMessage);
};

// Simple in-memory cache for user lookups
const userCache = new Map();

const fetchUserById = async (id) => {
  if (!id) return null;
  if (typeof id === 'object') return id;
  const key = String(id);
  if (userCache.has(key)) return userCache.get(key);

  try {
    const resp = await api.get(`/admin/users/${key}`);
    const user = resp.data?.user || resp.data?.data || resp.data;
    userCache.set(key, user);
    return user;
  } catch (err) {
    console.warn('Failed to fetch user', id, err?.response?.data || err.message);
    userCache.set(key, null);
    return null;
  }
};

const enrichTestsWithUsers = async (tests) => {
  if (!Array.isArray(tests)) return tests;

  const userIds = new Set();
  tests.forEach(t => {
    const p = t.labRequest?.patient || t.patient || t.patientId || t.patientInfo;
    const d = t.labRequest?.doctor || t.doctor || t.requestedBy || t.requestedById;
    if (p && (typeof p === 'string' || typeof p === 'number')) userIds.add(String(p));
    if (d && (typeof d === 'string' || typeof d === 'number')) userIds.add(String(d));
  });

  // Parallel fetches
  await Promise.all(Array.from(userIds).map(id => fetchUserById(id)));

  // Attach fetched users back onto tests
  return tests.map(t => {
    const patientId = t.labRequest?.patient || t.patient || t.patientId || t.patientInfo;
    const doctorId = t.labRequest?.doctor || t.doctor || t.requestedBy || t.requestedById;
    const patient = (typeof patientId === 'string' || typeof patientId === 'number') ? userCache.get(String(patientId)) : (patientId || null);
    const doctor = (typeof doctorId === 'string' || typeof doctorId === 'number') ? userCache.get(String(doctorId)) : (doctorId || null);
    return {
      ...t,
      labRequest: {
        ...(t.labRequest || {}),
        patient: patient || (t.labRequest && t.labRequest.patient) || null,
        doctor: doctor || (t.labRequest && t.labRequest.doctor) || null
      },
      patient: patient || t.patient,
      doctor: doctor || t.doctor
    };
  });
};

export const getPendingTests = async () => {
  try {
    console.log('Fetching pending tests...');
    const response = await api.get('/lab/pending-tests');
    
    console.log('Pending tests raw response:', response.data);
    
    // Extract tests from response
    const tests = extractLabData(response);
    console.log('Extracted pending tests:', tests);
    
    const enriched = await enrichTestsWithUsers(Array.isArray(tests) ? tests : []);
    // Always return an array, even if empty
    return Array.isArray(enriched) ? enriched : [];
  } catch (error) {
    console.error('Error in getPendingTests:', error);
    // Surface details via the shared handler, but fall back to empty array for UI
    try { handleApiError(error, 'Failed to fetch pending tests'); } catch (e) {}
    return [];
  }
};

export const getInProgressTests = async () => {
  try {
    console.log('Fetching in-progress tests...');
    const response = await api.get('/lab/in-progress-tests');
    
    console.log('In-progress tests raw response:', response.data);
    
    const tests = extractLabData(response);
    console.log('Extracted in-progress tests:', tests);
    
    const enriched = await enrichTestsWithUsers(Array.isArray(tests) ? tests : []);
    return Array.isArray(enriched) ? enriched : [];
  } catch (error) {
    console.error('Error in getInProgressTests:', error);
    console.error('getInProgressTests error details:', error.response?.data);
    try { handleApiError(error, 'Failed to fetch in-progress tests'); } catch (e) {}
    return [];
  }
};

export const acceptTestRequest = async (testId, technicianId) => {
  try {
    console.log('Accepting test request:', { testId, technicianId });
    
    const response = await api.post('/lab/accept-test-request', {
      labRequestId: testId,
      testId: testId, // Send both for compatibility
      technicianId: technicianId // This might be handled by auth in backend
    });
    
    console.log('Accept test request response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in acceptTestRequest:', error);
    handleApiError(error, 'Failed to accept test request');
  }
};

export const enterTestResult = async (testId, resultData) => {
  try {
    console.log('Entering test result:', { testId, resultData });
    
    // Prepare data in multiple formats for backend compatibility
    const requestData = {
      labRequestId: testId,
      testId: testId, // Send both for compatibility
      // Support both field names for results
      resultDetails: resultData.results || resultData.resultDetails,
      results: resultData.results || resultData.resultDetails,
      findings: resultData.findings || '',
      notes: resultData.notes || '',
      reportUrl: resultData.reportUrl || ''
    };
    
    const response = await api.post('/lab/enter-test-result', requestData);
    
    console.log('Enter test result response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in enterTestResult:', error);
    handleApiError(error, 'Failed to enter test result');
  }
};

export const getCompletedTests = async () => {
  try {
    console.log('Fetching completed tests...');
    const response = await api.get('/lab/completed-tests');
    
    console.log('Completed tests raw response:', response.data);
    
    const tests = extractLabData(response);
    console.log('Extracted completed tests:', tests);
    
    const enriched = await enrichTestsWithUsers(Array.isArray(tests) ? tests : []);
    return Array.isArray(enriched) ? enriched : [];
  } catch (error) {
    console.error('Error in getCompletedTests:', error);
    try { handleApiError(error, 'Failed to fetch completed tests'); } catch (e) {}
    return [];
  }
};

export const getTestDetails = async (testId) => {
  try {
    console.log('Fetching test details for:', testId);
    const response = await api.get(`/lab/test/${testId}`);
    
    console.log('Test details response:', response.data);
    
    // Extract test from response
    const data = response.data;
    return data.test || data.data || data;
  } catch (error) {
    console.error('Error in getTestDetails:', error);
    handleApiError(error, 'Failed to fetch test details');
  }
};

export const sendResultToDoctor = async (testId) => {
  try {
    console.log('Sending result to doctor for test:', testId);
    const response = await api.post(`/lab/tests/${testId}/send-to-doctor`);
    return response.data;
  } catch (error) {
    console.error('Error in sendResultToDoctor:', error);
    // Surface error
    handleApiError(error, 'Failed to send result to doctor');
  }
};

// Additional utility functions

export const getLabStats = async () => {
  try {
    const response = await api.get('/lab/stats');
    return response.data.stats || response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching lab stats:', error);
    try { handleApiError(error, 'Failed to fetch lab stats'); } catch (e) {}
    return {};
  }
};

export const updateTestStatus = async (testId, status) => {
  try {
    const response = await api.put(`/lab/tests/${testId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating test status:', error);
    handleApiError(error, 'Failed to update test status');
  }
};

// Mock data removed. Service relies on backend responses only.
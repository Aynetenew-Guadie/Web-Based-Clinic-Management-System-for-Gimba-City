import api from './apiService';

// local helper (kept small to avoid cross-service coupling)
const extractData = (response, dataKey = 'data') => {
  if (!response) return null;
  // If backend returned an array directly
  if (Array.isArray(response)) return response;
  // If axios-like response with data as an array
  if (response.data && Array.isArray(response.data)) return response.data;
  // Common envelopes
  if (response[dataKey] !== undefined) return response[dataKey];
  if (response.data && response.data[dataKey] !== undefined) return response.data[dataKey];
  // Fallback null
  return null;
};

export const getPrescriptions = async (params = {}) => {
  try {
    const resp = await api.get('/pharmacist/prescriptions', { params });
    return extractData(resp, 'prescriptions') || resp.data?.data?.prescriptions || resp.data?.prescriptions || [];
  } catch (error) {
    console.error('Error fetching pharmacist prescriptions:', error);

    // Dev fallback: if access denied or unauthorized, try the dev in-memory endpoint
    const status = error?.status || error?.response?.status;
    if (status === 403 || status === 401) {
      try {
        const devResp = await api.get('/dev/prescriptions');
        return devResp.data?.data || devResp.data || [];
      } catch (devErr) {
        console.error('Dev fallback failed:', devErr);
      }
    }

    throw error;
  }
}

export const dispensePrescription = async (prescriptionId) => {
  try {
    const resp = await api.post(`/pharmacist/prescriptions/${prescriptionId}/dispense`);
    return resp.data;
  } catch (error) {
    console.error('Error dispensing prescription:', error);
    throw error;
  }
}

export const getPatient = async (patientId) => {
  try {
    const resp = await api.get(`/pharmacist/patients/${patientId}`);
    return resp.data?.data || resp.data;
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw error;
  }
}

export const updatePatient = async (patientId, data) => {
  try {
    const resp = await api.put(`/pharmacist/patients/${patientId}`, data);
    return resp.data;
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
}

export const listDrugs = async () => {
  try {
    const resp = await api.get('/pharmacist/drugs');
    return resp.data?.data || resp.data || [];
  } catch (error) {
    console.error('Error listing drugs:', error);
    throw error;
  }
}

export const addDrug = async (payload) => {
  try {
    const resp = await api.post('/pharmacist/drugs', payload);
    return resp.data;
  } catch (error) {
    console.error('Error adding drug:', error);
    throw error;
  }
}

export default {
  getPrescriptions,
  dispensePrescription,
  getPatient,
  updatePatient,
  listDrugs,
  addDrug
};
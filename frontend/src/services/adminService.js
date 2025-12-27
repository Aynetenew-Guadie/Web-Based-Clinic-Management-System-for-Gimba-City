import api from './apiService';

export const getUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch users');
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create user');
  }
};


export const getUserStats = async () => {
  try {
    const response = await api.get('/admin/users/stats');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch user statistics');
  }
};

export const getBillingStats = async () => {
  try {
    const response = await api.get('/admin/billing/stats');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch billing statistics');
  }
};


export const getBillingOverview = async () => {
  try {
    const response = await api.get('/admin/billing-overview');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch billing overview');
  }
};

export const resetUserPassword = async (userId, password) => {
  try {
    const payload = password && password.trim() ? { password: password.trim() } : {};
    // api.post returns the parsed JSON body directly (not axios-style), so return it
    const response = await api.post(`/admin/users/${userId}/reset-password`, payload);
    return response || { success: true, message: 'Password reset', generatedPassword: null };
  } catch (error) {
    // Normalize error message shape from apiService
    const errMsg = error?.message || error?.data?.error || 'Failed to reset user password';
    throw new Error(errMsg);
  }
};



// Simple apiService without external config dependencies
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
    this.timeout = 10000;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    // Build URL and include query params if provided in options.params
    let url = `${this.baseURL}${endpoint}`;
    const params = options.params;
    if (params && typeof params === 'object') {
      const usp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) usp.append(k, String(v));
      });
      const qs = usp.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Remove params before passing to fetch
    if (config.params) delete config.params;

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log(`🔄 API Call: ${options.method || 'GET'} ${url}`);
      const response = await fetch(url, config);

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText} - ${url}`);
      }

      return await this.handleResponse(response, url);
    } catch (error) {
      console.error('💥 API Request failed:', error, url);
      throw this.handleError(error);
    }
  }

  // HTTP methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Response handler
  async handleResponse(response, url = '') {
    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }

    if (!response.ok) {
      throw {
        status: response.status,
        url,
        message: (data && (data.error || data.message)) || `Request failed with status ${response.status}`,
        data: data
      };
    }

    console.log('✅ API Response:', data, url);
    return data;
  }

  // Error handler
  handleError(error) {
    if (error.name === 'TimeoutError') {
      return {
        status: 408,
        message: 'Request timeout - server is not responding'
      };
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        status: 0,
        message: 'Cannot connect to server. Please check if the backend is running on localhost:5000'
      };
    }
    
    return error;
  }

  // ==================== NEW: CONNECTION TEST METHODS ====================

  // Test server connection
  async testConnection() {
    try {
      console.log('🔌 Testing connection to:', this.baseURL);
      const response = await this.get('/health');
      return {
        success: true,
        message: '✅ Server is connected and responding',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Cannot connect to server: ${error.message}`,
        error: error
      };
    }
  }

  // Test login endpoint specifically
  async testLoginEndpoint() {
    try {
      const testCredentials = {
        email: 'feredeworkineh4@gmail.com',
        password: 'fd@2127!'
      };
      console.log('🔑 Testing login endpoint...');
      const response = await this.post('/auth/login', testCredentials);
      return {
        success: true,
        message: '✅ Login endpoint is working',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Login endpoint error: ${error.message}`,
        error: error
      };
    }
  }

  // Get server status
  async getServerStatus() {
    try {
      const health = await this.get('/health');
      const endpoints = [
        '/auth/login',
        '/admin/overview',
        '/admin/users'
      ];
      
      const status = {
        baseUrl: this.baseURL,
        health: health,
        endpoints: {}
      };

      // Test each endpoint
      for (const endpoint of endpoints) {
        try {
          await this.get(endpoint);
          status.endpoints[endpoint] = '✅ Working';
        } catch (error) {
          status.endpoints[endpoint] = `❌ ${error.status || 'Error'}`;
        }
      }

      return status;
    } catch (error) {
      return {
        baseUrl: this.baseURL,
        error: `Cannot connect to server: ${error.message}`
      };
    }
  }

  // ==================== SPECIFIC API METHODS ====================

  // Auth methods
  async login(credentials) {
    return this.post('/auth/login', credentials);
  }

  async logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    return { success: true, message: 'Logged out successfully' };
  }

  // Admin methods
  async getAdminUsers() {
    return this.get('/admin/users');
  }

  async createUser(userData) {
    return this.post('/admin/users', userData);
  }

  async updateUser(userId, userData) {
    return this.patch(`/admin/users/${userId}`, userData);
  }

  async deleteUser(userId) {
    return this.delete(`/admin/users/${userId}`);
  }

  async getAdminOverview() {
    return this.get('/admin/overview');
  }

  async getSystemData() {
    return this.get('/system/data');
  }

  async getUsersStats() {
    return this.get('/admin/users/stats');
  }

  async getBillingStats() {
    return this.get('/admin/billing/stats');
  }

  async getRecentActivity() {
    return this.get('/activity/recent');
  }

  // Dashboard methods
  async getDashboardData(role) {
    return this.get(`/dashboard/${role}`);
  }

  // Utility methods
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

// Create and export singleton instance
const apiService = new ApiService();

// Export both default and named exports for flexibility
export default apiService;
export { apiService };
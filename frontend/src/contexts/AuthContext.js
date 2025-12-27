import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loginUser, logoutUser, testConnection } from '../services/authService';

// Create and export the context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // Clear all authentication data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  // Client-side token validation (since validateToken doesn't exist in authService)
  const validateAuthToken = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      
      if (!storedToken || !userData) {
        return false;
      }

      // Check if token has expired
      if (tokenExpiry && new Date().getTime() > parseInt(tokenExpiry)) {
        console.log('Token has expired');
        clearAuthData();
        return false;
      }

      // Test connection to verify token is still valid
      try {
        await testConnection();
        setToken(storedToken);
        setUser(JSON.parse(userData));
        return true;
      } catch (error) {
        console.error('Token validation failed:', error);
        clearAuthData();
        return false;
      }
    } catch (err) {
      console.error('Error validating token:', err);
      clearAuthData();
      return false;
    }
  }, [clearAuthData]); // Added clearAuthData to dependencies

  // Store token with expiry
  const storeTokenWithExpiry = useCallback((authToken, expiresInHours = 24) => {
    const expiryTime = new Date().getTime() + (expiresInHours * 60 * 60 * 1000);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
    setToken(authToken);
  }, []);

  // Provide a helper to set token and user data directly (useful for auto-login flows)
  const setAuthData = useCallback((authToken, userData, expiresInHours = 24) => {
    try {
      storeTokenWithExpiry(authToken, expiresInHours);
      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setToken(authToken);
    } catch (err) {
      console.error('Error setting auth data:', err);
    }
  }, [storeTokenWithExpiry]);

  // Check for existing token and validate it on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        await validateAuthToken();
      } catch (err) {
        console.error('Error initializing auth:', err);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [validateAuthToken, clearAuthData]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      console.log('AuthContext: Starting login process...');
      console.log('Attempting login to:', email);
      
      const response = await loginUser(email, password);
      
      if (response.success && response.token && response.user) {
        const { token: authToken, user: userData } = response;
        
        // Store token and user data with expiry
        storeTokenWithExpiry(authToken);
        localStorage.setItem('userData', JSON.stringify(userData));
        
        setUser(userData);
        setToken(authToken);
        
        console.log('AuthContext: Login successful', userData);
        return { 
          success: true, 
          user: userData,
          token: authToken
        };
      } else {
        const errorMsg = response.error || response.message || 'Login failed';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      
      // Enhanced error handling
      let errorMessage = error.message;
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error: Unable to connect to server';
      }
      
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      const currentToken = token || localStorage.getItem('authToken');
      
      if (currentToken) {
        // Call logout API if we have a token
        await logoutUser(currentToken);
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear all local storage and state
      clearAuthData();
      console.log('User logged out successfully');
    }
  }, [token, clearAuthData]);

  // Auto-logout when token expires
  useEffect(() => {
    const checkTokenExpiry = () => {
      const expiry = localStorage.getItem('tokenExpiry');
      if (expiry && new Date().getTime() > parseInt(expiry)) {
        console.log('Token expired, logging out...');
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, [logout]); // Added logout to dependencies

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    try {
      const mergedUser = { ...user, ...updatedUserData };
      setUser(mergedUser);
      localStorage.setItem('userData', JSON.stringify(mergedUser));
    } catch (err) {
      console.error('Error updating user data:', err);
    }
  }, [user]);

  // Client-side token refresh simulation (since we don't have refresh endpoint)
  const refreshToken = useCallback(async () => {
    try {
      const currentToken = token || localStorage.getItem('authToken');
      if (!currentToken) {
        throw new Error('No token available');
      }

      // Since we don't have a refresh endpoint, we'll just validate the current token
      const isValid = await validateAuthToken();
      if (isValid) {
        // Update expiry time
        storeTokenWithExpiry(currentToken);
        return { success: true, token: currentToken };
      } else {
        throw new Error('Token validation failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); // Logout if token refresh fails
      return { success: false, error: error.message };
    }
  }, [token, validateAuthToken, storeTokenWithExpiry, logout]);

  const hasRole = useCallback((requiredRole) => {
    if (!user) return false;
    return user.role === requiredRole;
  }, [user]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    // Check if user has specific permission
    return user.permissions?.includes(permission) || false;
  }, [user]);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    clearError,
    updateUser,
    refreshToken,
    hasRole,
    hasPermission,
    isAuthenticated: !!user && !!token,
    isDoctor: user?.role === 'doctor',
    isAdmin: user?.role === 'admin',
    isPatient: user?.role === 'patient',
    isReception: user?.role === 'reception',
    // Expose helper for setting auth directly (used after password reset)
    setAuthData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context as default for useContext
export default AuthContext;
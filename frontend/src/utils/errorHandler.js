
export class ApiError extends Error {
  constructor(message, statusCode, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}


export const ERROR_MESSAGES = {

  401: 'Unauthorized. Please log in again.',
  403: 'Access denied. You don\'t have permission to perform this action.',

  400: 'Invalid request. Please check your input and try again.',
  404: 'Resource not found.',
  409: 'Conflict. The resource already exists or cannot be created.',
  422: 'Validation error. Please check your input.',
  
  500: 'Internal server error. Please try again later.',
  502: 'Bad gateway. Service temporarily unavailable.',
  503: 'Service unavailable. Please try again later.',
  
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
};

export const parseApiError = (error) => {
  if (error.response) {

    const { status, data } = error.response;
    const message = data?.error || ERROR_MESSAGES[status] || ERROR_MESSAGES.UNKNOWN;
    return new ApiError(message, status, error);
  } else if (error.request) {
 
    if (error.code === 'ECONNABORTED') {
      return new ApiError(ERROR_MESSAGES.TIMEOUT, 408, error);
    }
    return new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, error);
  } else {

    return new ApiError(error.message || ERROR_MESSAGES.UNKNOWN, 0, error);
  }
};

export const handleApiError = (error, context = '') => {
  const apiError = parseApiError(error);
  
  console.error(`API Error in ${context}:`, {
    message: apiError.message,
    statusCode: apiError.statusCode,
    timestamp: apiError.timestamp,
    originalError: apiError.originalError
  });
  
  switch (apiError.statusCode) {
    case 401:
 
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      break;
      
    case 403:
   
      console.warn('Permission denied for:', context);
      break;
      
    case 500:
   
      console.error('Server error occurred in:', context);
      break;
      
    default:

      break;
  }
  
  return apiError;
};

export const formatErrorForUser = (error) => {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return ERROR_MESSAGES.UNKNOWN;
};

export const withRetry = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries) {

        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        console.warn(`Retry attempt ${attempt} for API call`);
      }
    }
  }
  
  throw lastError;
};

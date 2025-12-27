const API_BASE_URL = 'http://localhost:5000/api';

export const loginUser = async (email, password) => {
    console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
    console.log('Credentials:', { email });

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error(data.error || `Login failed with status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Login error details:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // If you have a logout API endpoint, call it here
        // const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        //     }
        // });
        
        console.log('User logged out successfully');
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};

// Test API connection
export const testConnection = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Connection test failed:', error);
        throw error;
    }
};
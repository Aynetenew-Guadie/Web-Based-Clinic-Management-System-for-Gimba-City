import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import api from '../../services/apiService'; // Import the API service
import './loginStyles.css';

const Login = () => {
    const [email, setEmail] = useState('feredeworkineh4@gmail.com');
    const [password, setPassword] = useState('fd@2127!');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    // Logo handling: will detect available logo URL among several candidate locations
    const [logoUrl, setLogoUrl] = useState(null);

    useEffect(() => {
        const candidates = [
            process.env.PUBLIC_URL + '/ethio/logo.jpg',
            process.env.PUBLIC_URL + '/ethio/logo.png',
            process.env.PUBLIC_URL + '/logo.jpg',
            process.env.PUBLIC_URL + '/logo.png',
            '/ethio/logo.jpg',
            '/ethio/logo.png',
            '/logo.jpg',
            '/logo.png',
            'file:///C:/Users/Student/Desktop/ethio/logo.jpg',
            'file:///C:/Users/Student/Desktop/ethio/logo.png'
        ];

        let mounted = true;

        const testImage = (url) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });

        (async () => {
            for (const url of candidates) {
                const ok = await testImage(url);
                if (!mounted) return;
                if (ok) {
                    setLogoUrl(url);
                    return;
                }
            }
            // No logo found
            setLogoUrl(null);
        })();

        return () => { mounted = false; };
    }, []);
    
    const { login, error, clearError } = useContext(AuthContext);
    const navigate = useNavigate();

    // Test server connection
    const testServerConnection = async () => {
        setIsTesting(true);
        setConnectionStatus('Testing connection to server...');
        clearError();
        
        try {
            console.log('🔌 Testing connection to backend...');
            const result = await api.testConnection();
            
            if (result.success) {
                setConnectionStatus('✅ Server is connected and responding!');
                console.log('✅ Server connection test passed:', result);
                
                // Test login endpoint specifically
                setConnectionStatus('Testing login endpoint...');
                const loginTest = await api.testLoginEndpoint();
                
                if (loginTest.success) {
                    setConnectionStatus('✅ Server and login endpoint are working! Ready to login.');
                } else {
                    setConnectionStatus('❌ Server is connected but login endpoint has issues');
                }
            } else {
                setConnectionStatus(`❌ ${result.message}`);
                console.error('❌ Server connection test failed:', result);
            }
        } catch (error) {
            setConnectionStatus(`❌ Connection test failed: ${error.message}`);
            console.error('💥 Connection test error:', error);
        } finally {
            setIsTesting(false);
        }
    };

    // Get detailed server status
    const getDetailedStatus = async () => {
        setIsTesting(true);
        setConnectionStatus('Getting detailed server status...');
        
        try {
            const status = await api.getServerStatus();
            console.log('📊 Server status:', status);
            
            if (status.error) {
                setConnectionStatus(`❌ ${status.error}`);
            } else {
                let statusMessage = `✅ Server: ${status.baseUrl}\n`;
                statusMessage += `📊 Health: ${status.health.status}\n`;
                
                Object.entries(status.endpoints).forEach(([endpoint, status]) => {
                    statusMessage += `${endpoint}: ${status}\n`;
                });
                
                setConnectionStatus(statusMessage);
            }
        } catch (error) {
            setConnectionStatus(`❌ Failed to get server status: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        clearError();
        setConnectionStatus('');

        try {
            // Test connection first
            const connectionTest = await api.testConnection();
            if (!connectionTest.success) {
                setConnectionStatus('❌ Cannot connect to server. Please check if backend is running.');
                return;
            }

            // Then attempt login
            const result = await login(email, password);
            
            if (result.success) {
                console.log('Login successful, redirecting...');
                // Redirect based on user role
                switch (result.user.role) {
                    case 'admin':
                        navigate('/admin');
                        break;
                    case 'doctor':
                        navigate('/doctor');
                        break;
                    case 'patient':
                        navigate('/patient');
                        break;
                    case 'receptionist':
                        navigate('/reception');
                        break;
                    case 'lab_technician':
                        navigate('/lab');
                        break;
                    case 'pharmacist':
                        navigate('/pharmacist');
                        break;
                    default:
                        navigate('/dashboard');
                }
            }
        } catch (error) {
            console.error('Login failed:', error);
            setConnectionStatus(`Login failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen login-hero">
          <div className="flex min-h-screen">
            {/* Left image column - fills left side */}
            <div
              className="login-image w-full md:w-1/2"
              style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : {}}
            />

            {/* Right form column */}
            <div className="w-full md:w-1/2 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 login-title">
                        Wellcome To Web Based Clinic Managment System At Gimba City
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-700">
                        Sign in to your clinic management account
                    </p>
                </div>

                {/* Connection Test Section */}
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex space-x-2">
                        <button
                            onClick={testServerConnection}
                            disabled={isTesting}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50 text-sm"
                        >
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button
                            onClick={getDetailedStatus}
                            disabled={isTesting}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md disabled:opacity-50 text-sm"
                        >
                            Detailed Status
                        </button>
                    </div>
                    
                    {connectionStatus && (
                        <div className={`p-3 rounded text-sm whitespace-pre-line ${
                            connectionStatus.includes('✅') 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : connectionStatus.includes('❌')
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                            {connectionStatus}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        <strong className="font-bold">Login Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                                                {process.env.REACT_APP_ADMIN_ONLY_PASSWORD_RESET === 'true' ? (
                                <div className="text-sm text-gray-500">Password resets are handled by the administrator.</div>
                            ) : (
                                <div className="text-sm">
                                    <a href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                                        Forgot your password?
                                    </a>
                                </div>
                            )}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading || isTesting}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed btn-interactive"
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        © 2017 Clinic Management System. All rights reserved.
                    </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
};

export default Login;
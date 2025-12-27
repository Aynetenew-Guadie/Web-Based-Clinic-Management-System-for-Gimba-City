import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import BackButton from '../common/BackButton';
import { Lock, Eye, EyeOff, Building2, CheckCircle } from 'lucide-react';
import api from '../../services/apiService';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const ResetPassword = () => {
  const params = useParams();
  const navigate = useNavigate();
  // Allow token in either path param or query string (safer for JWTs with slashes)
  const token = params.token || new URLSearchParams(window.location.search).get('token');
  // get helper to set auth after successful reset
  const { setAuthData } = useAuth();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState(null);

  const isAdminOnly = process.env.REACT_APP_ADMIN_ONLY_PASSWORD_RESET === 'true';

  useEffect(() => {
    if (isAdminOnly) {
      setDisabledMessage('Self-service password reset is disabled. Please contact your administrator.');
      setIsTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        await api.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        setIsTokenValid(true);
      } catch (error) {
        console.error('Token verification error:', error);
        if (error.response?.status === 403) {
          setDisabledMessage(error.response.data?.error || 'Password resets are disabled. Please contact your administrator.');
          setIsTokenValid(false);
        } else {
          setIsTokenValid(false);
          toast.error('Invalid or expired reset link');
        }
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token, isAdminOnly]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: formData.newPassword
      });

      // If server returned token and user, auto-login
      if (res.token && res.user) {
        setAuthData(res.token, res.user);
        toast.success('Password reset successful — you are now logged in');
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
        return;
      }

      setIsSuccess(true);
      toast.success('Password reset successfully!');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Reset password error:', error);
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isTokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-orange-400 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {disabledMessage ? 'Password Reset Disabled' : 'Invalid Reset Link'}
            </h2>
            <p className="text-gray-600">
              {disabledMessage ? disabledMessage : 'This password reset link is invalid or has expired.'}
            </p>
          </div>

          <div className="card text-center">
            {disabledMessage ? (
              <div>
                <p className="text-gray-700 mb-4">Please contact your system administrator to have your password reset.</p>
                <div className="mt-4">
                  <BackButton />
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-700 mb-4">
                  Please request a new password reset link to continue.
                </p>
                <Link 
                  to="/forgot-password" 
                  className="btn-primary inline-block"
                >
                  Request New Link
                </Link>
                <div className="mt-4">
                  <BackButton />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Password Reset Successful
            </h2>
            <p className="text-gray-600">
              Your password has been updated successfully.
            </p>
          </div>

          <div className="card text-center">
            <p className="text-gray-700 mb-4">
              You will be redirected to the login page in a few seconds.
            </p>
            <Link 
              to="/login" 
              className="btn-primary inline-block"
            >
              Go to Login
            </Link>
            <div className="mt-4">
              <BackButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h2>
          <p className="text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Password must be at least 6 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <BackButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

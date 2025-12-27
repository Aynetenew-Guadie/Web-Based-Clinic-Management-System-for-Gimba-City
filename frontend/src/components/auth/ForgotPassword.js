import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../common/BackButton';
import { Mail, ArrowLeft, Building2 } from 'lucide-react';
import api from '../../services/apiService';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState(null);
  const isDev = process.env.NODE_ENV !== 'production';
  const isAdminOnly = process.env.REACT_APP_ADMIN_ONLY_PASSWORD_RESET === 'true';

  // If admin-only mode is enabled, pre-set the disabled message so the form is not shown
  React.useEffect(() => {
    if (isAdminOnly) {
      setIsSubmitted(true);
      setDisabledMessage('Self-service password resets have been disabled. Please contact your system administrator to reset your password.');
    }
  }, [isAdminOnly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
      toast.success('Password reset instructions sent to your email');

      // In development, fetch the dev preview email and show the reset link on screen
      if (isDev) {
        fetchDevPreviewLink();
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      if (error.response?.status === 403) {
        const msg = error.response.data?.error || error.response.data?.message || 'Password resets are disabled. Please contact administrator.';
        setDisabledMessage(msg);
        setIsSubmitted(true);
      } else {
        toast.error('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevPreviewLink = async () => {
    setIsFetchingLink(true);
    try {
      const res = await api.get('/dev/emails');
      const emails = res.data || [];

      // Find most recent email addressed to the submitted email
      const found = emails.slice().reverse().find(e => {
        if (!e) return false;
        const to = (e.to || '').toLowerCase();
        return to.includes(email.toLowerCase()) || to === email.toLowerCase();
      });

      if (found) {
        const content = (found.text || found.html || '');

        // Match a reset URL whether it uses path or query param
        const linkMatch = content.match(/https?:\/\/[^"'\s]+\/reset-password(?:[\/\?][^"'\s]*)?/i);
        if (linkMatch) {
          const urlStr = linkMatch[0];
          try {
            const u = new URL(urlStr);
            const tokenFromQuery = u.searchParams.get('token');
            if (tokenFromQuery) {
              setResetLink(`${u.origin}${u.pathname}?token=${tokenFromQuery}`);
            } else {
              // fallback to path token if present
              const pathMatch = u.pathname.match(/\/reset-password\/(?:([A-Za-z0-9._-]+))/i);
              if (pathMatch && pathMatch[1]) {
                setResetLink(`${u.origin}/reset-password?token=${pathMatch[1]}`);
              } else {
                setResetLink(urlStr);
              }
            }
          } catch (err) {
            // If URL parsing fails, just set the found link string
            setResetLink(linkMatch[0]);
          }
        } else {
          // Try to extract token parameter if present in plain text
          const tokenMatch = content.match(/token=([A-Za-z0-9._%-]+)/i);
          if (tokenMatch) {
            const token = decodeURIComponent(tokenMatch[1]);
            setResetLink(`${window.location.origin}/reset-password?token=${token}`);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch dev email preview:', err);
    } finally {
      setIsFetchingLink(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${disabledMessage ? 'bg-orange-400' : 'bg-green-600'}`}>
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {disabledMessage ? 'Password Reset Disabled' : 'Check Your Email'}
            </h2>
            <p className="text-gray-600">
              {disabledMessage ? disabledMessage : `We've sent password reset instructions to `}
              {disabledMessage ? null : (<><strong>{email}</strong></>)}
            </p>
          </div>

          <div className="card">
            <div className="text-center space-y-4">
              {disabledMessage ? (
                <div className="p-3 text-left">
                  <p className="text-gray-700">{disabledMessage}</p>
                  <p className="text-sm text-gray-600 mt-2">Please contact your system administrator or an active Administrator account to reset your password.</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-700">
                    If you don't see the email in your inbox, please check your spam folder.
                  </p>

                  {isDev && (
                    <div className="mt-2 p-3 bg-gray-50 border rounded text-left">
                      <p className="text-sm text-gray-600 mb-2">Dev preview: reset link (development only)</p>

                      {isFetchingLink ? (
                        <p className="text-sm text-gray-500">Fetching preview...</p>
                      ) : resetLink ? (
                        <div className="space-y-2">
                          <a href={resetLink} className="break-all text-primary-600 underline" target="_blank" rel="noreferrer">{resetLink}</a>
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => {
                                navigator.clipboard.writeText(resetLink);
                                toast.success('Reset link copied to clipboard');
                              }}
                            >
                              Copy Link
                            </button>
                            <a href={resetLink} className="btn-primary" target="_blank" rel="noreferrer">Open Reset Link</a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          No preview available yet. The server will show the link here when a dev preview is present.
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-gray-600">
                    The reset link will expire in 1 hour for security reasons.
                  </p>
                </>
              )}

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
            Forgot Password?
          </h2>
          <p className="text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-field pl-10"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                'Send Reset Link'
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

export default ForgotPassword;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Auto-focus username input when component mounts
  useEffect(() => {
    if (!authLoading && !isAuthenticated && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [authLoading, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.login(username, password);

      if (response.access_token) {
        login(response.access_token);
        navigate('/');
      } else if (response.token) {
        login(response.token);
        navigate('/');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-binance-dark flex items-center justify-center">
        <div className="text-binance-text-secondary">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-binance-dark flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative flex items-center justify-center h-32 w-32 rounded-lg bg-gradient-to-br from-binance-yellow/20 to-binance-yellow/5 border border-binance-yellow/30">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-full w-full object-contain filter brightness-110"
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-binance-text mb-2">Binance Scan Signal</h2>
          <p className="text-binance-text-secondary">Sign in to view real-time trading signals</p>
        </div>

        {/* Login Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-binance-red/20 text-binance-red border border-binance-red/30 rounded-md p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-binance-text mb-2">
                Username
              </label>
              <input
                ref={usernameInputRef}
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-binance-text mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-binance-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-binance-text-secondary">
            Real-time trading signals powered by Binance Futures
          </p>
        </div>
      </div>
    </div>
  );
};


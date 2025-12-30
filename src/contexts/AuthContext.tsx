import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken } from '../services/api';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load token from localStorage on mount
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    setAuthToken(newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    let cancelled = false;
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((data) => {
          if (!cancelled) setUser(data.user);
        })
        .catch(() => {
          if (!cancelled) {
            api.logout();
            setUser(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  // Listen for token expiry events fired by the API client
  useEffect(() => {
    const handleTokenExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:token-expired', handleTokenExpired);
    return () => window.removeEventListener('auth:token-expired', handleTokenExpired);
  }, []);

  const signup = async (userData) => {
    const data = await api.signup(userData);
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    return data;
  };

  const verifyEmail = async (code) => {
    const data = await api.verifyEmail(code);
    // Refresh user data after verification
    const meData = await api.getMe();
    setUser(meData.user);
    return data;
  };

  const resendCode = async () => {
    return api.resendCode();
  };

  const forgotPassword = async (email) => {
    return api.forgotPassword(email);
  };

  const resetPassword = async (token, newPassword) => {
    return api.resetPassword(token, newPassword);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      logout();
      return null;
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    verifyEmail,
    resendCode,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isVerified: user?.emailVerified === true,
    // Personal package
    isPaid: user?.paymentStatus === 'paid',
    hasCredentials: user?.ottProvisioned === true,
    // Business package
    isBizPaid: user?.bizPaymentStatus === 'paid',
    hasBizCredentials: user?.bizOttProvisioned === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

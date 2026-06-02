import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: 'USER' | 'ADMIN') => Promise<void>;
  googleLogin: (email: string, name: string, googleId: string) => Promise<void>;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  logout: () => void;
  demoLogin: (role: 'USER' | 'ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set axios base configurations dynamically based on window location hostname
const apiHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000';
axios.defaults.baseURL = apiHost;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load token on mount
  useEffect(() => {
    const savedToken = 'local-mode-dummy-token';
    const savedUser: User = {
      id: 'local-user',
      email: 'local@passbook.com',
      name: 'Local User',
      role: 'USER'
    };

    setToken(savedToken);
    setUser(savedUser);
    localStorage.setItem('token', savedToken);
    localStorage.setItem('user', JSON.stringify(savedUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    setLoading(false);
  }, []);

  const saveAuthSession = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/auth/login', { email, password });
    saveAuthSession(res.data.token, res.data.user);
  };

  const register = async (email: string, password: string, name: string, role?: 'USER' | 'ADMIN') => {
    const res = await axios.post('/api/auth/register', { email, password, name, role });
    saveAuthSession(res.data.token, res.data.user);
  };

  const googleLogin = async (email: string, name: string, googleId: string) => {
    const res = await axios.post('/api/auth/google', { email, name, googleId });
    saveAuthSession(res.data.token, res.data.user);
  };

  const resetPassword = async (email: string, newPass: string) => {
    await axios.post('/api/auth/reset-password', { email, newPassword: newPass });
  };

  const demoLogin = async (role: 'USER' | 'ADMIN') => {
    setLoading(true);
    try {
      // Demo accounts seed values:
      // admin@tracker.com / admin123
      // user@tracker.com / user123
      const email = role === 'ADMIN' ? 'admin@tracker.com' : 'user@tracker.com';
      const password = role === 'ADMIN' ? 'admin123' : 'user123';
      const res = await axios.post('/api/auth/login', { email, password });
      saveAuthSession(res.data.token, res.data.user);
    } catch (err) {
      console.error('Demo Login failed, trying manual registers:', err);
      // Fallback fallback: register standard demo profiles
      const seedName = role === 'ADMIN' ? 'Alpha Admin' : 'Standard Tracker';
      const seedEmail = role === 'ADMIN' ? `admin_${Date.now()}@demo.com` : `user_${Date.now()}@demo.com`;
      await register(seedEmail, 'demo123', seedName, role);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleLogin,
        resetPassword,
        logout,
        demoLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

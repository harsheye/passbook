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

// Offline/LocalStorage caching and sync interceptor for Axios
if (typeof window !== 'undefined' && window.localStorage) {
  // Response interceptor to cache GET results and handle offline failures
  axios.interceptors.response.use(
    (response) => {
      // Cache successful GET requests
      if (response.config.method?.toLowerCase() === 'get') {
        const cacheKey = `axios_cache_${response.config.url}_${JSON.stringify(response.config.params || {})}`;
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: response.data
          }));
        } catch (e) {
          console.warn('Failed to save to localStorage cache:', e);
        }
      }
      return response;
    },
    async (error) => {
      const { config, message } = error;
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || message?.toLowerCase().includes('network error');
      
      if (isNetworkError && config) {
        // Fallback for GET requests
        if (config.method?.toLowerCase() === 'get') {
          const cacheKey = `axios_cache_${config.url}_${JSON.stringify(config.params || {})}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const { data } = JSON.parse(cached);
              console.warn(`[Offline Mode] Serving cached data for GET ${config.url}`);
              return Promise.resolve({
                data,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
                request: {}
              });
            } catch (e) {
              console.error('Failed to parse cached data:', e);
            }
          }
        }
        
        // Queue mutations for POST/PUT/DELETE
        if (['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
          console.warn(`[Offline Mode] Queuing mutation: ${config.method?.toUpperCase()} ${config.url}`);
          const queueKey = 'axios_offline_queue';
          const currentQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
          
          currentQueue.push({
            id: `${Date.now()}_${Math.random()}`,
            url: config.url,
            method: config.method,
            data: config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : null
          });
          
          localStorage.setItem(queueKey, JSON.stringify(currentQueue));
          alert(`[Offline Mode] Connection lost or server down. Your changes have been cached locally and will sync when you are back online.`);
          
          return Promise.resolve({
            data: { success: true, message: 'Queued offline successfully', id: 'offline-mock-id' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            request: {}
          });
        }
      }
      return Promise.reject(error);
    }
  );

  // Background sync helper
  const syncOfflineQueue = async () => {
    if (navigator.onLine) {
      const queueKey = 'axios_offline_queue';
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      if (queue.length === 0) return;
      
      console.log(`[Sync] Found ${queue.length} pending offline mutations. Syncing...`);
      const remainingQueue = [];
      
      for (const item of queue) {
        try {
          if (item.method === 'post') {
            await axios.post(item.url, item.data);
          } else if (item.method === 'put') {
            await axios.put(item.url, item.data);
          } else if (item.method === 'delete') {
            await axios.delete(item.url);
          }
          console.log(`[Sync] Successfully synced: ${item.method.toUpperCase()} ${item.url}`);
        } catch (err) {
          console.error(`[Sync] Failed to sync ${item.method.toUpperCase()} ${item.url}:`, err);
          remainingQueue.push(item);
        }
      }
      
      localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
    }
  };

  window.addEventListener('online', syncOfflineQueue);
  window.addEventListener('load', syncOfflineQueue);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load token on mount and auto-login if none exists
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUserStr = localStorage.getItem('user');

      if (savedToken && savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          setToken(savedToken);
          setUser(savedUser);
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse saved user:', e);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }

      // No session, trigger auto demo login as ADMIN
      try {
        const email = 'admin@tracker.com';
        const password = 'admin123';
        const res = await axios.post('/api/auth/login', { email, password });
        saveAuthSession(res.data.token, res.data.user);
      } catch (err) {
        console.error('Demo Login failed, trying manual register:', err);
        try {
          const seedName = 'Alpha Admin';
          const seedEmail = `admin_${Date.now()}@demo.com`;
          const res = await axios.post('/api/auth/register', {
            email: seedEmail,
            password: 'demo123',
            name: seedName,
            role: 'ADMIN'
          });
          saveAuthSession(res.data.token, res.data.user);
        } catch (regErr) {
          console.error('Auto register failed:', regErr);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
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
    window.location.href = '/';
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

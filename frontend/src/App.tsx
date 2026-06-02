import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Import } from './pages/Import';
import { Schedules } from './pages/Schedules';
import { Gambling } from './pages/Gambling';
import { Combined } from './pages/Combined';
import { Chat } from './pages/Chat';

// ----------------------------------------------------
// ROUTING SECURITY GUARDS
// ----------------------------------------------------

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold">Authenticating session parameters...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold font-sans">Checking admin authorization...</p>
      </div>
    );
  }

  if (!user) {
    // Graceful fallback to user home
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

// ----------------------------------------------------
// MAIN ROUTER MAPS
// ----------------------------------------------------

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        
        {/* PUBLIC ACCESS CHANNELS REMOVED (LOCAL BYPASS) */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* PROTECTED ACCOUNT CHANNELS */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={
            <ProtectedRoute>
              <Import />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute>
              <Schedules />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* STRICT ADMIN RESTRICTED PANELS */}
        <Route
          path="/admin/gambling"
          element={
            <AdminRoute>
              <Gambling />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Combined />
            </ProtectedRoute>
          }
        />

        {/* ROOT FALLBACK REDIRECTS */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

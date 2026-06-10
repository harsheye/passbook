import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
import { Login } from './pages/Login';

// ----------------------------------------------------
// MAIN TABBED APP CONTAINER (Preserves screen state across tabs)
// ----------------------------------------------------

const MainTabApp: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className={isActive('/') ? 'h-full overflow-hidden' : 'hidden'}>
        <Chat />
      </div>
      <div className={isActive('/dashboard') ? 'h-full overflow-y-auto px-4 py-4 pb-20' : 'hidden'}>
        <Dashboard />
      </div>
      <div className={isActive('/transactions') ? 'h-full overflow-y-auto px-4 py-4 pb-20' : 'hidden'}>
        <Transactions />
      </div>
      <div className={isActive('/schedules') ? 'h-full overflow-y-auto px-4 py-4 pb-20' : 'hidden'}>
        <Schedules />
      </div>
      <div className={isActive('/profile') ? 'h-full overflow-y-auto px-4 py-4 pb-20' : 'hidden'}>
        <Combined />
      </div>
    </>
  );
};

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

  return <>{children}</>;
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

  return <>{children}</>;
};

// ----------------------------------------------------
// MAIN ROUTER MAPS
// ----------------------------------------------------

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        
        {/* PUBLIC ACCESS CHANNELS */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED ACCOUNT CHANNELS WITH LAYOUT WRAPPER */}
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <Outlet />
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<MainTabApp />} />
          <Route path="/dashboard" element={<MainTabApp />} />
          <Route path="/transactions" element={<MainTabApp />} />
          <Route path="/schedules" element={<MainTabApp />} />
          <Route path="/profile" element={<MainTabApp />} />
          <Route path="/import" element={<Import />} />
          
          {/* STRICT ADMIN RESTRICTED PANELS */}
          <Route
            path="/admin/gambling"
            element={
              <AdminRoute>
                <Gambling />
              </AdminRoute>
            }
          />
        </Route>

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

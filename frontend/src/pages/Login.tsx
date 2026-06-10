import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, AlertCircle, ShieldAlert, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register, resetPassword, googleLogin, demoLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');
  
  // Forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [newPass, setNewPass] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else if (tab === 'register') {
        await register(email, password, name, role);
      } else {
        await resetPassword(email, newPass);
        setSuccess('Password updated successfully! You can login now.');
        setTab('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication action failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await googleLogin('google_user@demo.com', 'Google Explorer', 'google_mock_123');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const triggerDemo = async (demoRole: 'USER' | 'ADMIN') => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(demoRole);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-4 font-sans select-none">
      
      <div className="w-full max-w-[340px] space-y-5">
        
        {/* LOGO */}
        <div className="text-center space-y-1">
          <div className="inline-flex p-2 bg-transparent text-black dark:text-white">
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M50 5 L75 45 L85 75 L50 95 L15 75 L25 45 Z" />
              <path d="M50 5 L38 58 L50 75 L62 58 L50 5" />
              <path d="M25 45 L38 58 L15 75" />
              <path d="M75 45 L62 58 L85 75" />
              <path d="M38 58 L50 75 L62 58" />
              <path d="M50 75 L50 95" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">
            SALT
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile native premium companion</p>
        </div>

        {/* CONTAINER CARD */}
        <div className="bg-white dark:bg-black rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          
          {/* TABS */}
          {tab !== 'reset' && (
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
              <button
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-colors ${
                  tab === 'login'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab('register'); setError(''); }}
                className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-colors ${
                  tab === 'register'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* HEADINGS */}
          <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-wider">
              {tab === 'login' && 'Welcome Back'}
              {tab === 'register' && 'Create Account'}
              {tab === 'reset' && 'Reset Password'}
            </h3>
          </div>

          {/* STATUS MESSAGES */}
          {error && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 text-rose-500 rounded-xl text-[10px] font-bold flex items-center space-x-2 border border-slate-200 dark:border-slate-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 text-emerald-500 rounded-xl text-[10px] font-bold flex items-center space-x-2 border border-slate-200 dark:border-slate-900">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* FORMS */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
              />
            </div>

            {tab !== 'reset' && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Password</label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setTab('reset')}
                      className="text-[9px] font-semibold text-slate-400 hover:text-black dark:hover:text-white"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
                />
              </div>
            )}

            {tab === 'reset' && (
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
                />
              </div>
            )}

            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Account Access Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'USER' | 'ADMIN')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer"
                >
                  <option value="USER">User (Standard)</option>
                  <option value="ADMIN">Admin (Standard + Gambling)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 border dark:border-white/10"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>
                    {tab === 'login' && 'Sign In'}
                    {tab === 'register' && 'Register'}
                    {tab === 'reset' && 'Reset Password'}
                  </span>
                </>
              )}
            </button>
          </form>

          {tab === 'reset' && (
            <button
              onClick={() => setTab('login')}
              className="w-full py-1.5 text-[9px] font-bold text-slate-400 hover:text-black dark:hover:text-white text-center block"
            >
              Back to Login
            </button>
          )}

          {tab !== 'reset' && (
            <>
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100 dark:border-slate-900"></div>
                </div>
                <span className="relative px-2 bg-white dark:bg-black text-slate-400 text-[9px] uppercase font-bold tracking-wider">
                  Or Connect
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google Account</span>
              </button>
            </>
          )}
        </div>

        {/* DEMO BYPASS BOX */}
        {tab !== 'reset' && (
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-900 space-y-3">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-350">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <h4 className="text-[9px] uppercase font-black tracking-wider">Quick Demo Access</h4>
            </div>
            
            <p className="text-[10px] text-slate-400 font-semibold leading-normal">
              Bypass registration to evaluate standard user vs admin betting ledgers.
            </p>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => triggerDemo('USER')}
                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold border dark:border-slate-800"
              >
                👤 Standard User
              </button>
              
              <button
                type="button"
                onClick={() => triggerDemo('ADMIN')}
                className="flex-1 py-1.5 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black rounded-xl text-[10px] font-bold border dark:border-white/10"
              >
                👑 Admin Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

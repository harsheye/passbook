import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home,
  Receipt,
  MessageSquarePlus,
  Calendar,
  User,
  Sun,
  Moon,
  Sparkles,
  CreditCard
} from 'lucide-react';
import axios from 'axios';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModel, setActiveModel] = useState('Gemini 1.5 Flash');

  useEffect(() => {
    const fetchAIModel = async () => {
      try {
        const res = await axios.get('/health');
        if (res.data?.aiModel) {
          setActiveModel(res.data.aiModel);
        }
      } catch (err) {
        setActiveModel('Gemini 1.5 Flash');
      }
    };
    fetchAIModel();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-200 font-sans overflow-hidden">
      
      {/* STARK CENTERED BORDERLESS VIEWPORT (Fits viewport height perfectly, preventing scrolling issues) */}
      <div className="w-full max-w-[390px] h-screen bg-white dark:bg-black relative flex flex-col overflow-hidden shadow-2xl border-x border-slate-100 dark:border-zinc-900">
        


        {/* CORE CONTENT ROUTER PORTAL */}
        <div className={`flex-1 ${isActive('/') ? 'overflow-hidden h-full' : 'overflow-y-auto px-4 py-4 pb-20'}`}>
          {children}
        </div>

        {/* SOLID, FIXED BOTTOM NAVIGATION BAR */}
        <nav className="absolute bottom-0 left-0 w-full bg-slate-50/95 dark:bg-zinc-950/95 text-black dark:text-white py-2.5 px-6 border-t border-slate-200/60 dark:border-zinc-900 flex items-center justify-between z-30 select-none backdrop-blur-md transition-all">
          
          {/* Tab 1: Home Dashboard (Indigo Accent) */}
          <div className="flex flex-col items-center space-y-0.5">
            <button
              onClick={() => navigate('/dashboard')}
              className={`p-2 rounded-xl transition-all duration-350 ease-out hover:-translate-y-0.5 active:scale-90 ${
                isActive('/dashboard') 
                  ? 'text-indigo-600 dark:text-indigo-400 scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]' 
                  : 'text-slate-400 dark:text-zinc-650 hover:text-slate-600 dark:hover:text-zinc-300'
              }`}
              title="Dashboard"
            >
              <Home className="w-5 h-5" />
            </button>
            <span className={`w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300 ${isActive('/dashboard') ? 'opacity-100 scale-100 shadow-[0_0_4px_#4f46e5]' : 'opacity-0 scale-0'}`} />
          </div>

          {/* Tab 2: Expenses Log (Rose Accent) */}
          <div className="flex flex-col items-center space-y-0.5">
            <button
              onClick={() => navigate('/transactions')}
              className={`p-2 rounded-xl transition-all duration-350 ease-out hover:-translate-y-0.5 active:scale-90 ${
                isActive('/transactions') 
                  ? 'text-rose-600 dark:text-rose-400 scale-110 drop-shadow-[0_0_8px_rgba(225,29,72,0.2)]' 
                  : 'text-slate-400 dark:text-zinc-650 hover:text-slate-600 dark:hover:text-zinc-300'
              }`}
              title="Ledger statements"
            >
              <Receipt className="w-5 h-5" />
            </button>
            <span className={`w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400 transition-all duration-300 ${isActive('/transactions') ? 'opacity-100 scale-100 shadow-[0_0_4px_#e11d48]' : 'opacity-0 scale-0'}`} />
          </div>

          {/* Tab 3: Dedicated Center AI Chat Plus (Emerald Highlight) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => navigate('/')}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out active:scale-90 -mt-6 border shadow-lg ${
                isActive('/')
                  ? 'bg-emerald-500 text-white border-emerald-400 scale-110 rotate-45 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-black dark:bg-white text-white dark:text-black border-slate-800 dark:border-zinc-200 hover:scale-105'
              }`}
              title="Conversational AI Assistant"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>
          </div>

          {/* Tab 4: Schedules (Amber Accent) */}
          <div className="flex flex-col items-center space-y-0.5">
            <button
              onClick={() => navigate('/schedules')}
              className={`p-2 rounded-xl transition-all duration-350 ease-out hover:-translate-y-0.5 active:scale-90 ${
                isActive('/schedules') 
                  ? 'text-amber-600 dark:text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(217,119,6,0.2)]' 
                  : 'text-slate-400 dark:text-zinc-655 hover:text-slate-600 dark:hover:text-zinc-300'
              }`}
              title="Schedules"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <span className={`w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-400 transition-all duration-300 ${isActive('/schedules') ? 'opacity-100 scale-100 shadow-[0_0_4px_#d97706]' : 'opacity-0 scale-0'}`} />
          </div>

          {/* Tab 5: Portfolio Profile shortcuts (Violet Accent) */}
          <div className="flex flex-col items-center space-y-0.5">
            <button
              onClick={() => navigate('/profile')}
              className={`p-2 rounded-xl transition-all duration-350 ease-out hover:-translate-y-0.5 active:scale-90 ${
                isActive('/profile') 
                  ? 'text-violet-600 dark:text-violet-400 scale-110 drop-shadow-[0_0_8px_rgba(124,58,237,0.2)]' 
                  : 'text-slate-400 dark:text-zinc-650 hover:text-slate-600 dark:hover:text-zinc-300'
              }`}
              title="Profile Settings"
            >
              <User className="w-5 h-5" />
            </button>
            <span className={`w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400 transition-all duration-300 ${isActive('/profile') ? 'opacity-100 scale-100 shadow-[0_0_4px_#7c3aed]' : 'opacity-0 scale-0'}`} />
          </div>

        </nav>

      </div>
    </div>
  );
};

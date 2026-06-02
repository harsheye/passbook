import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  DollarSign,
  Briefcase,
  Coins,
  ShieldCheck,
  Building,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

interface CombinedSummary {
  metrics: {
    personalIncome: number;
    personalExpenses: number;
    investments: number;
    gamblingProfit: number;
    netWorth: number;
  };
  assetBalances: { name: string; value: number }[];
  gamblingMeta: {
    currentBalance: number;
    deposits: number;
    withdrawals: number;
  };
}

const MONO_COLORS = ['#000000', '#475569', '#94a3b8'];

export const Combined: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth(); // Let's import useAuth directly
  const [summary, setSummary] = useState<CombinedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // We need to resolve the AuthContext to support logouts inside profile!
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchCombined = async () => {
      try {
        const res = await axios.get('/api/dashboard/admin-summary');
        setSummary(res.data);
      } catch (err) {
        setError('Admin privilege check failed.');
      } finally {
        setLoading(false);
      }
    };
    fetchCombined();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-slate-400 font-bold uppercase">Auditing consolidated net worth...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-950 text-rose-500 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center space-x-2 max-w-sm mx-auto text-center flex-col space-y-2">
        <ShieldCheck className="w-6 h-6 text-rose-400" />
        <span>Auditing Failed</span>
        <span className="text-[10px] text-slate-400 font-semibold leading-normal">Unable to load consolidated portfolio metrics. Please check your server connection.</span>
      </div>
    );
  }

  const { metrics, assetBalances } = summary;

  return (
    <div className="space-y-6 animate-fadeIn pb-16 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
        <div>
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Consolidated ledger profile</span>
          <h1 className="text-xl font-black font-sans leading-none mt-1">PORTFOLIO CENTER</h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-755 dark:text-zinc-300 rounded-lg border dark:border-zinc-800 cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* NET WORTH HEADER PANEL */}
      <div className="bg-black text-white dark:bg-white dark:text-black rounded-3xl p-5 border border-slate-900 dark:border-slate-100 shadow-premium relative overflow-hidden text-center space-y-2">
        <span className="text-[8px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-white dark:text-black" />
          <span>Consolidated Portfolios Health</span>
        </span>
        <h3 className="text-3xl font-black font-sans text-glow pt-1">
          ₹{metrics.netWorth.toLocaleString('en-IN')}
        </h3>
        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold uppercase leading-normal pt-1.5 border-t border-white/10 dark:border-black/10">
          Net Worth = Cash + Investments + Bets - Expense
        </p>
      </div>

      {/* DETAILED FLOW METRICS (Full stacked list for mobile!) */}
      <div className="space-y-3.5">
        
        {/* Income Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-emerald-500">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Total Cash Inflows</span>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Revenues</h4>
            </div>
          </div>
          <span className="font-black text-xs font-sans text-emerald-500">₹{metrics.personalIncome.toLocaleString('en-IN')}</span>
        </div>

        {/* Expenses Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-rose-500">
              <Building className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Total Cash Outflows</span>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Liabilities</h4>
            </div>
          </div>
          <span className="font-black text-xs font-sans text-rose-500">₹{metrics.personalExpenses.toLocaleString('en-IN')}</span>
        </div>

        {/* Investments Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-amber-500">
              <Briefcase className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Portfolio Values</span>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Investments</h4>
            </div>
          </div>
          <span className="font-black text-xs font-sans text-amber-500">₹{metrics.investments.toLocaleString('en-IN')}</span>
        </div>

        {/* Gambling Profit Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-black dark:text-white">
              <Coins className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Betting Ledger Winnings</span>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Gambling Net</h4>
            </div>
          </div>
          <span className={`font-black text-xs font-sans ${metrics.gamblingProfit >= 0 ? 'text-black dark:text-white' : 'text-rose-500'}`}>
            ₹{metrics.gamblingProfit.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* SEGMENT ALLOCATION CHART */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-premium h-48 flex flex-col justify-between">
        <h3 className="font-extrabold text-xs">Portfolio Allocations Ratio</h3>

        <div className="flex-1 flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetBalances}
                innerRadius={30}
                outerRadius={45}
                paddingAngle={2}
                dataKey="value"
              >
                {assetBalances.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={MONO_COLORS[index % MONO_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-around text-[8px] text-slate-400 font-bold uppercase tracking-wider">
          {assetBalances.map((item, idx) => (
            <div key={item.name} className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MONO_COLORS[idx % MONO_COLORS.length] }} />
              <span>{item.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* relocated EXPORTER SUITE */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-900 space-y-3">
        <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block">Statement Ledger Exporter</span>
        
        <p className="text-[9px] text-slate-450 dark:text-zinc-400 leading-relaxed font-semibold">
          Download structured CSV, Excel sheets, or raw JSON statement ledgers directly to your local file explorer.
        </p>

        <div className="flex space-x-2">
          <button
            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/api/transactions/export?format=csv`)}
            className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-[10px] font-extrabold uppercase hover:scale-105 active:scale-95 flex items-center justify-center space-x-1 transition-transform"
          >
            <span>CSV</span>
          </button>
          
          <button
            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/api/transactions/export?format=xlsx`)}
            className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-[10px] font-extrabold uppercase hover:scale-105 active:scale-95 flex items-center justify-center space-x-1 transition-transform"
          >
            <span>XLSX</span>
          </button>

          <button
            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/api/transactions/export?format=json`)}
            className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-[10px] font-extrabold uppercase hover:scale-105 active:scale-95 flex items-center justify-center space-x-1 transition-transform"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* QUICK SYSTEM SHORTCUTS REDIRECT LINKS */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-900 space-y-3">
        <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Quick Shortcuts Actions</span>
        
        <div className="grid grid-cols-2 gap-3 text-[10px] font-extrabold uppercase">
          <a
            href="/import"
            onClick={(e) => { e.preventDefault(); navigate('/import'); }}
            className="p-3 border border-slate-200 dark:border-slate-900 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 transition-transform"
          >
            📂 Import Data
          </a>
          <button
            onClick={() => {
              const pass = window.prompt('Enter Admin Password to access Hub:');
              if (pass === 'admin123') {
                navigate('/admin/gambling');
              } else if (pass !== null) {
                alert('Incorrect Admin Password.');
              }
            }}
            className="p-3 border border-slate-200 dark:border-slate-900 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 transition-transform font-extrabold uppercase text-[10px] text-black dark:text-white cursor-pointer"
          >
            🎰 Hub
          </button>
        </div>
      </div>
    </div>
  );
};

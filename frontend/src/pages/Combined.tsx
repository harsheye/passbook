import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Moon,
  User,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Trash2,
  Lock
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

const DEFAULT_CATEGORIES_FOR_PROFESSION: Record<string, string[]> = {
  Salaried: ['Salary', 'Groceries', 'Utilities/Bills', 'Rent', 'Eating Out/Ordering In', 'Shopping', 'Travel', 'Insurance'],
  Farmer: ['Crop Sales', 'Seeds & Fertilizer', 'Pesticides', 'Equipment Rental', 'Tractor Fuel', 'Labor Wages', 'Groceries', 'Utilities/Bills'],
  Business: ['Sales Revenue', 'Office Rent', 'Staff Salaries', 'Inventory Purchase', 'Shipping & Logistics', 'Marketing', 'Utilities/Bills', 'Travel'],
  Freelancer: ['Client Retainers', 'Co-working Rent', 'Software Subscriptions', 'Hardware/Gadgets', 'Eating Out/Ordering In', 'Shopping', 'Internet Bills', 'Skill Courses'],
  Student: ['Pocket Money', 'Part-time Wage', 'Tuition Fees', 'Books & Stationery', 'Eating Out/Ordering In', 'Hostel Rent', 'Entertainment', 'Subscriptions'],
  Housewife: ['Household Allowance', 'Groceries', 'Utilities/Bills', 'Home Improvement', 'Healthcare', 'Kids Education', 'Shopping', 'Gold Investments']
};

const ALL_AVAILABLE_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Business Income',
  'Interest',
  'Investment Returns',
  'Bonus',
  'Refund',
  'Cashback',
  'Other Income',
  'Groceries',
  'Utilities/Bills',
  'Rent',
  'Eating Out/Ordering In',
  'Shopping',
  'Travel',
  'Healthcare',
  'Entertainment',
  'Subscriptions',
  'Insurance',
  'Crop Sales',
  'Seeds & Fertilizer',
  'Pesticides',
  'Equipment Rental',
  'Tractor Fuel',
  'Labor Wages',
  'Office Rent',
  'Staff Salaries',
  'Inventory Purchase',
  'Shipping & Logistics',
  'Marketing',
  'Client Retainers',
  'Co-working Rent',
  'Software Subscriptions',
  'Hardware/Gadgets',
  'Internet Bills',
  'Skill Courses',
  'Pocket Money',
  'Part-time Wage',
  'Tuition Fees',
  'Books & Stationery',
  'Hostel Rent',
  'Household Allowance',
  'Kids Education',
  'Gold Investments',
  'Miscellaneous'
];

export const Combined: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [summary, setSummary] = useState<CombinedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Profile Preferences States
  const [userName, setUserName] = useState('Local Wallet User');
  const [userProfession, setUserProfession] = useState('Salaried');
  const [userIncome, setUserIncome] = useState(0);
  const [userSavings, setUserSavings] = useState(0);
  const [gstRegistered, setGstRegistered] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // System Config Toggles
  const [combinedFeatures, setCombinedFeatures] = useState(false);
  const [showVisualizations, setShowVisualizations] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modals States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [personalizationModalOpen, setPersonalizationModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  
  // Edit forms states
  const [editName, setEditName] = useState('');
  const [editProfession, setEditProfession] = useState('Salaried');
  const [editIncome, setEditIncome] = useState('');
  const [editSavings, setEditSavings] = useState('');
  const [editGstRegistered, setEditGstRegistered] = useState(false);
  const [editGstNumber, setEditGstNumber] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminModalError, setAdminModalError] = useState('');

  // Dropdowns/Input helper states
  const [newCatInput, setNewCatInput] = useState('');

  useEffect(() => {
    loadProfileData();
    fetchCombined();
  }, [location.pathname]);

  const fetchCombined = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/dashboard/admin-summary');
      setSummary(res.data);
    } catch (err) {
      setError('Admin privilege check failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileData = () => {
    try {
      const profileStr = localStorage.getItem('passbook_user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        setUserName(profile.name || 'Local Wallet User');
        setUserProfession(profile.profession || 'Salaried');
        setUserIncome(profile.monthlyIncome || 0);
        setUserSavings(profile.savingsGoal || 0);
        setGstRegistered(profile.gstRegistered || false);
        setGstNumber(profile.gstNumber || '');
        setSelectedCategories(profile.categories || []);

        setEditName(profile.name || '');
        setEditProfession(profile.profession || 'Salaried');
        setEditIncome(String(profile.monthlyIncome || ''));
        setEditSavings(String(profile.savingsGoal || ''));
        setEditGstRegistered(profile.gstRegistered || false);
        setEditGstNumber(profile.gstNumber || '');
        setEditCategories(profile.categories || []);
      } else {
        // Initialize default empty profile if none exists
        const defaultProfile = {
          name: 'Local Wallet User',
          profession: 'Salaried',
          monthlyIncome: 50000,
          savingsGoal: 15000,
          gstRegistered: false,
          gstNumber: '',
          categories: DEFAULT_CATEGORIES_FOR_PROFESSION['Salaried']
        };
        localStorage.setItem('passbook_user_profile', JSON.stringify(defaultProfile));
        loadProfileData();
      }

      const combinedVal = localStorage.getItem('passbook_combined_features');
      setCombinedFeatures(combinedVal === 'true');

      const showVisVal = localStorage.getItem('passbook_show_visualizations');
      setShowVisualizations(showVisVal !== 'false');

      const adminVal = localStorage.getItem('passbook_admin_logged_in');
      setIsAdmin(adminVal === 'true');
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  };

  const handleCombinedFeaturesToggle = (val: boolean) => {
    setCombinedFeatures(val);
    localStorage.setItem('passbook_combined_features', val ? 'true' : 'false');
    setTimeout(() => loadProfileData(), 50);
  };

  const handleToggleVisualizations = (val: boolean) => {
    setShowVisualizations(val);
    localStorage.setItem('passbook_show_visualizations', val ? 'true' : 'false');
  };

  const handleProfessionChange = (prof: string) => {
    setEditProfession(prof);
    setEditCategories(DEFAULT_CATEGORIES_FOR_PROFESSION[prof] || []);
  };

  const handleToggleCategory = (cat: string) => {
    if (editCategories.includes(cat)) {
      setEditCategories(editCategories.filter(c => c !== cat));
    } else {
      setEditCategories([...editCategories, cat]);
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!editCategories.includes(trimmed)) {
      setEditCategories([...editCategories, trimmed]);
    }
    setNewCatInput('');
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      alert('Please enter your name.');
      return;
    }

    const userProfile = {
      name: editName.trim(),
      profession: editProfession,
      monthlyIncome: Number(editIncome) || 0,
      savingsGoal: Number(editSavings) || 0,
      gstRegistered: editGstRegistered,
      gstNumber: editGstRegistered ? editGstNumber.trim() : '',
      categories: editCategories,
    };

    try {
      localStorage.setItem('passbook_user_profile', JSON.stringify(userProfile));
      
      const customCats = editCategories.map(c => ({
        name: c,
        icon: 'tag',
        color: '#71717a'
      }));
      localStorage.setItem('custom_categories', JSON.stringify(customCats));

      setEditModalOpen(false);
      loadProfileData();
    } catch (err) {
      console.error('Failed to save user profile:', err);
      alert('Failed to save profile.');
    }
  };

  const handleAdminSubmit = () => {
    if (passwordInput === 'rathouse') {
      try {
        localStorage.setItem('passbook_admin_logged_in', 'true');
        setIsAdmin(true);
        setAdminModalOpen(false);
        setPasswordInput('');
        setAdminModalError('');
        loadProfileData();
      } catch (err) {
        setAdminModalError('Failed to save session state.');
      }
    } else {
      setAdminModalError('Incorrect Admin Password');
    }
  };

  const handleAdminExit = () => {
    if (window.confirm('Are you sure you want to exit admin mode?')) {
      try {
        localStorage.setItem('passbook_admin_logged_in', 'false');
        setIsAdmin(false);
        loadProfileData();
      } catch (err) {
        alert('Failed to exit admin mode.');
      }
    }
  };

  const renderShortcuts = () => {
    const showGst = combinedFeatures || userProfession === 'Business' || userProfession === 'Freelancer' || userProfession === 'Farmer';
    const showTax = combinedFeatures || (userProfession !== 'Student' && userProfession !== 'Housewife');

    return (
      <div className="grid grid-cols-2 gap-3 text-[10px] font-extrabold uppercase">
        {showGst && (
          <button
            onClick={() => navigate('/gst')}
            className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            🧾 GST Portal
          </button>
        )}
        {showTax && (
          <button
            onClick={() => navigate('/tax')}
            className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            📊 Tax Planner
          </button>
        )}
        <button
          onClick={() => setEditModalOpen(true)}
          className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          ⚙️ Edit Profile
        </button>
        <button
          onClick={() => setPersonalizationModalOpen(true)}
          className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          👑 Personalization
        </button>
        <button
          onClick={() => navigate('/import')}
          className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          📂 Import Data
        </button>
        {isAdmin ? (
          <button
            onClick={() => navigate('/admin/gambling')}
            className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer text-amber-500"
          >
            🎰 Hub System
          </button>
        ) : (
          <button
            onClick={() => setAdminModalOpen(true)}
            className="p-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer text-slate-400"
          >
            🔒 Admin Access
          </button>
        )}
      </div>
    );
  };

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
    <div className="space-y-6 animate-fadeIn pb-24 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
        <div>
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Consolidated ledger profile</span>
          <h1 className="text-base font-black font-sans leading-none mt-1">PORTFOLIO CENTER</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Combined Mode crown Indicator */}
          {combinedFeatures && (
            <span className="text-xs mr-1" title="Combined Premium Features Active">👑</span>
          )}

          {/* Admin Exit option if active */}
          {isAdmin && (
            <button
              onClick={handleAdminExit}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg border dark:border-zinc-800 cursor-pointer text-amber-500 text-[9px] font-black uppercase tracking-wider"
              title="Exit Admin Mode"
            >
              Exit Admin
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-300 rounded-lg border dark:border-zinc-800 cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-lg border border-rose-250 dark:border-rose-900/50 cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* USER GREETING & INFO CARD */}
      <div className="bg-slate-50 dark:bg-zinc-950/40 p-4 border dark:border-zinc-900 rounded-3xl flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-sm uppercase">
          {userName.charAt(0)}
        </div>
        <div>
          <h4 className="text-xs font-black truncate max-w-[200px] leading-tight">{userName}</h4>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-wider leading-none">
            {userProfession} • Income: ₹{(userIncome / 1000).toFixed(0)}k/mo
          </p>
        </div>
      </div>

      {/* NET WORTH HEADER PANEL */}
      <div className="bg-black text-white dark:bg-white dark:text-black rounded-3xl p-5 border border-slate-900 dark:border-slate-100 shadow-premium relative overflow-hidden text-center space-y-2">
        <span className="text-[8.5px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-white dark:text-black" />
          <span>Consolidated Portfolios Health</span>
        </span>
        <h3 className="text-2xl font-black font-sans text-glow pt-1">
          ₹{metrics.netWorth.toLocaleString('en-IN')}
        </h3>
        <p className="text-[7.5px] text-slate-400 dark:text-slate-500 font-bold uppercase leading-normal pt-1.5 border-t border-white/10 dark:border-black/10">
          Net Worth = Cash + Investments {isAdmin ? '+ Bets ' : ''}- Expense
        </p>
      </div>

      {/* DETAILED FLOW METRICS */}
      <div className="space-y-3">
        
        {/* Income Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Total Cash Inflows</span>
              <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-200">Revenues</h4>
            </div>
          </div>
          <span className="font-black text-xs font-sans text-emerald-500">₹{metrics.personalIncome.toLocaleString('en-IN')}</span>
        </div>

        {/* Expenses Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-rose-500">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Total Cash Outflows</span>
              <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-200">Liabilities</h4>
            </div>
          </div>
          <span className="font-black text-xs font-sans text-rose-500">₹{metrics.personalExpenses.toLocaleString('en-IN')}</span>
        </div>

        {/* Investments Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-amber-500">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-400">Portfolio Values</span>
              <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-200">Investments</h4>
            </div>
          </div>
          <span className="font-black text-xs font-sans text-amber-500">₹{metrics.investments.toLocaleString('en-IN')}</span>
        </div>

        {/* Gambling Profit Card */}
        {isAdmin && (
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-150 dark:border-slate-900 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white dark:bg-black border dark:border-slate-800 rounded-xl text-black dark:text-white">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[8px] uppercase font-black text-slate-400">Betting Ledger Winnings</span>
                <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-200">Gambling Net</h4>
              </div>
            </div>
            <span className={`font-black text-xs font-sans ${metrics.gamblingProfit >= 0 ? 'text-black dark:text-white' : 'text-rose-500'}`}>
              ₹{metrics.gamblingProfit.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* SEGMENT ALLOCATION CHART */}
      {showVisualizations && (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 shadow-premium h-44 flex flex-col justify-between">
          <h3 className="font-extrabold text-xs">Portfolio Allocations Ratio</h3>

          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetBalances}
                  innerRadius={25}
                  outerRadius={38}
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
      )}

      {/* relocated EXPORTER SUITE */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-200 dark:border-slate-900 space-y-3">
        <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block">Statement Ledger Exporter</span>
        <p className="text-[9px] text-slate-450 dark:text-zinc-400 leading-relaxed font-semibold">
          Download structured CSV, Excel sheets, or raw JSON statement ledgers directly to your local file explorer.
        </p>

        <div className="flex space-x-2">
          <button
            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/api/transactions/export?format=csv`)}
            className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-[10px] font-extrabold uppercase hover:scale-105 active:scale-95 flex items-center justify-center space-x-1 transition-transform cursor-pointer"
          >
            <span>CSV</span>
          </button>
          
          <button
            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/api/transactions/export?format=xlsx`)}
            className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-[10px] font-extrabold uppercase hover:scale-105 active:scale-95 flex items-center justify-center space-x-1 transition-transform cursor-pointer"
          >
            <span>XLSX</span>
          </button>

          <button
            onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5000/api/transactions/export?format=json`)}
            className="flex-1 py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black rounded-xl text-[10px] font-extrabold uppercase hover:scale-105 active:scale-95 flex items-center justify-center space-x-1 transition-transform cursor-pointer"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* QUICK SYSTEM SHORTCUTS REDIRECT LINKS */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-250 dark:border-slate-900 space-y-3">
        <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Quick Shortcuts Actions</span>
        {renderShortcuts()}
      </div>

      {/* EDIT PROFILE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b dark:border-zinc-900 mb-4 shrink-0">
              <h3 className="text-xs font-black uppercase">⚙️ Edit User Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-405 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-bold scrollbar-none">
              <div>
                <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Profession</label>
                <select
                  value={editProfession}
                  onChange={(e) => handleProfessionChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none cursor-pointer"
                >
                  {['Salaried', 'Farmer', 'Business', 'Freelancer', 'Student', 'Housewife'].map(prof => (
                    <option key={prof} value={prof}>{prof}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Monthly Income (₹)</label>
                  <input
                    type="text"
                    value={editIncome}
                    onChange={(e) => setEditIncome(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Savings Goal (₹)</label>
                  <input
                    type="text"
                    value={editSavings}
                    onChange={(e) => setEditSavings(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-dashed dark:border-zinc-900 pt-3">
                <label className="flex items-center space-x-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={editGstRegistered}
                    onChange={(e) => setEditGstRegistered(e.target.checked)}
                    className="rounded border-slate-350 dark:border-zinc-800 bg-transparent text-indigo-500 w-3.5 h-3.5 cursor-pointer focus:ring-0"
                  />
                  <span className="text-[9.5px] uppercase font-black tracking-wide">Registered for GSTIN</span>
                </label>

                {editGstRegistered && (
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      value={editGstNumber}
                      onChange={(e) => setEditGstNumber(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* CATEGORY SELECTION CHIPS */}
              <div className="border-t border-dashed dark:border-zinc-900 pt-3 space-y-2">
                <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block">Configure Categories Active</label>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Select drop-down categories for your transaction screen</p>
                
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-slate-100 dark:border-zinc-900 p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 scrollbar-none">
                  {ALL_AVAILABLE_CATEGORIES.map(cat => {
                    const isSel = editCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`text-[8.5px] font-black uppercase px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-indigo-650 border-indigo-650 text-white'
                            : 'bg-white dark:bg-black border-slate-200 dark:border-zinc-800 text-slate-405'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Category input */}
                <div className="flex space-x-2 pt-1.5">
                  <input
                    type="text"
                    placeholder="Add custom category..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-zinc-950 p-2 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="px-3 bg-black text-white dark:bg-white dark:text-black rounded-xl text-[9px] font-black uppercase cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t dark:border-zinc-900 mt-4 shrink-0">
              <button
                onClick={() => setEditModalOpen(false)}
                className="py-2 px-4 border border-slate-200 dark:border-zinc-800 text-[9.5px] font-black uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[9.5px] font-black uppercase rounded-xl cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSONALIZATION SYSTEM CONFIG MODAL */}
      {personalizationModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b dark:border-zinc-900 mb-4">
              <h3 className="text-xs font-black uppercase">👑 Personalization Settings</h3>
              <button onClick={() => setPersonalizationModalOpen(false)} className="text-slate-400 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 py-2 font-bold text-xs">
              {/* Toggle 1: Combined Features Mode */}
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-950/40 border dark:border-zinc-900 rounded-2xl">
                <div>
                  <span className="text-[9.5px] uppercase font-black tracking-wide block">👑 Combined Mode</span>
                  <span className="text-[8px] text-slate-405 font-bold uppercase tracking-wider block mt-1">Unlock all professional toolkits</span>
                </div>
                <input
                  type="checkbox"
                  checked={combinedFeatures}
                  onChange={(e) => handleCombinedFeaturesToggle(e.target.checked)}
                  className="rounded border-slate-350 dark:border-zinc-800 text-indigo-500 w-4 h-4 cursor-pointer focus:ring-0"
                />
              </div>

              {/* Toggle 2: Show Visualizations */}
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-950/40 border dark:border-zinc-900 rounded-2xl">
                <div>
                  <span className="text-[9.5px] uppercase font-black tracking-wide block">📊 Networth Chart</span>
                  <span className="text-[8px] text-slate-405 font-bold uppercase tracking-wider block mt-1">Show/Hide dashboard allocation charts</span>
                </div>
                <input
                  type="checkbox"
                  checked={showVisualizations}
                  onChange={(e) => handleToggleVisualizations(e.target.checked)}
                  className="rounded border-slate-350 dark:border-zinc-800 text-indigo-500 w-4 h-4 cursor-pointer focus:ring-0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t dark:border-zinc-900 mt-4">
              <button
                onClick={() => setPersonalizationModalOpen(false)}
                className="py-2 px-4 bg-black text-white dark:bg-white dark:text-black text-[9.5px] font-black uppercase rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN LOG-IN MODAL */}
      {adminModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b dark:border-zinc-900 mb-4">
              <h3 className="text-xs font-black uppercase flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Administrative Mode Login</span>
              </h3>
              <button onClick={() => setAdminModalOpen(false)} className="text-slate-400 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 py-2 font-bold text-xs">
              <div>
                <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter administrative token..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 p-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none text-center"
                />
              </div>

              {adminModalError && (
                <p className="text-[8.5px] font-black text-rose-500 text-center uppercase tracking-wide">
                  {adminModalError}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t dark:border-zinc-900 mt-4">
              <button
                onClick={() => setAdminModalOpen(false)}
                className="py-2 px-4 border border-slate-200 dark:border-zinc-800 text-[9.5px] font-black uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminSubmit}
                className="py-2 px-4 bg-indigo-650 hover:bg-indigo-500 text-white text-[9.5px] font-black uppercase rounded-xl cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

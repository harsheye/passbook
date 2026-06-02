import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  TrendingDown,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronDown,
  Receipt,
  Check,
  User,
  Plus
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    avgDailySpending: number;
    highestCategory: string;
    highestCategoryAmt: number;
    expenseGrowthPct: number;
  };
  insights: string[];
  charts: {
    monthly: any[];
    category: any[];
    categoryIncome: any[];
    daily: any[];
  };
}

interface Transaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  transactionType: string;
  category: { name: string; icon: string; color: string };
  paymentMethod: string;
  accountId: string;
  note: string;
  merchantName?: string;
}

const MONO_COLORS = [
  '#000000', '#3b82f6', '#ec4899', '#f97316', '#a855f7', 
  '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1',
  '#14b8a6', '#6b7280', '#84cc16'
];

const EXPENSE_CATEGORIES = [
  'Beauty/Wellness',
  'Eating Out/Ordering In',
  'Entertainment',
  'Fitness/Sports',
  'Fuel',
  'Gifts',
  'Groceries',
  'Healthcare',
  'Home Improvement',
  'Loan/EMI Payments',
  'Miscellaneous',
  'Money Transfers',
  'Rent',
  'Shopping',
  'Skill Development',
  'Subscriptions',
  'Travel',
  'Utilities/Bills'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Business Income',
  'Interest',
  'Investment Returns',
  'Bonus',
  'Refund',
  'Cashback',
  'Other Income'
];

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sorting & Filtering States
  const [filterType, setFilterType] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Dynamic Pie Chart Toggle categories
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [pieFlowType, setPieFlowType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Animated Custom Dropdowns toggles
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, txnRes, catRes] = await Promise.all([
        axios.get('/api/dashboard/summary'),
        axios.get('/api/transactions', {
          params: {
            type: filterType,
            category: filterCat,
            sortBy,
            sortOrder
          }
        }),
        axios.get('/api/categories')
      ]);

      setData(sumRes.data);
      setTransactions(txnRes.data);
      setCategoriesList(catRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard ledger metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCat, sortBy, sortOrder]);

  useEffect(() => {
    if (data) {
      const activePieSource = pieFlowType === 'EXPENSE' ? data.charts.category : (data.charts.categoryIncome || []);
      if (showAllCategories) {
        const targetCats = pieFlowType === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        setSelectedCats(targetCats);
      } else {
        setSelectedCats(activePieSource.map((c: any) => c.name));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieFlowType, showAllCategories, data]);

  const loadSampleData = async () => {
    setLoading(true);
    try {
      // Manual bypass to instantly load standard statements
      await axios.post('/api/transactions', {
        date: new Date().toISOString(),
        description: 'TechCorp Salary Credit',
        amount: 50000,
        type: 'Income',
        category: 'Salary',
        paymentMethod: 'Bank Transfer',
        account: 'SBI',
        location: 'Karimpur',
        tags: ['salary', 'bonus']
      });

      await axios.post('/api/transactions', {
        date: new Date().toISOString(),
        description: 'Dominos Weekend Pizza',
        amount: 1250,
        type: 'Expense',
        category: 'Eating Out/Ordering In',
        merchantName: 'Dominos',
        paymentMethod: 'UPI',
        account: 'SBI',
        location: 'Karimpur',
        tags: ['food', 'pizza'],
        notes: 'Weekend dinner with friends'
      });

      await fetchDashboardData();
    } catch (err) {
      console.error('Failed mock loading:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (catName: string, index: number) => {
    const found = categoriesList.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return found?.color || MONO_COLORS[index % MONO_COLORS.length];
  };

  const handleToggleCategory = (catName: string) => {
    setSelectedCats(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleSelectAllCats = () => {
    if (!data) return;
    const activePieSource = pieFlowType === 'EXPENSE' ? data.charts.category : (data.charts.categoryIncome || []);
    if (showAllCategories) {
      setSelectedCats(EXPENSE_CATEGORIES.concat(INCOME_CATEGORIES));
    } else {
      setSelectedCats(activePieSource.map(c => c.name));
    }
  };

  const handleDeselectAllCats = () => {
    setSelectedCats([]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Compiling ledger balances...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-5 bg-slate-50 dark:bg-slate-950 text-rose-500 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center space-x-2 max-w-sm mx-auto text-xs font-bold mt-10">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>{error || 'Unable to connect to transaction database.'}</span>
      </div>
    );
  }

  const { summary, charts } = data;

  const activePieSource = pieFlowType === 'EXPENSE' ? charts.category : (charts.categoryIncome || []);

  const listToRender = (() => {
    const targetCats = pieFlowType === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (showAllCategories) {
      return targetCats.map(catName => {
        const found = activePieSource.find(c => c.name.toLowerCase() === catName.toLowerCase());
        return {
          name: catName,
          value: found ? found.value : 0
        };
      });
    } else {
      return activePieSource.map(c => ({
        name: c.name,
        value: c.value
      }));
    }
  })();

  const filteredPieData = listToRender.filter(c => c.value > 0 && selectedCats.includes(c.name));
  const totalPieSum = filteredPieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900">
        <div>
          <span className="text-[8px] uppercase font-black tracking-widest text-slate-400">Statement Ledger</span>
          <h1 className="text-xl font-black font-sans leading-none mt-1">DASHBOARD</h1>
        </div>
        
        {transactions.length === 0 && (
          <button
            onClick={loadSampleData}
            className="py-1.5 px-3 bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 rounded-xl text-[9px] font-bold uppercase transition-transform shadow-sm"
          >
            Load Sample Data
          </button>
        )}
      </div>

      {/* METRIC GRID */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-150 dark:border-zinc-900">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Total Inflows</span>
          <h3 className="text-base font-black font-sans mt-1">₹{summary.totalIncome.toLocaleString('en-IN')}</h3>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-150 dark:border-zinc-900">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Total Outflows</span>
          <h3 className="text-base font-black font-sans mt-1">₹{summary.totalExpenses.toLocaleString('en-IN')}</h3>
          {summary.expenseGrowthPct !== 0 && (
            <span className={`text-[8.5px] font-extrabold mt-1 block ${summary.expenseGrowthPct > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              MoM: {summary.expenseGrowthPct > 0 ? '↑' : '↓'}{Math.abs(summary.expenseGrowthPct).toFixed(0)}%
            </span>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-150 dark:border-zinc-900">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Net Savings</span>
          <h3 className="text-base font-black font-sans mt-1">₹{summary.netSavings.toLocaleString('en-IN')}</h3>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-150 dark:border-zinc-900">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Daily Average</span>
          <h3 className="text-base font-black font-sans mt-1">₹{summary.avgDailySpending.toFixed(0)}</h3>
        </div>
      </div>

      {/* 1-MONTH EXPENSES INTERACTIVE PIE CHART */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900">
          <div>
            <h3 className="font-extrabold text-xs flex items-center space-x-1">
              <PieIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>1-Month Category {pieFlowType === 'EXPENSE' ? 'Expenses' : 'Inflow'}</span>
            </h3>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Toggle categories to analyze specific flows</p>
          </div>

          {/* Flow Type Toggle (Expense / Income) */}
          <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-lg p-0.5 border dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setPieFlowType('EXPENSE')}
              className={`py-1 px-2.5 text-[8.5px] font-black uppercase rounded transition-all ${
                pieFlowType === 'EXPENSE'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setPieFlowType('INCOME')}
              className={`py-1 px-2.5 text-[8.5px] font-black uppercase rounded transition-all ${
                pieFlowType === 'INCOME'
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {activePieSource.length === 0 && !showAllCategories ? (
          <div className="text-center py-8 text-slate-400 text-[9px] uppercase font-bold border border-dashed border-slate-200 dark:border-zinc-900 rounded-3xl">
            No {pieFlowType === 'EXPENSE' ? 'expense' : 'income'} records logged in the current month.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pie Chart and Category Checkboxes Centered & Large */}
            <div className="flex flex-col items-center space-y-4">
              
              {/* Centered Larger Graphic */}
              <div className="h-48 w-full relative max-w-[280px]">
                {filteredPieData.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 border border-dashed rounded-full">
                    Empty Filter
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {filteredPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name, index)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ fontSize: '9px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Total overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-[7.5px] uppercase font-black text-slate-400">Total {pieFlowType === 'EXPENSE' ? 'Expenses' : 'Inflows'}</span>
                  <span className="text-sm font-black tracking-tighter text-slate-800 dark:text-white">₹{totalPieSum.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Dynamic Checkbox Toggle List (Grid layout below the pie chart) */}
              <div className="w-full grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-none py-1 pr-1">
                {listToRender.map((c, idx) => {
                  const isActive = selectedCats.includes(c.name);
                  const color = getCategoryColor(c.name, idx);

                  return (
                    <button
                      key={c.name}
                      onClick={() => handleToggleCategory(c.name)}
                      className="w-full flex items-center justify-between text-[9px] font-bold p-2 rounded-xl border border-slate-100 hover:bg-slate-50 dark:border-zinc-900 dark:hover:bg-zinc-950 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5 min-w-0">
                        {/* Custom checkbox */}
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isActive ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black' : 'border-slate-300 dark:border-zinc-700'
                          }`}
                        >
                          {isActive && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                        </div>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className="font-extrabold shrink-0" style={{ color: isActive ? color : '#94a3b8' }}>
                        ₹{c.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick action buttons & Show All Categories toggle */}
            <div className="flex justify-between items-center select-none border-t dark:border-zinc-900 pt-2.5 text-[8.5px] uppercase font-black text-slate-400">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-slate-650 transition-colors">
                <input
                  type="checkbox"
                  checked={showAllCategories}
                  onChange={(e) => setShowAllCategories(e.target.checked)}
                  className="rounded border-slate-300 dark:border-zinc-800 bg-transparent text-black dark:text-white focus:ring-0 w-3 h-3 cursor-pointer"
                />
                <span>Show All Categories</span>
              </label>

              <div className="flex space-x-2">
                <button onClick={handleSelectAllCats} className="hover:text-black dark:hover:text-white transition-colors">
                  ✓ Check All
                </button>
                <span>•</span>
                <button onClick={handleDeselectAllCats} className="hover:text-black dark:hover:text-white transition-colors">
                  ✗ Uncheck All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MONTHLY HISTORICAL EXPENSES BAR CHART */}
      <div className="space-y-3">
        <div className="pb-2 border-b border-slate-100 dark:border-zinc-900">
          <h3 className="font-extrabold text-xs">Historical Monthly Expenses</h3>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Historical timeline</p>
        </div>
        
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.monthly} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '9px' }} formatter={(value) => `₹${value}`} />
              <Bar dataKey="Expenses" fill="#000000" radius={[4, 4, 0, 0]} className="dark:fill-white" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODERNISED RECENT TRANSACTIONS LOG FEED */}
      <div className="space-y-4">
        
        <div className="pb-2 border-b border-slate-100 dark:border-zinc-900">
          <h3 className="font-extrabold text-xs flex items-center space-x-1">
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Recent Statements Log</span>
          </h3>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Simple tracking management</p>
        </div>

        {/* CUSTOM ANIMATED SELECT DROPDOWNS WITH INVISIBLE SCROLLBARS */}
        <div className="flex justify-between items-center text-[9px] font-bold gap-2 select-none relative z-10 w-full">
          
          {/* Animated Custom Category Dropdown */}
          <div className="relative flex-1 max-w-[110px]">
            <button
              onClick={() => {
                setCatDropdownOpen(prev => !prev);
                setTypeDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-[9px] font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              <span className="truncate">{filterCat || 'Categories'}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${catDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Custom dropdown body */}
            {catDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-36 overflow-y-auto scrollbar-none py-1 z-50 animate-slideUp">
                <button
                  onClick={() => { setFilterCat(''); setCatDropdownOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-55 dark:hover:bg-zinc-900 text-[9px] font-extrabold text-slate-450"
                >
                  All Categories
                </button>
                {categoriesList.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setFilterCat(c.name); setCatDropdownOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[9px] font-bold truncate flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    {filterCat === c.name && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Animated Custom Flow Type Dropdown */}
          <div className="relative flex-1 max-w-[100px]">
            <button
              onClick={() => {
                setTypeDropdownOpen(prev => !prev);
                setCatDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-[9px] font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              <span>{filterType ? (filterType === 'EXPENSE' ? 'Expense' : 'Income') : 'Flow Types'}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown body */}
            {typeDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 animate-slideUp">
                <button
                  onClick={() => { setFilterType(''); setTypeDropdownOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[9px] font-extrabold text-slate-400"
                >
                  All Types
                </button>
                <button
                  onClick={() => { setFilterType('EXPENSE'); setTypeDropdownOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[9px] font-bold"
                >
                  Expense
                </button>
                <button
                  onClick={() => { setFilterType('INCOME'); setTypeDropdownOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-55 dark:hover:bg-zinc-900 text-[9px] font-bold"
                >
                  Income
                </button>
              </div>
            )}
          </div>

          {/* Animated Custom Sort Dropdown */}
          <div className="relative flex-1 max-w-[85px]">
            <button
              onClick={() => {
                setSortDropdownOpen(prev => !prev);
                setCatDropdownOpen(false);
                setTypeDropdownOpen(false);
              }}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-[9px] font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              <span>{sortBy === 'date' ? 'Date' : 'Amount'}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown body */}
            {sortDropdownOpen && (
              <div className="absolute top-full right-0 w-full mt-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 animate-slideUp">
                <button
                  onClick={() => { setSortBy('date'); setSortDropdownOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-55 dark:hover:bg-zinc-900 text-[9px] font-bold flex items-center justify-between"
                >
                  <span>Date</span>
                  {sortBy === 'date' && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                </button>
                <button
                  onClick={() => { setSortBy('amount'); setSortDropdownOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-55 dark:hover:bg-zinc-900 text-[9px] font-bold flex items-center justify-between"
                >
                  <span>Amount</span>
                  {sortBy === 'amount' && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="p-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-[9px] font-bold shrink-0 text-slate-700 dark:text-slate-200"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

      {/* Compact List feed */}
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-[9px] font-bold uppercase">
            No transaction records matched.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {transactions.slice(0, 5).map(t => {
              const isExpense = t.amount < 0;
              const dateVal = t.transactionDate || (t as any).date;
              const catObj = t.category || { name: 'Miscellaneous', color: '#6b7280' };

              const tType = (t.transactionType || 'Expense').toUpperCase();
              const colorClasses = tType === 'INCOME'
                ? 'bg-emerald-50/15 dark:bg-emerald-950/10 border-emerald-100/70 dark:border-emerald-900/20 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200'
                : tType === 'TRANSFER'
                ? 'bg-slate-50 dark:bg-zinc-950/45 border-slate-200 dark:border-zinc-900 hover:bg-slate-100/50 dark:hover:bg-zinc-900/30 text-slate-800 dark:text-slate-200'
                : 'bg-rose-50/15 dark:bg-rose-950/10 border-rose-100/70 dark:border-rose-900/20 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-rose-950 dark:text-rose-200';

              return (
                <div
                  key={t.id}
                  className={`p-3 border rounded-xl flex items-center justify-between transition-all select-none ${colorClasses}`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[7.5px] text-slate-450 font-extrabold uppercase shrink-0">
                        {dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' • ' + new Date(dateVal).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                      </span>
                      {(filterCat !== '' || filterType !== '') && (
                        <span
                          className="inline-block px-1.5 py-0.5 text-[7px] font-extrabold uppercase rounded shrink-0"
                          style={{ backgroundColor: `${catObj.color}15`, color: catObj.color }}
                        >
                          {catObj.name}
                        </span>
                      )}
                      {t.merchantName && (
                        <span className="text-[7.5px] font-black text-indigo-400 uppercase truncate">
                          @{t.merchantName}
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-[10px] text-slate-800 dark:text-slate-200 truncate mt-0.5">
                      {t.description}
                    </h4>
                  </div>
                  <span className={`font-black text-[11px] font-sans shrink-0 ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {isExpense ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

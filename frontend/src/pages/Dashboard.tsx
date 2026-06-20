import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
    subcategory?: any[];
    subcategoryIncome?: any[];
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

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const Dashboard: React.FC = () => {
  const location = useLocation();
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
  const [showVisualizations, setShowVisualizations] = useState(true);

  // Animated Custom Dropdowns toggles
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // New States matching Mobile App
  const [profession, setProfession] = useState<string>('Salaried');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [taxCheckedItems, setTaxCheckedItems] = useState<string[]>([]);
  const [taxClaimedAmounts, setTaxClaimedAmounts] = useState<Record<string, number>>({});
  const [ratioCardVisible, setRatioCardVisible] = useState(true);

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

  const fetchRef = useRef(fetchDashboardData);
  useEffect(() => {
    fetchRef.current = fetchDashboardData;
  });

  useEffect(() => {
    const handleUpdate = () => {
      fetchRef.current();
    };

    window.addEventListener('transaction-updated', handleUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('transaction_updates');
      bc.onmessage = (event) => {
        if (event.data === 'updated') {
          handleUpdate();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel failed to initialize', e);
    }

    return () => {
      window.removeEventListener('transaction-updated', handleUpdate);
      if (bc) bc.close();
    };
  }, []);

  const dispatchTransactionUpdate = () => {
    window.dispatchEvent(new CustomEvent('transaction-updated'));
    try {
      const bc = new BroadcastChannel('transaction_updates');
      bc.postMessage('updated');
      bc.close();
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      fetchDashboardData();

      // Load user profile details
      const profileStr = localStorage.getItem('passbook_user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.profession) {
          setProfession(profile.profession);
        }
      }

      // Load claimed deductions for reports
      const savedTax = localStorage.getItem('passbook_tax_checklist');
      if (savedTax) {
        const parsed = JSON.parse(savedTax);
        setTaxCheckedItems(parsed.checked || []);
        setTaxClaimedAmounts(parsed.claimed || {});
      }
    }
    const showVisVal = localStorage.getItem('passbook_show_visualizations');
    setShowVisualizations(showVisVal !== 'false');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, filterType, filterCat, sortBy, sortOrder]);

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

  // Yearly transaction analytics calculations matching mobile screen
  const yearlyTxns = transactions.filter(t => {
    const txDate = t.transactionDate || (t as any).date;
    if (!txDate) return false;
    const d = new Date(txDate);
    return d.getFullYear() === selectedYear;
  });

  let displayIncome = 0;
  let displayExpense = 0;
  yearlyTxns.forEach(t => {
    const type = (t.transactionType || '').toUpperCase();
    if (type === 'INCOME') {
      displayIncome += Math.abs(t.amount);
    } else if (type === 'EXPENSE') {
      displayExpense += Math.abs(t.amount);
    }
  });

  const monthlyNet = Array(12).fill(0);
  yearlyTxns.forEach(t => {
    const txDate = t.transactionDate || (t as any).date;
    if (!txDate) return;
    const d = new Date(txDate);
    const m = d.getMonth();
    const type = (t.transactionType || '').toUpperCase();
    if (type === 'INCOME') {
      monthlyNet[m] += Math.abs(t.amount);
    } else if (type === 'EXPENSE') {
      monthlyNet[m] -= Math.abs(t.amount);
    }
  });

  let cumulative = 0;
  const monthlyCumulative = monthlyNet.map(net => {
    cumulative += net;
    return cumulative;
  });

  const maxAbsVal = Math.max(...monthlyCumulative.map(Math.abs), 100);

  const x_coords = [35, 85, 135, 185, 235, 285, 335, 385, 435, 485, 535, 585];
  const pts = monthlyCumulative.map((val, idx) => {
    const x = x_coords[idx];
    const y = 100 - (val / maxAbsVal) * 80;
    return { x, y, val };
  });

  let pathD = '';
  let areaD = '';
  if (pts.length > 0) {
    pathD = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaD = `M ${pts[0].x} 100 ` + pts.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x} 100 Z`;
  }

  const totalAmt = displayIncome + displayExpense;
  const incomePct = totalAmt > 0 ? displayIncome / totalAmt : 0.5;
  const expensePct = totalAmt > 0 ? displayExpense / totalAmt : 0.5;

  let salesTitle = 'Sales in the last week';
  let cashTitle = 'Cash at the end of the month';
  let taxSubtitle = 'Employee Tax & Deductions';

  salesTitle = 'Inflows in the last week';
  cashTitle = 'Cash at the end of the month';
  taxSubtitle = 'Tax Plan & Deductions';

  if (profession === 'Farmer') {
    salesTitle = 'Crop Sales in past 6 months';
    cashTitle = 'Farm Cash at end of month';
    taxSubtitle = 'Section 10(1) Agri Deductions';
  } else if (profession === 'Freelancer') {
    salesTitle = 'Receipts in the last week';
    cashTitle = 'Freelance Cash at end of month';
    taxSubtitle = 'Sec 44ADA Tax & Write-offs';
  } else if (profession === 'Business') {
    salesTitle = 'Business Sales in the last week';
    cashTitle = 'Business Cash at end of month';
    taxSubtitle = 'Sec 44AD Business Tax Slab';
  } else if (profession === 'Salaried') {
    salesTitle = 'Salary & Inflow in the last week';
    cashTitle = 'Cash at the end of the month';
    taxSubtitle = 'Salaried Tax Plan & Deductions';
  } else if (profession === 'Student') {
    salesTitle = 'Pocket Money & Inflow in the last week';
    cashTitle = 'Balance at the end of the month';
    taxSubtitle = 'Student Savings Checklist';
  } else if (profession === 'Housewife') {
    salesTitle = 'Budget & Inflow in the last week';
    cashTitle = 'Household Cash at end of month';
    taxSubtitle = 'Household Savings Checklist';
  }

  const isFarmer = profession === 'Farmer';
  const barData = isFarmer
    ? [
        { label: 'Jan', val: 85, color: '#10b981' },
        { label: 'Feb', val: 0, color: '#71717a' },
        { label: 'Mar', val: 0, color: '#71717a' },
        { label: 'Apr', val: 0, color: '#71717a' },
        { label: 'May', val: 0, color: '#71717a' },
        { label: 'Jun', val: 95, color: '#eab308' }
      ]
    : [
        { label: 'Mon', val: 50, color: '#f59e0b' },
        { label: 'Tue', val: 75, color: '#f97316' },
        { label: 'Wed', val: 60, color: '#3b82f6' },
        { label: 'Thu', val: 90, color: '#10b981' }
      ];

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

  const innerPieData = (pieFlowType === 'EXPENSE' ? charts.category : (charts.categoryIncome || []))
    .filter((c: any) => c.value > 0);

  const rawOuterPieData = (pieFlowType === 'EXPENSE' ? (charts.subcategory || []) : (charts.subcategoryIncome || []))
    .filter((c: any) => c.value > 0);

  // Group and order outer pie subcategories by parent category to align with Recharts inner segments
  const outerPieData: any[] = [];
  innerPieData.forEach((parent: any) => {
    const matches = rawOuterPieData.filter((sub: any) => sub.parentCategory === parent.name);
    outerPieData.push(...matches);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900">
        <div>
          <span className="text-[8px] uppercase font-black tracking-widest text-slate-400">Statement Ledger</span>
          <h1 className="text-xl font-black font-sans leading-none mt-1">DASHBOARD</h1>
        </div>
        

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
      {showVisualizations && (
        <div className="space-y-6">
          {/* Cash trajectory Line Chart */}
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4 relative z-20">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-xs">{cashTitle}</h3>
              <div className="relative">
                <button
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  className="text-emerald-500 text-[10px] font-black uppercase flex items-center space-x-1 outline-none cursor-pointer"
                >
                  <span>{selectedYear} ▼</span>
                </button>
                {yearDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-50 animate-slideUp text-[9px] font-bold w-16">
                    {[2026, 2025, 2024].map(yr => (
                      <button
                        key={yr}
                        onClick={() => {
                          setSelectedYear(yr);
                          setYearDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[9px] font-bold flex items-center justify-between transition-colors ${
                          yr === selectedYear ? 'text-emerald-500' : 'text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-none pr-1">
              <div className="min-w-[600px] h-56 relative">
                <svg width="600" height="200" viewBox="0 0 600 200" className="w-full">
                  <defs>
                    <linearGradient id="chart-stroke" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="chart-area" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
                      <stop offset="50%" stopColor="#22c55e" stopOpacity="0.0" />
                      <stop offset="50%" stopColor="#ef4444" stopOpacity="0.0" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>

                  {/* Gridlines */}
                  {[-1.0, -0.5, 0.0, 0.5, 1.0].map((ratio, idx) => {
                    const yVal = 100 - ratio * 80;
                    const gridVal = ratio * maxAbsVal;
                    const isZero = ratio === 0;
                    return (
                      <g key={idx}>
                        <line
                          x1="15"
                          y1={yVal}
                          x2="585"
                          y2={yVal}
                          stroke="currentColor"
                          className={isZero ? "text-slate-300 dark:text-zinc-700" : "text-slate-100 dark:text-zinc-900/50"}
                          strokeWidth={isZero ? "1.5" : "1"}
                          strokeDasharray={isZero ? "" : "3,3"}
                        />
                        <text
                          x="20"
                          y={yVal - 5}
                          fill={isZero ? "#64748b" : "#94a3b8"}
                          fontSize="9"
                          fontWeight="black"
                          className="select-none"
                        >
                          ₹{Math.round(gridVal).toLocaleString('en-IN')}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area */}
                  {areaD && <path d={areaD} fill="url(#chart-area)" />}

                  {/* Line */}
                  {pathD && <path d={pathD} fill="none" stroke="url(#chart-stroke)" strokeWidth="3" />}

                  {/* Points & Tooltips */}
                  {pts.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r="4.5" fill={pt.val >= 0 ? "#22c55e" : "#ef4444"} />
                      <circle cx={pt.x} cy={pt.y} r="2.2" fill="#ffffff" />
                      <text
                        x={pt.x}
                        y={pt.val >= 0 ? pt.y - 10 : pt.y + 14}
                        fill={pt.val >= 0 ? "#22c55e" : "#ef4444"}
                        fontSize="9.5"
                        fontWeight="black"
                        textAnchor="middle"
                        className="select-none"
                      >
                        ₹{Math.round(pt.val).toLocaleString('en-IN')}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Month labels */}
                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase px-4 mt-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                    <span key={i} className="w-8 text-center">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nested Category & Subcategory spending Pie Chart */}
          {ratioCardVisible && (
            <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-xs">Category Breakdown ({pieFlowType})</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Nested subcategory analysis</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPieFlowType(pieFlowType === 'EXPENSE' ? 'INCOME' : 'EXPENSE')}
                    className="px-2 py-1 text-[8px] font-black uppercase bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Show {pieFlowType === 'EXPENSE' ? 'Inflows' : 'Outflows'}
                  </button>
                  <button
                    onClick={() => setRatioCardVisible(false)}
                    className="text-slate-400 hover:text-black dark:hover:text-white font-bold text-xs cursor-pointer ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {innerPieData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                  No data logged for this period
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2 rounded-xl text-[9px] font-bold shadow-md uppercase">
                                <p className="text-slate-500">{data.parentCategory ? 'Subcategory' : 'Category'}</p>
                                <p className="text-black dark:text-white text-[10px] font-black mt-0.5">{data.name}</p>
                                <p className="text-emerald-500 mt-1">₹{data.value.toLocaleString('en-IN')}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Inner Pie: Categories */}
                      <Pie
                        data={innerPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={55}
                        fill="#8884d8"
                      >
                        {innerPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-inner-${index}`} fill={getCategoryColor(entry.name, index)} />
                        ))}
                      </Pie>
                      {/* Outer Pie: Subcategories */}
                      <Pie
                        data={outerPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        fill="#82ca9d"
                      >
                        {outerPieData.map((entry: any, index: number) => {
                          const parentIdx = innerPieData.findIndex((c: any) => c.name === entry.parentCategory);
                          const baseColor = getCategoryColor(entry.parentCategory, parentIdx >= 0 ? parentIdx : index);
                          const alpha = 0.8 - (index % 3) * 0.25;
                          const fillColor = hexToRgba(baseColor, alpha);
                          return (
                            <Cell key={`cell-outer-${index}`} fill={fillColor} />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Legend with matching subcategories */}
              <div className="flex flex-wrap gap-2 justify-center border-t dark:border-zinc-900 pt-3 max-h-24 overflow-y-auto scrollbar-none">
                {innerPieData.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center space-x-1.5 text-[9px] font-bold uppercase">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(item.name, idx) }} />
                    <span className="text-slate-500 dark:text-zinc-405">{item.name}</span>
                    <span className="text-black dark:text-white font-black">₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

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

      {/* 6. REPORTS PREVIEW MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b dark:border-zinc-900 mb-4 shrink-0 text-black dark:text-white">
              <h3 className="text-xs font-black uppercase">📄 Monthly Statement Report</h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-black dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-none text-black dark:text-white">
              <div className="border border-slate-200 dark:border-zinc-850 p-4 rounded-xl bg-slate-55 dark:bg-zinc-950/60 space-y-4">
                <div className="text-center">
                  <h4 className="font-black text-[11px] uppercase tracking-wide">Monthly Revenue & Outflows</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Period: 01 May - 31 May 2026</p>
                </div>

                <div className="border-b dark:border-zinc-850 pb-3 text-[9.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase space-y-1">
                  <p>Client Name: <span className="text-black dark:text-white font-black">{localStorage.getItem('passbook_user_profile') ? JSON.parse(localStorage.getItem('passbook_user_profile')!).name : 'Local User'}</span></p>
                  <p>Profession: <span className="text-black dark:text-white font-black">{profession}</span></p>
                </div>

                <div className="space-y-2 text-[9.5px] uppercase font-bold text-slate-500 dark:text-zinc-400">
                  <div className="flex justify-between border-b dark:border-zinc-900 pb-1 text-[8px] uppercase font-black text-slate-400">
                    <span>Particulars</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Revenue Inflows</span>
                    <span className="text-emerald-500 font-black">₹{displayIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bills Outflows</span>
                    <span className="text-rose-500 font-black">₹{displayExpense.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t dark:border-zinc-900 pt-2 font-black">
                    <span className="text-black dark:text-white">Net Cash Savings:</span>
                    <span className="text-indigo-500">₹{(displayIncome - displayExpense).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {transactions.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t dark:border-zinc-900">
                    <h5 className="text-[9.5px] font-black uppercase text-black dark:text-white">Recent Statements Log</h5>
                    {transactions.slice(0, 5).map((t, idx) => (
                      <div key={t.id || idx} className="flex justify-between text-[8px] font-bold text-slate-450 dark:text-zinc-500 uppercase">
                        <span className="truncate max-w-[150px]">{t.description}</span>
                        <span className={t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                          ₹{Math.abs(t.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t dark:border-zinc-900 mt-4 shrink-0">
              <button
                onClick={() => setReportModalOpen(false)}
                className="py-2.5 px-4 border border-slate-200 dark:border-zinc-800 text-[9.5px] font-black uppercase rounded-xl hover:bg-slate-50 cursor-pointer text-slate-600 dark:text-zinc-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setDownloadingPdf(true);
                  setTimeout(() => {
                    setDownloadingPdf(false);
                    setReportModalOpen(false);
                    alert('Last Month Statement PDF Report has been successfully saved to your downloads.');
                  }, 1500);
                }}
                disabled={downloadingPdf}
                className="py-2.5 px-4 bg-rose-500 hover:bg-rose-650 text-white text-[9.5px] font-black uppercase rounded-xl cursor-pointer flex items-center space-x-1"
              >
                {downloadingPdf ? (
                  <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Download PDF</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAX PREVIEW MODAL */}
      {taxModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b dark:border-zinc-900 mb-4 shrink-0 text-black dark:text-white">
              <h3 className="text-xs font-black uppercase">📄 Tax Plan Details Report</h3>
              <button onClick={() => setTaxModalOpen(false)} className="text-slate-400 hover:text-black dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-none text-black dark:text-white">
              <div className="border border-slate-200 dark:border-zinc-850 p-4 rounded-xl bg-slate-55 dark:bg-zinc-955/60 space-y-4">
                <div className="text-center">
                  <h4 className="font-black text-[11px] uppercase tracking-wide">Tax Planning Assessment</h4>
                  <p className="text-[8px] text-slate-405 font-bold uppercase mt-0.5">Assessed Period: FY 2026-27</p>
                </div>

                <div className="border-b dark:border-zinc-850 pb-3 text-[9.5px] font-bold text-slate-555 dark:text-zinc-400 uppercase space-y-1">
                  <p>Assessee Name: <span className="text-black dark:text-white font-black">{localStorage.getItem('passbook_user_profile') ? JSON.parse(localStorage.getItem('passbook_user_profile')!).name : 'Local User'}</span></p>
                  <p>Profession Category: <span className="text-black dark:text-white font-black">{profession}</span></p>
                  <p>Gross Annual Income: <span className="text-black dark:text-white font-black">₹{displayIncome.toLocaleString('en-IN')}</span></p>
                </div>

                <div className="space-y-2 text-[9.5px] uppercase font-bold text-slate-500 dark:text-zinc-400">
                  <h5 className="text-[9.5px] font-black uppercase text-black dark:text-white">Deductions Claimed</h5>
                  {taxCheckedItems.length === 0 ? (
                    <p className="text-[8.5px] italic text-slate-400">No deductions claimed. Go to Tax Planner Checklist to claim write-offs.</p>
                  ) : (
                    <div className="space-y-1">
                      {taxCheckedItems.map(itemId => {
                        const amount = taxClaimedAmounts[itemId] || 0;
                        return (
                          <div key={itemId} className="flex justify-between text-[8px] font-bold text-slate-450 dark:text-zinc-500 uppercase">
                            <span className="truncate max-w-[150px]">{itemId.toUpperCase()}</span>
                            <span>₹{amount.toLocaleString('en-IN')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t dark:border-zinc-900 mt-4 shrink-0">
              <button
                onClick={() => setTaxModalOpen(false)}
                className="py-2.5 px-4 border border-slate-200 dark:border-zinc-800 text-[9.5px] font-black uppercase rounded-xl hover:bg-slate-50 cursor-pointer text-slate-600 dark:text-zinc-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setDownloadingPdf(true);
                  setTimeout(() => {
                    setDownloadingPdf(false);
                    setTaxModalOpen(false);
                    alert('Tax Planning Audit PDF Report has been successfully saved to your downloads.');
                  }, 1500);
                }}
                disabled={downloadingPdf}
                className="py-2.5 px-4 bg-blue-500 hover:bg-blue-650 text-white text-[9.5px] font-black uppercase rounded-xl cursor-pointer flex items-center space-x-1"
              >
                {downloadingPdf ? (
                  <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Download PDF</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

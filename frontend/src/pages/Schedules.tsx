import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ChevronDown,
  Check,
  Play,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Search,
  Pencil,
  X
} from 'lucide-react';

interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string; // INCOME or EXPENSE
  category: string;
  paymentMethod: string;
  account: string;
  frequency: string; // DAILY, WEEKLY, MONTHLY
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  notes?: string;
  tags?: string;
  status?: string;
  isApprovedTx?: boolean;
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const SCHEDULE_CATEGORIES = [
  'Subscriptions',
  'Rent',
  'Utilities/Bills',
  'Insurance',
  'Salary',
  'Loan/EMI Payments',
  'Other Income',
  'Miscellaneous'
];

const getCategoryEmoji = (category: string) => {
  const c = category.trim();
  switch (c) {
    case 'Salary': return '💰';
    case 'Subscriptions': return '🔔';
    case 'Rent': return '🔑';
    case 'Utilities/Bills': return '⚡';
    case 'Insurance': return '🛡️';
    case 'Loan/EMI Payments': return '💳';
    case 'Other Income': return '🪙';
    case 'Miscellaneous': return '📦';
    default: return '📦';
  }
};

const CustomDatePicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Select Date' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(year, month, day);
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    onChange(localDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysGrid = [];
  for (let i = 0; i < startDay; i++) {
    daysGrid.push(<div key={`empty-${i}`} className="w-5 h-5" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
    daysGrid.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`w-5 h-5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-black text-white dark:bg-white dark:text-black font-black scale-110 shadow-sm'
            : 'text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-zinc-800'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between font-bold outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
      >
        <span>{value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : placeholder}</span>
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 animate-slideUp w-48 text-[9px] select-none">
          <div className="flex justify-between items-center mb-2 border-b dark:border-zinc-900 pb-1">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded font-bold text-slate-400 hover:text-black dark:hover:text-white">&lt;</button>
            <span className="font-extrabold uppercase text-[7.5px] tracking-wide text-slate-600 dark:text-zinc-400">{monthNames[month].slice(0, 3)} {year}</span>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded font-bold text-slate-400 hover:text-black dark:hover:text-white">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 mb-1 text-[7px] uppercase">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysGrid}
          </div>
        </div>
      )}
    </div>
  );
};

export const Schedules: React.FC = () => {
  const location = useLocation();
  const [schedules, setSchedules] = useState<RecurringTransaction[]>([]);
  const [completedLogs, setCompletedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Custom Filters & Tab States
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringTransaction | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [category, setCategory] = useState('Subscriptions');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [account, setAccount] = useState('SBI');
  const [pm, setPm] = useState('Direct Debit');
  const [notes, setNotes] = useState('');

  // Daily options states
  const [dailyOption, setDailyOption] = useState<'EVERY_DAY' | 'SPECIFIC_DAYS'>('EVERY_DAY');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  // Dropdowns toggles
  const [modalTypeDropdownOpen, setModalTypeDropdownOpen] = useState(false);
  const [modalCatDropdownOpen, setModalCatDropdownOpen] = useState(false);
  const [modalFreqDropdownOpen, setModalFreqDropdownOpen] = useState(false);

  const fetchSchedules = async () => {
    if (schedules.length === 0) {
      setLoading(true);
    }
    try {
      const res = await axios.get('/api/recurring');
      setSchedules(res.data);

      const txs = await axios.get('/api/transactions');
      const filteredTxs = (txs.data || []).filter((t: any) =>
        t.description && t.description.toLowerCase().includes('(recurring)')
      );
      setCompletedLogs(filteredTxs);
    } catch (err) {
      console.error('Failed to fetch recurring schedules/transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRef = useRef(fetchSchedules);
  useEffect(() => {
    fetchRef.current = fetchSchedules;
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
      // Ignore BroadcastChannel errors
    }
  };

  const getSubscriptionEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('netflix')) return '🍿';
    if (n.includes('spotify') || n.includes('music') || n.includes('youtube')) return '🎵';
    if (n.includes('amazon') || n.includes('prime')) return '📦';
    if (n.includes('apple')) return '🍎';
    if (n.includes('gym')) return '💪';
    if (n.includes('rent')) return '🏠';
    if (n.includes('mobile') || n.includes('recharge') || n.includes('jio') || n.includes('airtel')) return '📱';
    return '💳';
  };

  useEffect(() => {
    if (location.pathname === '/schedules') {
      fetchSchedules();
    }
  }, [location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !startDate) return;

    const payloadTags = (frequency === 'DAILY' && dailyOption === 'SPECIFIC_DAYS')
      ? selectedWeekdays.join(', ')
      : '';

    try {
      if (editingSchedule) {
        await axios.put(`/api/recurring/${editingSchedule.id}`, {
          description,
          amount: parseFloat(amount),
          type,
          category,
          frequency,
          startDate,
          endDate: endDate || null,
          account,
          paymentMethod: pm,
          notes,
          tags: payloadTags
        });
      } else {
        await axios.post('/api/recurring', {
          description,
          amount: parseFloat(amount),
          type,
          category,
          frequency,
          startDate,
          endDate: endDate || null,
          account,
          paymentMethod: pm,
          notes,
          tags: payloadTags
        });
      }
      
      setModalOpen(false);
      resetForm();
      fetchSchedules();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Failed to save schedule.');
    }
  };

  const handleEdit = (s: RecurringTransaction) => {
    setEditingSchedule(s);
    setDescription(s.description);
    setAmount(String(s.amount));
    setType(s.type as any);
    setCategory(s.category);
    setFrequency(s.frequency);
    setStartDate(s.startDate.split('T')[0]);
    setEndDate(s.endDate ? s.endDate.split('T')[0] : '');
    setAccount(s.account);
    setPm(s.paymentMethod);
    setNotes(s.notes || '');

    if (s.frequency === 'DAILY' && s.tags && s.tags.trim() !== '') {
      setDailyOption('SPECIFIC_DAYS');
      setSelectedWeekdays(s.tags.split(',').map(str => str.trim()));
    } else {
      setDailyOption('EVERY_DAY');
      setSelectedWeekdays([]);
    }

    setIsDirty(false);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Cancel and delete this recurring schedule?')) return;
    try {
      await axios.delete(`/api/recurring/${id}`);
      fetchSchedules();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Failed to delete schedule.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await axios.post(`/api/recurring/${id}/approve`);
      fetchSchedules();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Failed to approve occurrence.');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await axios.post(`/api/recurring/${id}/skip`);
      fetchSchedules();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Failed to skip occurrence.');
    }
  };

  const resetForm = () => {
    setEditingSchedule(null);
    setDescription('');
    setAmount('');
    setType('EXPENSE');
    setCategory('Subscriptions');
    setFrequency('MONTHLY');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setAccount('SBI');
    setPm('Direct Debit');
    setNotes('');
    setDailyOption('EVERY_DAY');
    setSelectedWeekdays([]);
    setIsDirty(false);
  };

  const activeRules = schedules.filter(s => {
    const sStatus = s.status || 'ACTIVE';
    if (sStatus === 'COMPLETED') return false;

    const matchesSearch = s.description.toLowerCase().includes(search.toLowerCase()) ||
                          s.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== 'All') {
      if (s.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
    }
    return true;
  });

  const txLogs: RecurringTransaction[] = completedLogs.map(t => {
    const catName = typeof t.category === 'object' ? t.category.name : t.category;
    return {
      id: t.id,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.amount < 0 ? 'EXPENSE' : 'INCOME',
      category: catName || 'Subscriptions',
      frequency: 'ONE-TIME LOG',
      nextRunDate: t.transactionDate,
      notes: t.note || '',
      status: 'COMPLETED',
      isApprovedTx: true,
      tags: '',
      paymentMethod: t.paymentMethod || 'UPI',
      account: t.account || 'SBI',
      startDate: t.transactionDate
    };
  });

  const cancelledRules = schedules.filter(s => {
    return s.status === 'COMPLETED';
  });

  const mergedCompletedList = [...cancelledRules, ...txLogs].filter(s => {
    const matchesSearch = s.description.toLowerCase().includes(search.toLowerCase()) ||
                          s.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== 'All') {
      if (s.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
    }
    return true;
  });

  mergedCompletedList.sort((a, b) => new Date(b.nextRunDate).getTime() - new Date(a.nextRunDate).getTime());

  const filteredSchedules = statusFilter === 'ACTIVE' ? activeRules : mergedCompletedList;

  return (
    <div className="space-y-5 animate-fadeIn pb-16 select-none text-black dark:text-white">
      
      {/* Search & Add Button Row */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-405" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search schedules..."
            className="w-full pl-9 pr-4 py-2 text-[10px] rounded-xl border border-slate-205 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 outline-none text-black dark:text-white"
          />
        </div>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className={`px-3 py-2 text-[10px] rounded-xl border flex items-center space-x-1 font-bold transition-all cursor-pointer ${
              filterDropdownOpen
                ? 'bg-indigo-650 border-indigo-650 text-white'
                : 'border-slate-205 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200'
            }`}
          >
            <span>Filters</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          
          {filterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-800 rounded-xl shadow-lg max-h-48 overflow-y-auto scrollbar-none py-1 z-50 animate-slideUp text-[9px] font-bold w-32">
              {['All', ...SCHEDULE_CATEGORIES].map(cat => {
                const isSel = selectedCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategoryFilter(cat); setFilterDropdownOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[9px] font-bold truncate flex items-center justify-between"
                  >
                    <span>{cat}</span>
                    {isSel && <Check className="w-2.5 h-2.5 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 border dark:border-white/10"
          title="Add Schedule"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* ACTIVE / COMPLETED TABS ROW */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 text-slate-550 dark:text-zinc-400'
          }`}
        >
          Active Rules
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
            statusFilter === 'COMPLETED'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 text-slate-550 dark:text-zinc-400'
          }`}
        >
          Cancelled Logs
        </button>
      </div>

      {/* SCHEDULES LOG FEED */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-slate-405 font-semibold">Loading schedules...</span>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-12 text-slate-450 text-[10px] font-semibold space-y-2 border border-dashed border-slate-200 dark:border-zinc-900 rounded-3xl bg-slate-50/20 dark:bg-zinc-950/5">
          <Clock className="w-6 h-6 mx-auto text-slate-350" />
          <p>No repeating logs match your current selection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map(s => {
            const isExpense = s.type.toUpperCase() === 'EXPENSE';
            const freqLower = s.frequency.toLowerCase();
            const cycleText = freqLower === 'daily' ? 'day' : freqLower === 'weekly' ? 'week' : 'month';
            const isCompleted = s.status === 'COMPLETED';
            const isDue = new Date(s.nextRunDate) <= new Date() && !isCompleted;
            
            const cardBorderLeftColor = isCompleted
              ? 'border-l-slate-400 dark:border-l-zinc-700'
              : isExpense
              ? 'border-l-rose-500'
              : 'border-l-emerald-500';
            const cardOpacity = isCompleted ? 'opacity-70' : 'opacity-100';

            const isSubscription = s.category === 'Subscriptions';
            const emoji = getSubscriptionEmoji(s.description);

            if (isSubscription) {
              return (
                <div
                  key={s.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (!isCompleted) handleEdit(s);
                  }}
                  className={`p-3.5 border border-slate-150 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl flex flex-col hover:bg-slate-100/30 dark:hover:bg-zinc-900/10 transition-colors border-l-4 ${cardBorderLeftColor} ${cardOpacity} ${!isCompleted ? 'cursor-pointer hover:border-indigo-500/50' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-lg shrink-0">
                      {emoji}
                    </div>
                    
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {s.description}
                      </h4>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5 mt-0.5 text-[8px] text-slate-400 font-bold uppercase">
                        <span>{s.frequency}</span>
                        <span>•</span>
                        <span>Next: {new Date(s.nextRunDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pr-2">
                      <span className={`font-black text-xs font-sans block ${isExpense ? 'text-rose-500' : 'text-emerald-555'}`}>
                        {isExpense ? '-' : '+'}₹{Math.abs(s.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[7.5px] uppercase text-slate-405 font-extrabold block">
                        per {cycleText}
                      </span>
                    </div>

                    <div className="flex space-x-1 shrink-0">
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[7.5px] font-extrabold uppercase">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {isDue && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[8px] font-bold text-amber-500 uppercase flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Occurrence Pending Approval</span>
                      </span>
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => handleSkip(s.id)}
                          className="p-1 rounded bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 dark:bg-zinc-900 text-slate-405 dark:text-zinc-500 transition-colors flex items-center justify-center cursor-pointer"
                          title="Skip occurrence"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="py-1 px-2.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] font-extrabold uppercase transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                        >
                          Pay & Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={s.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (!isCompleted) handleEdit(s);
                }}
                className={`p-3.5 border border-slate-150 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl flex flex-col hover:bg-slate-100/30 dark:hover:bg-zinc-900/10 transition-colors border-l-4 ${cardBorderLeftColor} ${cardOpacity} ${!isCompleted ? 'cursor-pointer hover:border-indigo-500/50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <span className="text-[7.5px] font-extrabold text-slate-450 uppercase shrink-0">
                        Next: {new Date(s.nextRunDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase shrink-0 ${
                          isExpense 
                            ? 'bg-rose-500/10 text-rose-550' 
                            : 'bg-emerald-500/10 text-emerald-550'
                        }`}
                      >
                        {s.frequency} {s.frequency === 'DAILY' && s.tags ? `(${s.tags})` : ''}
                      </span>
                      <span className="text-[8px] font-extrabold text-indigo-400 uppercase truncate">
                        {s.category}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 mt-1 truncate max-w-[170px]">
                      {s.description}
                    </h4>
                    {s.notes && (
                      <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate max-w-[170px]">
                        {s.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span className={`font-black text-xs font-sans block ${isExpense ? 'text-rose-500' : 'text-emerald-555'}`}>
                        {isExpense ? '-' : '+'}₹{Math.abs(s.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[7.5px] uppercase text-slate-405 font-extrabold block">
                        per {cycleText}
                      </span>
                    </div>

                    <div className="flex space-x-1">
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[7.5px] font-extrabold uppercase">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isDue && (
                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[8px] font-bold text-amber-500 uppercase flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Occurrence Pending Approval</span>
                    </span>
                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => handleSkip(s.id)}
                        className="p-1 rounded bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 dark:bg-zinc-900 text-slate-405 dark:text-zinc-500 transition-colors flex items-center justify-center cursor-pointer"
                        title="Skip occurrence"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleApprove(s.id)}
                        className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                        title="Approve & Log transaction"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
          <div className="w-full max-w-[340px] bg-white dark:bg-black rounded-3xl p-5 shadow-premium border border-slate-200 dark:border-slate-800 relative max-h-[500px] overflow-y-auto scrollbar-none animate-fadeIn">
            
            {!isDirty && (
              <button
                type="button"
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-400 animate-fadeIn" />
              </button>
            )}

            <h3 className="font-black text-sm mb-3">
              {editingSchedule ? 'EDIT REPETITION SCHEDULE' : 'NEW REPETITION SCHEDULE'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold">
              
              {/* Type and Frequency Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Type</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setModalTypeDropdownOpen(prev => !prev);
                        setModalCatDropdownOpen(false);
                        setModalFreqDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between font-bold outline-none text-slate-700 dark:text-slate-200"
                    >
                      <span>{type === 'EXPENSE' ? 'Expense' : 'Income'}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {modalTypeDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 animate-slideUp text-[10px]">
                        {['EXPENSE', 'INCOME'].map(tVal => (
                          <button
                            key={tVal}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setType(tVal as any);
                              setModalTypeDropdownOpen(false);
                              setIsDirty(true);
                              if (tVal === 'INCOME') setCategory('Salary');
                              else setCategory('Subscriptions');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[10px] font-bold flex items-center justify-between transition-colors"
                          >
                            <span>{tVal === 'EXPENSE' ? 'Expense' : 'Income'}</span>
                            {type === tVal && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Frequency</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setModalFreqDropdownOpen(prev => !prev);
                        setModalCatDropdownOpen(false);
                        setModalTypeDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between font-bold outline-none text-slate-700 dark:text-slate-200"
                    >
                      <span>{frequency}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {modalFreqDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 animate-slideUp text-[10px]">
                        {FREQUENCIES.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setFrequency(f);
                              setModalFreqDropdownOpen(false);
                              setIsDirty(true);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[10px] font-bold flex items-center justify-between transition-colors"
                          >
                            <span>{f}</span>
                            {frequency === f && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* If frequency is DAILY, show Every Day vs Specific Weekdays selection */}
              {frequency === 'DAILY' && (
                <div className="space-y-2 pt-1 border-t dark:border-zinc-900">
                  <div className="flex justify-between items-center text-[8px] uppercase font-bold text-slate-450 select-none">
                    <span>Daily Options</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => { setDailyOption('EVERY_DAY'); setIsDirty(true); }}
                      className={`py-1.5 px-3 rounded-lg border text-center font-bold transition-all ${
                        dailyOption === 'EVERY_DAY'
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-500'
                      }`}
                    >
                      Every Day
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDailyOption('SPECIFIC_DAYS'); setIsDirty(true); }}
                      className={`py-1.5 px-3 rounded-lg border text-center font-bold transition-all ${
                        dailyOption === 'SPECIFIC_DAYS'
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-500'
                      }`}
                    >
                      Specific Weekdays
                    </button>
                  </div>

                  {dailyOption === 'SPECIFIC_DAYS' && (
                    <div className="flex flex-wrap gap-1.5 pt-1 justify-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                        const isSelected = selectedWeekdays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => {
                              setSelectedWeekdays(prev =>
                                prev.includes(day)
                                  ? prev.filter(d => d !== day)
                                  : [...prev, day]
                              );
                              setIsDirty(true);
                            }}
                            className={`w-8 h-8 rounded-full border text-[9px] font-bold flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                                : 'border-slate-200 dark:border-zinc-800 text-slate-400'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Description and Amount Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={e => { setDescription(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Netflix Subscription"
                    className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Cycle Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setIsDirty(true); }}
                    placeholder="199.00"
                    className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 outline-none font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Category and Account Row */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450 block">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setModalCatDropdownOpen(prev => !prev);
                      setModalFreqDropdownOpen(false);
                      setModalTypeDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between font-bold outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-[11px] shrink-0">{getCategoryEmoji(category)}</span>
                      <span className="truncate">{category}</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-405 shrink-0" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Account</label>
                  <input
                    type="text"
                    required
                    value={account}
                    onChange={e => { setAccount(e.target.value); setIsDirty(true); }}
                    placeholder="SBI"
                    className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Start Date and End Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Start Date</label>
                  <CustomDatePicker
                    value={startDate}
                    onChange={val => { setStartDate(val); setIsDirty(true); }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">End Date (Opt)</label>
                  <CustomDatePicker
                    value={endDate}
                    onChange={val => { setEndDate(val); setIsDirty(true); }}
                    placeholder="No End Date"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-450">Repetition Notes</label>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setIsDirty(true); }}
                  placeholder="Netflix Premium subscription plan billing details"
                  rows={2}
                  className="w-full px-3 py-1.5 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 outline-none resize-none font-semibold text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100 dark:border-zinc-900 mt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#18181b] dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px] transition-colors"
                >
                  Cancel
                </button>
                {editingSchedule && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      handleDelete(editingSchedule.id);
                    }}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-500 rounded-xl font-bold text-[10px] border border-rose-200 dark:border-rose-900/35 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!isDirty}
                  className="flex-1 py-2 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black rounded-xl font-bold text-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingSchedule ? 'Save Changes' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Category bottom sheet overlay */}
      {modalCatDropdownOpen && (
        <div className="absolute inset-0 z-[60] bg-black/45 backdrop-blur-xs flex flex-col justify-end select-none animate-fadeIn">
          {/* Click outside to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setModalCatDropdownOpen(false)} />
          
          {/* Sliding Sheet */}
          <div className="w-full bg-white dark:bg-[#18181b] border-t border-slate-200 dark:border-zinc-800 rounded-t-[28px] p-5 shadow-2xl flex flex-col max-h-[70%] animate-slideUp text-black dark:text-white">
            {/* Pull bar indicator */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0" />
            
            {/* Title */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                Select Category
              </h4>
              <button
                type="button"
                onClick={() => setModalCatDropdownOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Grid list of categories */}
            <div className="grid grid-cols-3 gap-2 overflow-y-auto scrollbar-none pb-6">
              {SCHEDULE_CATEGORIES.map((c: string) => {
                const isSelected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      setModalCatDropdownOpen(false);
                      setIsDirty(true);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105'
                        : 'bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 border-transparent text-slate-700 dark:text-zinc-355'
                    }`}
                  >
                    <span className="text-[20px]">{getCategoryEmoji(c)}</span>
                    <span className="text-[8.5px] font-bold text-center leading-tight truncate w-full">
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

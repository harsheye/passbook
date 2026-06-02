import React, { useEffect, useState } from 'react';
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
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'];
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
  const [schedules, setSchedules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    setLoading(true);
    try {
      const res = await axios.get('/api/recurring');
      setSchedules(res.data);
    } catch (err) {
      console.error('Failed to fetch recurring schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

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
    } catch (err) {
      alert('Failed to delete schedule.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await axios.post(`/api/recurring/${id}/approve`);
      fetchSchedules();
    } catch (err) {
      alert('Failed to approve occurrence.');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await axios.post(`/api/recurring/${id}/skip`);
      fetchSchedules();
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
        <button
          type="button"
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="w-8 h-8 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 border dark:border-white/10"
          title="Add Schedule"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* SCHEDULES LOG FEED */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-slate-400 font-semibold">Loading active schedules...</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-slate-450 text-[10px] font-semibold space-y-2">
          <Clock className="w-6 h-6 mx-auto text-slate-350" />
          <p>No active repetition schedules established.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules
            .filter(s => 
              s.description.toLowerCase().includes(search.toLowerCase()) ||
              s.category.toLowerCase().includes(search.toLowerCase())
            )
            .map(s => {
              const isExpense = s.type.toUpperCase() === 'EXPENSE';
              const freqLower = s.frequency.toLowerCase();
              const cycleText = freqLower === 'daily' ? 'day' : freqLower === 'weekly' ? 'week' : 'month';
              const isDue = new Date(s.nextRunDate) <= new Date();

              return (
                <div
                  key={s.id}
                  className="p-3.5 border border-slate-150 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl flex flex-col hover:bg-slate-100/30 dark:hover:bg-zinc-900/10 transition-colors"
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
                        <span className={`font-black text-xs font-sans block ${isExpense ? 'text-rose-500' : 'text-emerald-550'}`}>
                          {isExpense ? '-' : '+'}₹{Math.abs(s.amount).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[7.5px] uppercase text-slate-400 font-extrabold block">
                          per {cycleText}
                        </span>
                      </div>

                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(s)}
                          className="p-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-450 hover:text-black dark:hover:text-white transition-all active:scale-95"
                          title="Edit schedule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-rose-500/5 hover:border-rose-500 text-slate-455 hover:text-rose-500 transition-all active:scale-95"
                          title="Cancel repetition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                          className="p-1 rounded bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 transition-colors flex items-center justify-center"
                          title="Skip occurrence"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center shadow-sm"
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-450">Category</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setModalCatDropdownOpen(prev => !prev);
                        setModalTypeDropdownOpen(false);
                        setModalFreqDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-[10px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between font-bold outline-none text-slate-700 dark:text-slate-200"
                    >
                      <span className="truncate">{category}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                    {modalCatDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 animate-slideUp text-[10px] max-h-36 overflow-y-auto scrollbar-none">
                        {SCHEDULE_CATEGORIES.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setCategory(c);
                              setModalCatDropdownOpen(false);
                              setIsDirty(true);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[10px] font-bold flex items-center justify-between transition-colors truncate"
                          >
                            <span className="truncate">{c}</span>
                            {category === c && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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

              {isDirty && (
                <div className="flex space-x-2 pt-2 border-t dark:border-zinc-900 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => { setModalOpen(false); resetForm(); }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-105 text-white dark:text-black rounded-xl font-bold text-[10px] transition-colors"
                  >
                    {editingSchedule ? 'Save Changes' : 'Save Schedule'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

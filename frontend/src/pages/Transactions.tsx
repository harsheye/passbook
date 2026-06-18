import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Pencil,
  Copy,
  Heart,
  Smile,
  MapPin,
  Tag,
  Share2,
  ChevronDown,
  Check,
  X,
  Paperclip,
  CheckCircle2,
  Star
} from 'lucide-react';

interface Transaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  transactionType: string;
  category: { name: string; icon: string; color: string };
  subcategory: string;
  paymentMethod: string;
  accountId: string;
  account?: string; // Legacy fallback
  note: string;
  tags: string;
  
  // Better UX fields
  merchantName?: string;
  location?: string;
  splitTransaction?: string;
  favorite?: boolean;
  receipts?: { id: string; fileName: string; fileUrl: string; fileType: string }[];
}

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

const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const getCategoryEmoji = (category: string) => {
  const c = category.trim();
  switch (c) {
    case 'Salary': return '💰';
    case 'Freelancing': return '💻';
    case 'Business Income': return '🏢';
    case 'Interest': return '📈';
    case 'Investment Returns': return '📊';
    case 'Bonus': return '🎁';
    case 'Refund': return '↩️';
    case 'Cashback': return '💸';
    case 'Other Income': return '🪙';
    case 'Beauty/Wellness': return '💅';
    case 'Eating Out/Ordering In': return '🍔';
    case 'Entertainment': return '🎬';
    case 'Fitness/Sports': return '👟';
    case 'Fuel': return '⛽';
    case 'Gifts': return '💝';
    case 'Groceries': return '🛒';
    case 'Healthcare': return '🏥';
    case 'Home Improvement': return '🏡';
    case 'Loan/EMI Payments': return '💳';
    case 'Miscellaneous': return '📦';
    case 'Money Transfers': return '⇄';
    case 'Rent': return '🔑';
    case 'Shopping': return '🛍️';
    case 'Skill Development': return '📚';
    case 'Subscriptions': return '🔔';
    case 'Travel': return '✈️';
    case 'Utilities/Bills': return '⚡';
    default: return '📦';
  }
};

const parseItemsFromNotes = (notesText: string) => {
  const extracted: { name: string; price: number }[] = [];
  if (notesText && notesText.startsWith('Items:\n')) {
    const lines = notesText.split('\n');
    let notesStartIdx = lines.length;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- ')) {
        const parts = line.slice(2).split(': ₹');
        if (parts.length === 2) {
          extracted.push({ name: parts[0], price: parseFloat(parts[1]) || 0 });
        }
      } else {
        notesStartIdx = i;
        break;
      }
    }
    const cleanNotes = lines.slice(notesStartIdx).join('\n').trim();
    return { items: extracted, cleanNotes };
  }
  return { items: [], cleanNotes: notesText };
};

const CustomDatePicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
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
        <span>{value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date'}</span>
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

export const Transactions: React.FC = () => {
  const routerLocation = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [quickFilter, setQuickFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    setSelectedDay(null);
  }, [selectedMonth, selectedYear]);

  const getThreeMonths = () => {
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
    const currDate = new Date(selectedYear, selectedMonth, 1);
    const nextDate = new Date(selectedYear, selectedMonth + 1, 1);
    
    return [
      { name: MONTH_NAMES[prevDate.getMonth()], month: prevDate.getMonth(), year: prevDate.getFullYear(), isSelected: false },
      { name: MONTH_NAMES[currDate.getMonth()], month: currDate.getMonth(), year: currDate.getFullYear(), isSelected: true },
      { name: MONTH_NAMES[nextDate.getMonth()], month: nextDate.getMonth(), year: nextDate.getFullYear(), isSelected: false }
    ];
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOffset = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getDayDetails = (dayNum: number) => {
    const dayDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayTxns = transactions.filter(t => {
      const txDate = t.transactionDate || (t as any).date;
      if (!txDate) return false;
      return txDate.startsWith(dayDateStr);
    });
    const net = dayTxns.reduce((sum, t) => sum + t.amount, 0);
    return {
      net,
      txns: dayTxns
    };
  };

  const formatCompactAmount = (amt: number) => {
    if (amt === 0) return '';
    const absAmt = Math.abs(amt);
    let str = '';
    if (absAmt >= 1000) {
      str = (absAmt / 1000).toFixed(0) + 'k';
    } else {
      str = absAmt.toFixed(0);
    }
    return (amt < 0 ? '-' : '+') + '₹' + str;
  };
  
  // Modals & forms
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [modalAdvancedOpen, setModalAdvancedOpen] = useState(false);
  const [showAddTagInput, setShowAddTagInput] = useState(false);
  
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [txnType, setTxnType] = useState<'Expense' | 'Income' | 'Transfer' | 'Gambling'>('Expense');
  const [cat, setCat] = useState('Eating Out/Ordering In');
  const [subcat, setSubcat] = useState('');
  const [pm, setPm] = useState('UPI');
  const [acc, setAcc] = useState('SBI');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Better UX fields states
  const [merchantName, setMerchantName] = useState('');
  const [location, setLocation] = useState('');
  const [splitTransaction, setSplitTransaction] = useState('');
  const [favorite, setFavorite] = useState(false);
  
  const [receiptImageName, setReceiptImageName] = useState('');
  const [items, setItems] = useState<{ name: string; price: number }[]>([]);

  // Dropdown UI toggle states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [quickFilterDropdownOpen, setQuickFilterDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [sortByDropdownOpen, setSortByDropdownOpen] = useState(false);
  const [modalTypeDropdownOpen, setModalTypeDropdownOpen] = useState(false);
  const [modalCatDropdownOpen, setModalCatDropdownOpen] = useState(false);
  const [modalPmDropdownOpen, setModalPmDropdownOpen] = useState(false);

  const fetchTransactions = async () => {
    if (transactions.length === 0) {
      setLoading(true);
    }
    try {
      const res = await axios.get('/api/transactions', {
        params: { search, type, category, quickFilter, sortBy, sortOrder }
      });
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to fetch transaction lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRef = useRef(fetchTransactions);
  useEffect(() => {
    fetchRef.current = fetchTransactions;
  });

  useEffect(() => {
    const handleUpdate = () => {
      setSearch('');
      setType('All');
      setCategory('');
      setQuickFilter('');
      setSortBy('date');
      setSortOrder('desc');
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
    if (routerLocation.pathname === '/transactions') {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.pathname, search, type, category, quickFilter, sortBy, sortOrder]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Math.abs(parseFloat(amount));
    const signedAmount = txnType === 'Expense' || txnType === 'Gambling' ? -numAmount : numAmount;

    // Parse comma-separated tags into JSON array string
    const tagsArr = tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    // Format items into note field
    let finalNotes = notes;
    if (txnType !== 'Transfer' && items.length > 0) {
      const itemsText = items.map(item => `- ${item.name}: ₹${item.price}`).join('\n');
      finalNotes = `Items:\n${itemsText}\n\n${notes}`.trim();
    }

    const apiHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000';
    const receiptsPayload = (txnType === 'Expense' || txnType === 'Gambling') && receiptImageName 
      ? [`${apiHost}/uploads/${receiptImageName}`] 
      : [];

    try {
      if (editingTxn) {
        await axios.put(`/api/transactions/${editingTxn.id}`, {
          description: desc,
          amount: signedAmount,
          type: txnType,
          category: txnType === 'Transfer' ? 'Money Transfers' : cat,
          subcategory: txnType === 'Transfer' ? subcat : 'General',
          paymentMethod: pm,
          account: acc,
          notes: finalNotes,
          tags: tagsArr,
          date,
          
          // Better UX Fields
          merchantName: txnType === 'Transfer' || txnType === 'Income' ? '' : merchantName,
          location: txnType === 'Transfer' || txnType === 'Income' ? '' : location,
          splitTransaction: txnType === 'Transfer' || txnType === 'Income' ? '' : splitTransaction,
          favorite: txnType === 'Transfer' ? false : favorite,
          receipts: receiptsPayload
        });
      } else {
        await axios.post('/api/transactions', {
          description: desc,
          amount: signedAmount,
          type: txnType,
          category: txnType === 'Transfer' ? 'Money Transfers' : cat,
          subcategory: txnType === 'Transfer' ? subcat : 'General',
          paymentMethod: pm,
          account: acc,
          notes: finalNotes,
          tags: tagsArr,
          date,

          // Better UX Fields
          merchantName: txnType === 'Transfer' || txnType === 'Income' ? '' : merchantName,
          location: txnType === 'Transfer' || txnType === 'Income' ? '' : location,
          splitTransaction: txnType === 'Transfer' || txnType === 'Income' ? '' : splitTransaction,
          favorite: txnType === 'Transfer' ? false : favorite,
          receipts: receiptsPayload
        });
      }
      setModalOpen(false);
      resetForm();
      fetchTransactions();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Submission failed.');
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingTxn(t);
    setDesc(t.description);
    setAmount(String(Math.abs(t.amount)));
    
    // Fallback safe mappings
    const mappedType = (t.transactionType || 'Expense') as any;
    setTxnType(mappedType);
    
    const catName = t.category ? (typeof t.category === 'object' ? t.category.name : t.category) : 'Miscellaneous';
    setCat(catName);
    
    setSubcat(t.subcategory || '');
    setPm(t.paymentMethod || 'UPI');
    setAcc(t.accountId || t.account || 'SBI');
    
    // Parse items from notes
    const { items: parsedItems, cleanNotes } = parseItemsFromNotes(t.note || '');
    setItems(parsedItems);
    setNotes(cleanNotes);
    
    // Parse tags JSON safely
    let parsedTags = '';
    if (t.tags) {
      try {
        const arr = JSON.parse(t.tags);
        if (Array.isArray(arr)) parsedTags = arr.join(', ');
        else parsedTags = String(t.tags);
      } catch {
        parsedTags = String(t.tags);
      }
    }
    setTags(parsedTags);

    const dateVal = t.transactionDate || (t as any).date;
    setDate(dateVal ? dateVal.split('T')[0] : new Date().toISOString().split('T')[0]);

    // Better UX fields
    setMerchantName(t.merchantName || '');
    setLocation(t.location || '');
    setSplitTransaction(t.splitTransaction || '');
    setFavorite(Boolean(t.favorite));

    // Load receipts
    if (t.receipts && t.receipts.length > 0) {
      setReceiptImageName(t.receipts[0].fileName);
    } else {
      setReceiptImageName('');
    }

    setIsDirty(false);

    setModalOpen(true);
  };

  const handleDuplicate = (t: Transaction) => {
    setEditingTxn(null);
    setDesc(`${t.description} (Copy)`);
    setAmount(String(Math.abs(t.amount)));
    
    const mappedType = (t.transactionType || 'Expense') as any;
    setTxnType(mappedType);

    const catName = t.category ? (typeof t.category === 'object' ? t.category.name : t.category) : 'Miscellaneous';
    setCat(catName);

    setSubcat(t.subcategory || '');
    setPm(t.paymentMethod || 'UPI');
    setAcc(t.accountId || t.account || 'SBI');

    // Parse items from notes
    const { items: parsedItems, cleanNotes } = parseItemsFromNotes(t.note || '');
    setItems(parsedItems);
    setNotes(cleanNotes);

    let parsedTags = '';
    if (t.tags) {
      try {
        const arr = JSON.parse(t.tags);
        if (Array.isArray(arr)) parsedTags = arr.join(', ');
        else parsedTags = String(t.tags);
      } catch {
        parsedTags = String(t.tags);
      }
    }
    setTags(parsedTags);
    setDate(new Date().toISOString().split('T')[0]);

    // Better UX fields
    setMerchantName(t.merchantName || '');
    setLocation(t.location || '');
    setSplitTransaction(t.splitTransaction || '');
    setFavorite(Boolean(t.favorite));

    // Load receipts
    if (t.receipts && t.receipts.length > 0) {
      setReceiptImageName(t.receipts[0].fileName);
    } else {
      setReceiptImageName('');
    }

    setIsDirty(false);

    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await axios.delete(`/api/transactions/${id}`);
      fetchTransactions();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} transactions?`)) return;
    try {
      await axios.delete('/api/transactions', { data: { ids: selectedIds } });
      setSelectedIds([]);
      fetchTransactions();
      dispatchTransactionUpdate();
    } catch (err) {
      alert('Bulk delete failed.');
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setEditingTxn(null);
    setDesc('');
    setAmount('');
    setTxnType('Expense');
    setCat('Eating Out/Ordering In');
    setSubcat('');
    setPm('UPI');
    setAcc('SBI');
    setNotes('');
    setTags('');
    setDate(new Date().toISOString().split('T')[0]);
    setMerchantName('');
    setLocation('');
    setSplitTransaction('');
    setFavorite(false);
    setIsDirty(false);
  };

  const renderTransactionTile = (t: Transaction, showFullDate: boolean) => {
    const isExpense = t.amount < 0;
    const isSelected = selectedIds.includes(t.id);
    const dateVal = t.transactionDate || (t as any).date;
    const catObj = t.category || { name: 'Miscellaneous', color: '#6b7280' };

    const tType = (t.transactionType || 'Expense').toUpperCase();
    const colorClasses = tType === 'INCOME'
      ? (isSelected 
          ? 'bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-500 text-emerald-950 dark:text-emerald-200' 
          : 'bg-emerald-50/15 dark:bg-emerald-950/10 border-emerald-100/70 dark:border-emerald-900/20 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200')
      : tType === 'TRANSFER'
      ? (isSelected 
          ? 'bg-slate-100 dark:bg-zinc-900 border-slate-550 text-slate-800 dark:text-slate-200' 
          : 'bg-slate-50 dark:bg-zinc-950/45 border-slate-200 dark:border-zinc-900 hover:bg-slate-100/50 dark:hover:bg-zinc-900/30 text-slate-800 dark:text-slate-200')
      : (isSelected 
          ? 'bg-rose-50/40 dark:bg-rose-950/25 border-rose-500 text-rose-950 dark:text-rose-200' 
          : 'bg-rose-50/15 dark:bg-rose-950/10 border-rose-100/70 dark:border-rose-900/20 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-rose-950 dark:text-rose-200');

    const formattedTime = dateVal ? new Date(dateVal).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
    const dateDisplay = showFullDate ? `${formattedDate}, ${formattedTime}` : formattedTime;

    return (
      <div
        key={t.id}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName === 'INPUT') return;
          handleEdit(t);
        }}
        className={`p-3.5 border rounded-2xl flex items-center justify-between transition-all select-none cursor-pointer hover:border-indigo-500/50 ${colorClasses}`}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleCheckboxChange(t.id)}
            className="cursor-pointer rounded border-slate-300 dark:border-slate-700 text-black focus:ring-black"
          />
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
              <span className="text-[8.5px] font-extrabold text-slate-455 uppercase shrink-0">
                {dateDisplay}
              </span>
              <span
                className="inline-block px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase shrink-0"
                style={{ backgroundColor: `${catObj.color}15`, color: catObj.color }}
              >
                {catObj.name}
              </span>
              {t.merchantName && (
                <span className="text-[8px] font-black text-indigo-400 uppercase truncate">
                  @{t.merchantName}
                </span>
              )}
            </div>
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 mt-1 truncate max-w-[150px]">
              {t.description}
            </h4>
            {(() => {
              const { items: listItems } = parseItemsFromNotes(t.note || '');
              if (listItems.length === 0) return null;
              return (
                <div className="mt-1 flex flex-wrap gap-1">
                  {listItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-1 py-0.5 rounded text-[8px] bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-medium"
                    >
                      {item.name}: ₹{item.price}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <span className={`font-black text-xs font-sans ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
            {isExpense ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    );
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const txDate = t.transactionDate || (t as any).date;
      if (!txDate) return false;
      const dateObj = new Date(txDate);
      return dateObj.getMonth() === selectedMonth && dateObj.getFullYear() === selectedYear;
    });
  };

  const filteredTxns = getFilteredTransactions();
  const displayTxns = selectedDay !== null
    ? filteredTxns.filter(t => {
        const dayDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const txDate = t.transactionDate || (t as any).date;
        return txDate && txDate.startsWith(dayDateStr);
      })
    : filteredTxns;

  const totalIncome = filteredTxns
    .filter(t => (t.transactionType || '').toUpperCase() === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTxns
    .filter(t => (t.transactionType || '').toUpperCase() === 'EXPENSE' || (t.transactionType || '').toUpperCase() === 'GAMBLING')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netMonth = totalIncome - totalExpense;

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDayOffset = getFirstDayOffset(selectedMonth, selectedYear);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(i);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-16 select-none text-black dark:text-white">
      {/* Top Header Row with Switcher & Segmented Control */}
      <div className="flex items-center space-x-2">
        {/* 3-button segmented control in place of search */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800 flex-1 select-none">
          {[
            { value: '', label: 'All' },
            { value: 'Expense', label: 'Expenses' },
            { value: 'Income', label: 'Income' }
          ].map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => setType(item.value)}
              className={`flex-1 text-center py-1.5 text-[8.5px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                type === item.value
                  ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm'
                  : 'text-slate-405 hover:text-slate-650 dark:text-zinc-500 dark:hover:text-zinc-305'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1.5 text-[8.5px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-650 dark:text-zinc-500 dark:hover:text-zinc-350'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-2.5 py-1.5 text-[8.5px] font-extrabold uppercase rounded-lg transition-colors cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-655 dark:text-zinc-500 dark:hover:text-zinc-350'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* 3-Month Column Selector Header (Text list with bottom selection highlight) */}
      <div className="flex items-center justify-around bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 p-2.5 rounded-2xl select-none">
        {getThreeMonths().map((mInfo, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSelectedMonth(mInfo.month);
              setSelectedYear(mInfo.year);
            }}
            className={`px-1 py-1 text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
              mInfo.isSelected
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white font-black scale-105'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-650 dark:hover:text-zinc-350'
            }`}
          >
            {mInfo.name} {mInfo.year}
          </button>
        ))}
      </div>

      {/* Monthly Summary Little Text Block */}
      <div className="flex items-center justify-between px-2 text-[9px] uppercase font-black tracking-wider text-slate-450 dark:text-zinc-550 select-none">
        <div>
          Inflow <span className="text-emerald-500 ml-1">₹{totalIncome.toLocaleString('en-IN')}</span>
        </div>
        <div>
          Outflow <span className="text-rose-500 ml-1">₹{totalExpense.toLocaleString('en-IN')}</span>
        </div>
        <div>
          Net <span className={`${netMonth >= 0 ? 'text-emerald-500' : 'text-rose-500'} ml-1`}>
            {netMonth >= 0 ? '+' : ''}₹{netMonth.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Calendar Grid Container (Visible only in Calendar View) */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-3xl p-3.5 space-y-3 shadow-sm select-none animate-fadeIn">
          {/* Weekdays Header */}
          <div className="grid grid-cols-7 text-center text-[7.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-rows-5 gap-y-1.5 border-t border-slate-100 dark:border-zinc-800/60 pt-2.5">
            {rows.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-7 gap-x-1.5">
                {row.map((dayNum, cIdx) => {
                  if (dayNum === null) {
                    return <div key={cIdx} className="aspect-square bg-transparent rounded-xl" />;
                  }

                  const isToday =
                    new Date().getDate() === dayNum &&
                    new Date().getMonth() === selectedMonth &&
                    new Date().getFullYear() === selectedYear;

                  const isSelected = selectedDay === dayNum;
                  const { net } = getDayDetails(dayNum);

                  let amtColorClass = 'text-slate-400 dark:text-zinc-650';
                  if (net > 0) amtColorClass = 'text-emerald-500 dark:text-emerald-400 font-bold';
                  else if (net < 0) amtColorClass = 'text-rose-500 dark:text-rose-400 font-bold';

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => {
                        if (selectedDay === dayNum) {
                          setSelectedDay(null);
                        } else {
                          setSelectedDay(dayNum);
                        }
                      }}
                      className={`aspect-square p-0.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between items-center ${
                        isSelected
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105'
                          : isToday
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/30'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border-transparent'
                      }`}
                    >
                      <span className="text-[9px] font-extrabold">{dayNum}</span>
                      <span className={`text-[7px] uppercase tracking-tighter ${isSelected ? 'text-white/80 dark:text-black/85 font-bold' : amtColorClass}`}>
                        {net !== 0 ? formatCompactAmount(net) : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Day Filters Info Row */}
      {selectedDay !== null && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/40 px-3 py-1.5 rounded-2xl animate-fadeIn select-none">
          <span className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400">
            Showing logs for {selectedDay} {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-[9px] font-black text-rose-500 hover:underline cursor-pointer"
          >
            Show All Month
          </button>
        </div>
      )}

      {/* MOBILE LIST OF NATIVE TRANSACTION CARDS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-slate-400 font-semibold">Filtering ledgers...</span>
        </div>
      ) : displayTxns.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-[10px] font-semibold space-y-1">
          <AlertCircle className="w-6 h-6 mx-auto text-slate-350" />
          <p>No transaction history matched.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(() => {
            if (sortBy === 'date') {
              // Group transactions sequentially by date, preserving backend sorted order
              const groups: { dateStr: string; list: Transaction[] }[] = [];
              displayTxns.forEach(t => {
                const dateVal = t.transactionDate || (t as any).date;
                const dateStr = dateVal 
                  ? new Date(dateVal).toISOString().split('T')[0] 
                  : 'no-date';
                
                let lastGroup = groups[groups.length - 1];
                if (lastGroup && lastGroup.dateStr === dateStr) {
                  lastGroup.list.push(t);
                } else {
                  groups.push({ dateStr, list: [t] });
                }
              });

              return groups.map(({ dateStr, list }) => {
                const formattedDate = dateStr === 'no-date'
                  ? 'No Date Specified'
                  : new Date(dateStr).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    });

                return (
                  <div key={dateStr} className="space-y-2.5">
                    {/* BEAUTIFUL LINE BREAK AND DATE HEADER */}
                    <div className="flex items-center space-x-2 pt-3 pb-1 border-b border-slate-100 dark:border-zinc-900/60 select-none">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#2fb09b] dark:text-[#2fb09b]/80 shrink-0">
                        {formattedDate}
                      </span>
                      <div className="h-[1px] bg-slate-205 dark:bg-zinc-800/80 flex-1" />
                      <span className="text-[8px] font-black uppercase text-slate-400 shrink-0">
                        {list.length} {list.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* TRANSACTION TILES GROUP */}
                    <div className="space-y-2.5">
                      {list.map(t => renderTransactionTile(t, false))}
                    </div>
                  </div>
                );
              });
            } else {
              // Flat list of transactions when sorting by amount or description
              return (
                <div className="space-y-2.5">
                  {displayTxns.map(t => renderTransactionTile(t, true))}
                </div>
              );
            }
          })()}
        </div>
      )}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-black text-white dark:bg-white dark:text-black py-2 px-4 rounded-full shadow-premium flex items-center space-x-3 border border-slate-800 dark:border-slate-200 animate-slideUp">
          <span className="text-[10px] font-bold uppercase">{selectedIds.length} Checked</span>
          <button
            onClick={handleBulkDelete}
            className="py-1 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-[9px] text-slate-455 hover:text-white dark:hover:text-black font-semibold"
          >
            Clear
          </button>
        </div>
      )}

      {/* MANUAL ENTRY MODAL (Redesigned matching premium white Chat Customizer Card) */}
      {modalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
          
          <div className={`relative w-full max-w-[340px] bg-white dark:bg-[#18181b] text-[#122325] dark:text-zinc-200 rounded-[24px] p-5 shadow-xl space-y-4 animate-fadeIn border-l-[6px] border-b-[6px] max-h-[520px] overflow-y-auto scrollbar-none ${
            txnType === 'Income'
              ? 'border-[#2fb09b]'
              : txnType === 'Transfer'
              ? 'border-slate-800 dark:border-zinc-700'
              : 'border-[#f56565]'
          }`}>
            {/* Top Close icon */}
            {!isDirty && (
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModalAdvancedOpen(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-black hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Title */}
            <h3 className="font-black text-[9px] uppercase tracking-wider text-slate-450 dark:text-zinc-500">
              {editingTxn ? 'EDIT TRANSACTION' : 'NEW ENTRY'}
            </h3>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-xs font-semibold">
              
              {/* Top Description Input (Borderless & bold) */}
              <div className="text-[11.5px] font-bold text-slate-750 dark:text-zinc-300 leading-tight">
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={e => { setDesc(e.target.value); setIsDirty(true); }}
                  placeholder={txnType === 'Transfer' ? 'e.g. HDFC to SBI' : 'Description...'}
                  className="w-full bg-transparent border-none outline-none font-bold text-slate-800 dark:text-zinc-100 focus:ring-0 p-0"
                />
              </div>

              {/* Date and Amount Row */}
              <div className="flex justify-between items-center py-1">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Date</span>
                  <CustomDatePicker
                    value={date}
                    onChange={val => { setDate(val); setIsDirty(true); }}
                  />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Amount</span>
                  <div className="flex items-center">
                    <span className="text-[15px] font-black text-slate-800 dark:text-zinc-300 mr-0.5">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setIsDirty(true); }}
                      className="w-20 text-right bg-transparent border-none outline-none font-black text-[16px] text-slate-800 dark:text-zinc-100 focus:ring-0 p-0"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Dashed Box Container enclosing Type and Category selectors */}
              <div className={`border-2 border-dashed p-3 rounded-xl grid grid-cols-2 gap-2.5 ${
                txnType === 'Income'
                  ? 'border-[#2fb09b]/60'
                  : txnType === 'Transfer'
                  ? 'border-slate-400'
                  : 'border-[#f56565]/60'
              }`}>
                {/* Type Box */}
                <div className="space-y-0.5 relative">
                  <span className="text-[8px] uppercase font-extrabold text-slate-400">Type</span>
                  <button
                    type="button"
                    onClick={() => {
                      setModalTypeDropdownOpen(prev => !prev);
                      setModalCatDropdownOpen(false);
                    }}
                    className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-zinc-800 flex items-center justify-between text-[10px] font-extrabold outline-none cursor-pointer text-slate-700 dark:text-zinc-300"
                  >
                    <div className="flex items-center space-x-1">
                      {txnType === 'Income' ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/25 flex items-center justify-center shrink-0">
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black">↓</span>
                        </div>
                      ) : txnType === 'Transfer' ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                          <span className="text-[9px] text-slate-650 dark:text-zinc-400 font-black">⇄</span>
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-100 dark:bg-rose-950/25 flex items-center justify-center shrink-0">
                          <span className="text-[9px] text-rose-600 dark:text-rose-450 font-black">↑</span>
                        </div>
                      )}
                      <span className={
                        txnType === 'Income'
                          ? 'text-[#2fb09b]'
                          : txnType === 'Transfer'
                          ? 'text-slate-700 dark:text-zinc-300'
                          : 'text-[#f56565]'
                      }>{txnType}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>
                  
                  {modalTypeDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-50 animate-slideUp text-[9px] font-bold text-slate-700 dark:text-zinc-300">
                      {['Expense', 'Income', 'Transfer', 'Gambling'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setTxnType(type as any);
                            setModalTypeDropdownOpen(false);
                            setIsDirty(true);
                            if (type === 'Income') {
                              setCat('Salary');
                            } else if (type === 'Transfer') {
                              setCat('Money Transfers');
                            } else {
                              setCat('Eating Out/Ordering In');
                            }
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[9px] font-bold flex items-center justify-between text-slate-700 dark:text-zinc-300 transition-colors"
                        >
                          <span>{type}</span>
                          {txnType === type && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Box */}
                <div className="space-y-0.5 relative">
                  <span className="text-[8px] uppercase font-extrabold text-slate-400">Category</span>
                  <button
                    type="button"
                    onClick={() => {
                      setModalCatDropdownOpen(prev => !prev);
                      setModalTypeDropdownOpen(false);
                    }}
                    className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] font-extrabold outline-none cursor-pointer text-slate-705 dark:text-zinc-300"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-[10px] shrink-0">{getCategoryEmoji(cat)}</span>
                      <span className="truncate">{cat}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Your Tags Section */}
              {txnType !== 'Transfer' && (
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Your tags</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(() => {
                      const tagArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                      return (
                        <>
                          {tagArray.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-350 text-[10px] font-bold border border-slate-200 dark:border-zinc-700"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = tagArray.filter((_, i) => i !== idx).join(', ');
                                  setTags(newTags);
                                  setIsDirty(true);
                                }}
                                className="hover:text-red-500 font-bold transition text-[9px] ml-1 shrink-0"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          
                          {showAddTagInput ? (
                            <input
                              type="text"
                              autoFocus
                              placeholder="Add tag..."
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value.trim().toLowerCase();
                                  if (val) {
                                    const newTags = [...tagArray, val].join(', ');
                                    setTags(newTags);
                                    setIsDirty(true);
                                  }
                                  setShowAddTagInput(false);
                                } else if (e.key === 'Escape') {
                                  setShowAddTagInput(false);
                                }
                              }}
                              onBlur={() => setShowAddTagInput(false)}
                              className="px-2 py-0.5 rounded-full border border-[#2fb09b] text-[10px] outline-none w-16 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 font-bold"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowAddTagInput(true)}
                              className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-slate-650 dark:text-zinc-350 transition"
                            >
                              +
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Collapsible Advanced Parameters Toggle */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalAdvancedOpen(prev => !prev)}
                  className="text-[9px] uppercase tracking-wider text-[#2fb09b] font-black hover:underline flex items-center space-x-1"
                >
                  <span>{modalAdvancedOpen ? 'Hide Advanced Details' : 'Show Advanced Details'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${modalAdvancedOpen ? 'rotate-180' : ''}`} />
                </button>

                {modalAdvancedOpen && (
                  <div className="space-y-3 pt-3 text-[9px] font-bold animate-slideDown">
                    
                    {/* Payment details and Account / Transfer details */}
                    {txnType === 'Transfer' ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-400">From Account</span>
                          <input
                            type="text"
                            required
                            value={acc}
                            onChange={e => { setAcc(e.target.value); setIsDirty(true); }}
                            placeholder="SBI Source"
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-[8.5px] text-slate-700 dark:text-zinc-300"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-400">To Account</span>
                          <input
                            type="text"
                            required
                            value={subcat}
                            onChange={e => { setSubcat(e.target.value); setIsDirty(true); }}
                            placeholder="HDFC Destination"
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-[8.5px] text-slate-700 dark:text-zinc-300"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-400">
                            {txnType === 'Income' ? 'Deposit Into' : 'Account'}
                          </span>
                          <input
                            type="text"
                            required
                            value={acc}
                            onChange={e => { setAcc(e.target.value); setIsDirty(true); }}
                            placeholder="SBI"
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-[8.5px] text-slate-700 dark:text-zinc-300"
                          />
                        </div>
                        
                        <div className="space-y-0.5 relative">
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-400">Method</span>
                          <button
                            type="button"
                            onClick={() => {
                              setModalPmDropdownOpen(prev => !prev);
                            }}
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[8.5px] font-bold outline-none cursor-pointer text-slate-700 dark:text-zinc-300"
                          >
                            <span>{pm}</span>
                            <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                          </button>
                          
                          {modalPmDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 rounded-xl shadow-xl max-h-32 overflow-y-auto scrollbar-none py-1 z-55 animate-slideUp text-[8.5px] font-bold text-slate-700 dark:text-zinc-300">
                              {['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'].map(method => (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => {
                                    setPm(method);
                                    setModalPmDropdownOpen(false);
                                    setIsDirty(true);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[8.5px] font-bold flex items-center justify-between text-slate-700 dark:text-zinc-300 transition-colors"
                                >
                                  <span>{method}</span>
                                  {pm === method && <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Merchant & Location details */}
                    {txnType !== 'Transfer' && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-400 flex items-center space-x-0.5">
                            <Plus className="w-2.5 h-2.5 text-slate-405" />
                            <span>Merchant</span>
                          </span>
                          <input
                            type="text"
                            value={merchantName}
                            onChange={e => { setMerchantName(e.target.value); setIsDirty(true); }}
                            placeholder="e.g. Dominos"
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-slate-700 dark:text-zinc-300"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-400 flex items-center space-x-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-405" />
                            <span>Location</span>
                          </span>
                          <input
                            type="text"
                            value={location}
                            onChange={e => { setLocation(e.target.value); setIsDirty(true); }}
                            placeholder="e.g. Karimpur"
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none text-slate-700 dark:text-zinc-300"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notes text logs */}
                    <div className="space-y-0.5">
                      <span className="text-[7.5px] uppercase font-extrabold text-slate-400">Notes Log</span>
                      <textarea
                        value={notes}
                        onChange={e => { setNotes(e.target.value); setIsDirty(true); }}
                        placeholder="Additional details..."
                        rows={2}
                        className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 outline-none resize-none text-slate-700 dark:text-zinc-300 font-bold"
                      />
                    </div>

                    {/* Receipt Attachment & Split lists */}
                    {(txnType === 'Expense' || txnType === 'Gambling') && (
                      <div className="space-y-3.5 pt-2 border-t border-slate-100">
                        {/* Receipt Attachment File */}
                        <div className="space-y-1">
                          <input
                            type="file"
                            id="modal-receipt-uploader"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const fileObj = e.target.files[0];
                                setReceiptImageName(fileObj.name);
                                setIsDirty(true);
                              }
                            }}
                          />
                          <span className="text-[7.5px] uppercase font-extrabold text-slate-450 flex items-center space-x-0.5">
                            <Paperclip className="w-3 h-3 text-slate-455" />
                            <span>Receipt Attachment</span>
                          </span>
                          {receiptImageName ? (
                            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-500/5 text-[9px] font-bold text-indigo-500 max-w-full truncate">
                              <span className="truncate max-w-[200px]">{receiptImageName}</span>
                              <button
                                type="button"
                                onClick={() => { setReceiptImageName(''); setIsDirty(true); }}
                                className="text-rose-500 hover:text-rose-600 ml-1.5 shrink-0"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor="modal-receipt-uploader"
                              className="w-full px-2.5 py-2 text-[10px] rounded-xl border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center space-x-1 cursor-pointer font-bold outline-none text-slate-500 dark:text-zinc-400"
                            >
                              <span>Upload File</span>
                            </label>
                          )}
                        </div>

                        {/* Split Log Items list */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[7.5px] uppercase font-extrabold text-slate-400">
                            <span>Log Items list ({items.length})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setItems(prev => [...prev, { name: 'New Item', price: 0 }]);
                                setIsDirty(true);
                              }}
                              className="text-[#2fb09b] hover:underline flex items-center space-x-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Add Item</span>
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-none pr-1">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-center space-x-1.5">
                                <input
                                  type="text"
                                  required
                                  value={item.name}
                                  onChange={e => {
                                    const updated = items.map((it, i) => i === idx ? { ...it, name: e.target.value } : it);
                                    setItems(updated);
                                    setIsDirty(true);
                                  }}
                                  placeholder="Product"
                                  className="flex-[2] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-955/20 border border-slate-200 dark:border-zinc-800 outline-none text-[8.5px] text-slate-700 dark:text-zinc-300"
                                />
                                <input
                                  type="number"
                                  required
                                  value={item.price || ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = items.map((it, i) => i === idx ? { ...it, price: val } : it);
                                    setItems(updated);
                                    setIsDirty(true);
                                    const newSum = updated.reduce((sum, it) => sum + it.price, 0);
                                    setAmount(String(newSum));
                                  }}
                                  placeholder="0.00"
                                  className="flex-[1] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-955/20 border border-slate-200 dark:border-zinc-800 outline-none text-[8.5px] font-bold text-slate-700 dark:text-zinc-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = items.filter((_, i) => i !== idx);
                                    setItems(updated);
                                    setIsDirty(true);
                                    const newSum = updated.reduce((sum, it) => sum + it.price, 0);
                                    setAmount(String(newSum));
                                  }}
                                  className="text-slate-400 hover:text-rose-500 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Star, Commit / Cancel */}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-1">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => { setFavorite(prev => !prev); setIsDirty(true); }}
                    className="p-1.5 hover:bg-slate-50 rounded-full transition"
                  >
                    <Star className={`w-4.5 h-4.5 transition ${favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-amber-400'}`} />
                  </button>
                  {editingTxn && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleDuplicate(editingTxn);
                        }}
                        className="px-2.5 py-1 text-[9px] font-bold border border-slate-200 hover:bg-slate-100 rounded-lg transition text-slate-705 dark:text-zinc-350 dark:border-zinc-800"
                        title="Duplicate"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalOpen(false);
                          handleDelete(editingTxn.id);
                        }}
                        className="px-2.5 py-1 text-[9px] font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    className="p-1.5 hover:bg-slate-50 rounded-full transition text-slate-500 hover:text-emerald-500 flex items-center space-x-1"
                    title="Save Changes"
                  >
                    <Pencil className="w-4 h-4 text-slate-500 hover:text-slate-850" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setModalAdvancedOpen(false);
                      resetForm();
                    }}
                    className="p-1.5 hover:bg-slate-50 rounded-full transition text-slate-400 hover:text-rose-500"
                    title="Cancel"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) overlay */}
      <button
        type="button"
        onClick={() => { resetForm(); setModalOpen(true); }}
        className="absolute bottom-20 right-4 w-12 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 shadow-lg border dark:border-white/10"
        title="Add Transaction"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Category bottom sheet overlay */}
      {modalCatDropdownOpen && (
        <div className="absolute inset-0 z-[60] bg-black/45 backdrop-blur-xs flex flex-col justify-end select-none animate-fadeIn">
          {/* Click outside to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setModalCatDropdownOpen(false)} />
          
          {/* Sliding Sheet */}
          <div className="w-full bg-white dark:bg-[#18181b] border-t border-slate-200 dark:border-zinc-800 rounded-t-[28px] p-5 shadow-2xl flex flex-col max-h-[70%] animate-slideUp">
            {/* Pull bar indicator */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0" />
            
            {/* Title */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-zinc-500">
                Select Category ({txnType})
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
              {(txnType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => {
                const isSelected = cat === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCat(c);
                      setModalCatDropdownOpen(false);
                      setIsDirty(true);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md scale-105'
                        : 'bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 border-transparent text-slate-700 dark:text-zinc-350'
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

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PiggyBank,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  month: number;
  year: number;
}

const CATEGORIES = [
  'Food', 'Shopping', 'Transportation', 'Utilities', 'Healthcare',
  'Entertainment', 'Investment', 'Salary', 'Education', 'Rent', 'Insurance', 'Miscellaneous'
];

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/budgets', {
        params: { month, year }
      });
      setBudgets(res.data);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    try {
      await axios.post('/api/budgets', {
        category,
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year)
      });
      setModalOpen(false);
      setAmount('');
      fetchBudgets();
    } catch (err) {
      alert('Failed to set budget limit.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this budget cap?')) return;
    try {
      await axios.delete(`/api/budgets/${id}`);
      fetchBudgets();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-16 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
        <div>
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">Spending limits</span>
          <h1 className="text-xl font-black font-sans leading-none mt-1">BUDGETS</h1>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="py-1.5 px-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-extrabold uppercase"
        >
          Set Cap
        </button>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 p-3 rounded-2xl flex items-center justify-between text-[10px] font-bold">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-transparent outline-none cursor-pointer text-slate-500 hover:text-black dark:hover:text-white"
        >
          {Array.from({ length: 12 }, (_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {new Date(2000, idx).toLocaleString('default', { month: 'short' })}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="bg-transparent outline-none cursor-pointer text-slate-500 hover:text-black dark:hover:text-white"
        >
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </select>
      </div>

      {/* BUDGET CARDS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-slate-400 font-semibold">Auditing budgets limits...</span>
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-[10px] font-semibold bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
          <PiggyBank className="w-6 h-6 mx-auto text-slate-350" />
          <p>No active budget limits established.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const ratio = b.spentAmount / b.limitAmount;
            const percent = Math.min(100, ratio * 100);

            // Stark warning highlights
            let barColor = 'bg-slate-300 dark:bg-slate-700';
            let borderStyle = 'border-slate-200 dark:border-slate-900';
            let textStyle = 'text-slate-500';
            let badgeBg = 'bg-slate-100 dark:bg-slate-950';
            let warningFlag = false;

            if (ratio >= 1.0) {
              barColor = 'bg-black dark:bg-white animate-pulse';
              borderStyle = 'border-black dark:border-white';
              textStyle = 'text-rose-500';
              badgeBg = 'bg-rose-50 dark:bg-rose-950/20';
              warningFlag = true;
            } else if (ratio >= 0.8) {
              barColor = 'bg-slate-800 dark:bg-slate-200';
              textStyle = 'text-amber-500 font-bold';
              badgeBg = 'bg-amber-50 dark:bg-amber-950/20';
              warningFlag = true;
            }

            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-black border ${borderStyle} rounded-2xl p-4 shadow-sm space-y-3`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-xs">{b.category}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold font-sans text-slate-500">
                    <span>Spent: ₹{b.spentAmount.toFixed(0)}</span>
                    <span className="text-slate-400">/ ₹{b.limitAmount.toFixed(0)}</span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border dark:border-slate-900">
                    <div
                      className={`h-full rounded-full transition-all duration-350 ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeBg} ${textStyle}`}>
                    {percent.toFixed(0)}% Used
                  </span>
                  {warningFlag && (
                    <div className="flex items-center space-x-1 text-[9px] text-rose-500 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{ratio >= 1.0 ? 'Over limit!' : 'Approaching cap'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE BUDGET MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
          <div className="w-full max-w-[340px] bg-white dark:bg-black rounded-3xl p-5 shadow-premium border border-slate-200 dark:border-slate-800 relative">
            <h3 className="font-black text-sm mb-3">SET CATEGORY LIMIT</h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-400">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-400">Budget Limit (₹)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none font-bold"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-105 text-white dark:text-black rounded-xl font-bold text-[10px]"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

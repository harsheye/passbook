import React, { useEffect, useState } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Plus,
  Coins,
  ShieldCheck,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface Platform {
  id: string;
  name: string;
  websiteUrl: string;
  currency: string;
  status: string;
  balance: number;
}

interface GamblingEntry {
  id: string;
  platform: { name: string };
  transactionType: string;
  amount: number;
  date: string;
  description: string;
  category: string;
}

interface GamblingAnalytics {
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalBonuses: number;
    totalBets: number;
    totalWins: number;
    totalLosses: number;
    currentBalance: number;
    netProfit: number;
    roi: number;
  };
  plTimeline: any[];
  platformMetrics: any[];
  insights: string[];
}

export const Gambling: React.FC = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [entries, setEntries] = useState<GamblingEntry[]>([]);
  const [analytics, setAnalytics] = useState<GamblingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Platforms form
  const [platformModal, setPlatformModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pUrl, setPUrl] = useState('');
  const [pBalance, setPBalance] = useState('');

  // Entries form
  const [entryModal, setEntryModal] = useState(false);
  const [ePlatformId, setEPlatformId] = useState('');
  const [eType, setEType] = useState('BET_WON');
  const [eAmount, setEAmount] = useState('');
  const [eCat, setECat] = useState('Sports Betting');
  const [eDesc, setEDesc] = useState('');

  // AI Prompts
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');

  const fetchGamblingData = async () => {
    setLoading(true);
    try {
      const [platRes, entRes, alyRes] = await Promise.all([
        axios.get('/api/gambling/platforms'),
        axios.get('/api/gambling/entries'),
        axios.get('/api/gambling/analytics')
      ]);
      setPlatforms(platRes.data);
      setEntries(entRes.data);
      setAnalytics(alyRes.data);
      
      if (platRes.data.length > 0) {
        setEPlatformId(platRes.data[0].id);
      }
    } catch (err) {
      setError('Admin privilege check failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGamblingData();
  }, []);

  const handleCreatePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName) return;

    try {
      await axios.post('/api/gambling/platforms', {
        name: pName, websiteUrl: pUrl, balance: parseFloat(pBalance || '0.0')
      });
      setPlatformModal(false);
      setPName(''); setPUrl(''); setPBalance('');
      fetchGamblingData();
    } catch (err) {
      alert('Platform creation failed.');
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ePlatformId || !eAmount) return;

    try {
      await axios.post('/api/gambling/entries', {
        platformId: ePlatformId, transactionType: eType, amount: parseFloat(eAmount),
        category: eCat, description: eDesc
      });

      if (eType === 'BET_WON') {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      }

      setEntryModal(false);
      setEAmount(''); setEDesc('');
      fetchGamblingData();
    } catch (err) {
      alert('Entry failed.');
    }
  };

  const handleAISmartBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;

    setAiLoading(true);
    setAiSuccess('');

    try {
      const res = await axios.post('/api/gambling/entries/ai', { text: aiText });
      const parsedEntry = res.data.entry;
      setAiSuccess(`Recorded: ${parsedEntry.transactionType}`);
      setAiText('');
      
      if (parsedEntry.transactionType === 'BET_WON') {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      }

      fetchGamblingData();
      setTimeout(() => setAiSuccess(''), 1500);
    } catch (err) {
      alert('AI parsing error. Try e.g. "Won ₹2500 on Stake bet"');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-slate-400 font-bold uppercase">Opening betting ledger...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-950 text-rose-500 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center space-x-2 max-w-sm mx-auto text-xs font-bold text-center flex-col space-y-2">
        <ShieldCheck className="w-6 h-6 text-rose-400" />
        <span>Access Restricted</span>
        <span className="text-[10px] text-slate-400 font-semibold leading-normal">Requires Admin Authorization parameters. Only Admins can audit gambling systems.</span>
      </div>
    );
  }

  const { summary, plTimeline, platformMetrics, insights } = analytics;

  return (
    <div className="space-y-6 animate-fadeIn pb-16 select-none text-black dark:text-white">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
        <div>
          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">System controls</span>
          <h1 className="text-xl font-black font-sans leading-none mt-1">HUB SYSTEM</h1>
        </div>

        <div className="flex space-x-1.5">
          <button
            onClick={() => setPlatformModal(true)}
            className="py-1 px-2 border border-slate-250 dark:border-slate-850 rounded-xl text-[9px] font-bold bg-slate-50 dark:bg-slate-950 uppercase"
          >
            Setup
          </button>
          <button
            onClick={() => setEntryModal(true)}
            className="py-1 px-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-bold uppercase shadow-sm"
          >
            Add Bet
          </button>
        </div>
      </div>

      {/* INLINE AI PROMPT BOX */}
      <form onSubmit={handleAISmartBet} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-3 flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={aiText}
          onChange={e => setAiText(e.target.value)}
          placeholder="Won ₹2500 on IPL betting on Stake..."
          className="flex-1 text-[11px] bg-transparent border-none outline-none placeholder-slate-400 font-semibold text-slate-800 dark:text-slate-100"
          disabled={aiLoading}
        />
        {aiSuccess && (
          <span className="text-[9px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
            {aiSuccess}
          </span>
        )}
        <button
          type="submit"
          className="py-1 px-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-[9px] font-bold uppercase shrink-0"
          disabled={aiLoading || !aiText.trim()}
        >
          Parse
        </button>
      </form>

      {/* METRIC SUMMARIES */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-150 dark:border-slate-900 text-center">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Total Deposits</span>
          <span className="text-sm font-black mt-1 block">₹{summary.totalDeposits.toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-150 dark:border-slate-900 text-center">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Withdrawals</span>
          <span className="text-sm font-black mt-1 block">₹{summary.totalWithdrawals.toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-150 dark:border-slate-900 text-center">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Platform Balance</span>
          <span className="text-sm font-black mt-1 block text-glow text-black dark:text-white">₹{summary.currentBalance.toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-150 dark:border-slate-900 text-center">
          <span className="text-[8px] uppercase font-black text-slate-400 block">Net Profit / Loss</span>
          <span className={`text-sm font-black mt-1 block ${summary.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            ₹{summary.netProfit.toLocaleString('en-IN')}
            <span className="text-[7px] block text-slate-400 font-semibold mt-0.5">ROI: {summary.roi.toFixed(0)}%</span>
          </span>
        </div>
      </div>

      {/* CUSTOM PLATFORMS LEDGERS LIST */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-premium">
        <h3 className="font-extrabold text-xs mb-3 flex items-center space-x-1.5">
          <Coins className="w-4 h-4 text-slate-500" />
          <span>Active Betting Platforms</span>
        </h3>
        
        <div className="space-y-3">
          {platforms.map(p => {
            const match = platformMetrics.find(m => m.name === p.name);
            const net = match ? match.netProfit : 0.0;
            const roiVal = match ? match.roi : 0.0;
            
            return (
              <div key={p.id} className="p-3 border border-slate-150 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/40 rounded-xl flex items-center justify-between text-[10px]">
                <div>
                  <h4 className="font-bold">{p.name}</h4>
                  <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Bal: ₹{p.balance.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className={`font-black ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {net >= 0 ? '+' : ''}₹{net.toFixed(0)}
                  </span>
                  <span className="text-[7px] text-slate-400 font-semibold block mt-0.5">ROI: {roiVal.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* P&L RECHARTS GRAPH */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-premium">
        <div className="mb-4">
          <h3 className="font-extrabold text-xs">Profit & Loss Timeline</h3>
          <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">P&L Curve Winnings</p>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
              <Tooltip formatter={(value) => `₹${value}`} />
              <Line type="monotone" dataKey="profit" stroke="#000000" strokeWidth={2} dot={{ r: 1 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MONOCHROME BAR COMPARISONS */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-premium">
        <div className="mb-4">
          <h3 className="font-extrabold text-xs">Deposits vs Withdrawals</h3>
          <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Flow statistics</p>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformMetrics} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
              <Tooltip formatter={(value) => `₹${value}`} />
              <Bar dataKey="deposits" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="withdrawals" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RECENT BET LOGS */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl shadow-premium overflow-hidden">
        <h3 className="font-extrabold text-xs p-4 border-b border-slate-100 dark:border-slate-900">
          Recent Bet Placed History
        </h3>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-900">
          {entries.slice(0, 5).map(e => {
            const type = e.transactionType;
            const isWon = type === 'BET_WON' || type === 'BONUS' || type === 'CASHBACK';
            
            return (
              <div key={e.id} className="p-3.5 flex items-center justify-between text-[10px] bg-slate-50/20">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black">{e.platform.name}</span>
                    <span className={`inline-block px-1 rounded text-[8px] font-extrabold uppercase ${
                      isWon ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-500' : 'bg-rose-50 dark:bg-rose-950 text-rose-500'
                    }`}>
                      {type.replace('BET_', '')}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold block mt-1 uppercase">
                    {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} | {e.category}
                  </span>
                </div>
                <span className={`font-black ${isWon ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ₹{e.amount.toLocaleString('en-IN')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PLATFORM CONFIG MODAL */}
      {platformModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
          <div className="w-full max-w-[340px] bg-white dark:bg-black rounded-3xl p-5 shadow-premium border border-slate-200 dark:border-slate-800 relative">
            <h3 className="font-black text-sm mb-3">SETUP PLATFORM</h3>

            <form onSubmit={handleCreatePlatform} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-400">Platform Name</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                  placeholder="Stake"
                  className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-400">Ledger Balance (₹)</label>
                <input
                  type="number"
                  value={pBalance}
                  onChange={e => setPBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none font-bold"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlatformModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-black hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-105 text-white dark:text-black rounded-xl font-bold text-[10px]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOKKEEPING ENTRY MODAL */}
      {entryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
          <div className="w-full max-w-[340px] bg-white dark:bg-black rounded-3xl p-5 shadow-premium border border-slate-200 dark:border-slate-800 relative">
            <h3 className="font-black text-sm mb-3">RECORD BET ENTRY</h3>

            <form onSubmit={handleCreateEntry} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-bold text-slate-400">Select Platform</label>
                <select
                  value={ePlatformId}
                  onChange={e => setEPlatformId(e.target.value)}
                  className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-400">Entry Type</label>
                  <select
                    value={eType}
                    onChange={e => setEType(e.target.value)}
                    className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none cursor-pointer"
                  >
                    <option value="BET_WON">Bet Won</option>
                    <option value="BET_LOST">Bet Lost</option>
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAWAL">Withdrawal</option>
                    <option value="BONUS">Bonus</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-bold text-slate-400">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={eAmount}
                    onChange={e => setEAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-1.5 text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEntryModal(false)}
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

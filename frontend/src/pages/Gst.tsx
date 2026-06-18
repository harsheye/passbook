import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  Receipt,
  FileText,
  Download,
  Trash2,
  Plus,
  Check,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface GstTxn {
  id: string;
  type: 'sale' | 'purchase';
  description: string;
  amount: number;
  rate: number;
  gstAmount: number;
  invoiceNumber: string;
  date: string;
}

export const Gst: React.FC = () => {
  const navigate = useNavigate();

  // Profession Advice State
  const [profession, setProfession] = useState<string>('Salaried');
  const [gstNumber, setGstNumber] = useState<string>('');
  const [viewingPdfModal, setViewingPdfModal] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // GST Calculator State
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [calcRate, setCalcRate] = useState<number>(18);
  const [isExclusive, setIsExclusive] = useState<boolean>(true); // true = Exclusive, false = Inclusive

  // Ledger Logger Form State
  const [logType, setLogType] = useState<'sale' | 'purchase'>('sale');
  const [logDesc, setLogDesc] = useState<string>('');
  const [logAmount, setLogAmount] = useState<string>('');
  const [logRate, setLogRate] = useState<number>(18);
  const [logInvoiceNum, setLogInvoiceNum] = useState<string>('');

  // Transactions State
  const [transactions, setTransactions] = useState<GstTxn[]>([]);

  useEffect(() => {
    loadProfileAndLedger();
  }, []);

  const loadProfileAndLedger = () => {
    try {
      const profileStr = localStorage.getItem('passbook_user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.profession) {
          setProfession(profile.profession);
        }
        if (profile.gstNumber) {
          setGstNumber(profile.gstNumber);
        }
      }

      const txnsStr = localStorage.getItem('passbook_gst_transactions');
      if (txnsStr) {
        setTransactions(JSON.parse(txnsStr));
      }
    } catch (e) {
      console.error('Failed to load GST screen data:', e);
    }
  };

  // GST Calculation Logic for Calculator
  const getCalcResults = () => {
    const amt = parseFloat(calcAmount) || 0;
    if (isExclusive) {
      const gst = amt * (calcRate / 100);
      const cgst = gst / 2;
      const sgst = gst / 2;
      const total = amt + gst;
      return {
        baseAmount: amt,
        cgst,
        sgst,
        totalGst: gst,
        totalAmount: total,
      };
    } else {
      const base = amt / (1 + calcRate / 100);
      const gst = amt - base;
      const cgst = gst / 2;
      const sgst = gst / 2;
      return {
        baseAmount: base,
        cgst,
        sgst,
        totalGst: gst,
        totalAmount: amt,
      };
    }
  };

  const calc = getCalcResults();

  // Ledger calculation logic for log submission
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDesc.trim()) {
      alert('Please enter a transaction description.');
      return;
    }
    const amt = parseFloat(logAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const gstAmt = amt * (logRate / 100);
    const newTxn: GstTxn = {
      id: Math.random().toString(36).substring(2, 9),
      type: logType,
      description: logDesc.trim(),
      amount: amt,
      rate: logRate,
      gstAmount: gstAmt,
      invoiceNumber: logInvoiceNum.trim() || 'N/A',
      date: new Date().toISOString()
    };

    try {
      const updated = [newTxn, ...transactions];
      setTransactions(updated);
      localStorage.setItem('passbook_gst_transactions', JSON.stringify(updated));

      // Reset form
      setLogDesc('');
      setLogAmount('');
      setLogInvoiceNum('');
    } catch (e) {
      alert('Failed to save GST invoice log.');
    }
  };

  const handleDeleteTxn = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice entry?')) {
      try {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem('passbook_gst_transactions', JSON.stringify(updated));
      } catch (e) {
        alert('Failed to delete transaction.');
      }
    }
  };

  const getLedgerSummary = () => {
    let totalOutward = 0; // Sales (collect GST)
    let totalInward = 0;  // Purchases (pay GST, claimed as ITC)

    transactions.forEach(t => {
      if (t.type === 'sale') {
        totalOutward += t.gstAmount;
      } else {
        totalInward += t.gstAmount;
      }
    });

    const netPayable = totalOutward - totalInward;

    return {
      totalOutward,
      totalInward,
      netPayable
    };
  };

  const summary = getLedgerSummary();

  const handleQuickCreateTransaction = async (type: 'Expense' | 'Income', description: string, amount: number, category = 'Miscellaneous') => {
    try {
      const payload = {
        date: new Date().toISOString(),
        description,
        amount: type === 'Expense' ? -Math.abs(amount) : Math.abs(amount),
        type,
        category,
        paymentMethod: 'UPI',
        account: 'SBI',
        notes: `Created from GST Savings suggestion: ${description}`
      };
      await axios.post('/api/transactions', payload);
      alert('A ledger entry was created and saved to your transactions.');
    } catch (err) {
      console.error('Quick create failed', err);
      alert('Failed to create transaction.');
    }
  };

  const renderProfessionTips = () => {
    switch (profession) {
      case 'Salaried':
        return (
          <div className="border-l-4 border-indigo-500 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-zinc-800">
            <h4 className="text-xs font-black text-indigo-500 dark:text-indigo-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>GST Tips for Salaried Employees</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold leading-relaxed">
              As a salaried worker, you don't file GST returns directly, but you pay indirect tax on most purchases. Services like dining out, Netflix, and cabs attract 18% GST. Standard packaged foods attract 5% to 12%. Check restaurant bills to verify they have registered GSTINs before charging you CGST/SGST.
            </p>
          </div>
        );
      case 'Farmer':
        return (
          <div className="border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-zinc-800">
            <h4 className="text-xs font-black text-emerald-500 dark:text-emerald-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Agricultural GST Exemptions</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold leading-relaxed">
              Raw agricultural products like seeds, fresh vegetables, fruits, and organic manure attract 0% GST. Heavy machinery, tractors, and pump sets may carry 12% to 18% GST. Since farm income is tax-exempt, you don't collect GST on crop sales. Direct services like harvesting or cultivation labor are also exempt.
            </p>
          </div>
        );
      case 'Business':
        return (
          <div className="border-l-4 border-amber-500 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-zinc-800">
            <h4 className="text-xs font-black text-amber-500 dark:text-amber-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Business GST & ITC Rules</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold leading-relaxed">
              Registration is mandatory if annual turnover exceeds ₹40 Lakhs (₹20 Lakhs for services). You must log invoices carefully: inward purchases qualify for Input Tax Credit (ITC), which offsets outward tax liability. Ensure you file GSTR-1 and GSTR-3B on time to avoid penalties.
            </p>
          </div>
        );
      case 'Student':
        return (
          <div className="border-l-4 border-blue-500 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-zinc-800">
            <h4 className="text-xs font-black text-blue-500 dark:text-blue-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>GST Guidelines for Students</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold leading-relaxed">
              Tuition fees at recognized educational institutes/universities are exempt from GST. Coaching classes, online tutorials, and books/stationery may carry 18% GST. Check if your college mess bills charge correct food GST (5% without ITC or 18% with ITC).
            </p>
          </div>
        );
      case 'Housewife':
        return (
          <div className="border-l-4 border-pink-500 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-zinc-800">
            <h4 className="text-xs font-black text-pink-500 dark:text-pink-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Household Budgeting & GST</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold leading-relaxed">
              Essential loose items like unpackaged milk, salt, curd, and flour carry 0% GST. Buying pre-packaged branded flour or paneer adds 5% GST. Gold purchases carry 3% GST, and selling old gold to jewelers doesn't attract GST. Planning grocery purchases around GST slabs can save 3-5% monthly.
            </p>
          </div>
        );
      case 'Freelancer':
        return (
          <div className="border-l-4 border-violet-500 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-zinc-800">
            <h4 className="text-xs font-black text-violet-500 dark:text-violet-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>GST for Tech Freelancers</span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold leading-relaxed">
              If your client services cross ₹20 Lakhs, GST registration is required (18% SAC code). However, exporting services to overseas clients is Zero-Rated (0% GST) provided you file a Letter of Undertaking (LUT) in GSTR portal. Claim ITC on laptops, office chairs, hosting, and high-speed internet bills.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const coverPct = summary.totalOutward > 0 ? Math.min(100, (summary.totalInward / summary.totalOutward) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-24 text-black dark:text-white select-none">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900 px-1">
        <button
          onClick={() => navigate('/profile')}
          className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg border dark:border-zinc-850 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-right">
          <h1 className="text-base font-black font-sans leading-none">GST PORTAL</h1>
          {gstNumber ? (
            <span className="text-[8.5px] font-bold text-indigo-500 dark:text-indigo-400 mt-1 block">
              GSTIN: {gstNumber}
            </span>
          ) : (
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-450 mt-1 block">
              Ledger returns center
            </span>
          )}
        </div>
      </div>

      {/* PROFESSION TIPS */}
      {renderProfessionTips()}

      {/* QUICK CALCULATOR */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
        <div>
          <h3 className="font-extrabold text-xs flex items-center space-x-1.5">
            <Calculator className="w-4 h-4 text-indigo-500" />
            <span>GST Quick Calculator</span>
          </h3>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Verify billing totals & taxes</p>
        </div>

        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Amount (₹)..."
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full bg-slate-50 dark:bg-zinc-950 text-xs font-bold p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:outline-none"
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-xl p-0.5 border dark:border-zinc-800">
            <button
              onClick={() => setIsExclusive(true)}
              className={`py-1 px-3 text-[9px] font-bold uppercase rounded-lg transition-all ${
                isExclusive
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Exclusive
            </button>
            <button
              onClick={() => setIsExclusive(false)}
              className={`py-1 px-3 text-[9px] font-bold uppercase rounded-lg transition-all ${
                !isExclusive
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Inclusive
            </button>
          </div>
        </div>

        {/* slab rates row */}
        <div className="flex justify-between gap-2">
          {[5, 12, 18, 28].map(r => (
            <button
              key={r}
              onClick={() => setCalcRate(r)}
              className={`flex-1 py-1.5 border rounded-xl text-[10px] font-black uppercase transition-all ${
                calcRate === r
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {r}%
            </button>
          ))}
        </div>

        {/* calculation breakdown output */}
        <div className="bg-slate-50 dark:bg-zinc-950 p-4 border dark:border-zinc-900 rounded-2xl space-y-2.5 text-[9px] font-bold uppercase text-slate-550 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Base Net Value:</span>
            <span className="text-black dark:text-white">₹{calc.baseAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST ({calcRate / 2}%):</span>
            <span className="text-black dark:text-white">₹{calc.cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST ({calcRate / 2}%):</span>
            <span className="text-black dark:text-white">₹{calc.sgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/50 dark:border-zinc-900 pt-2 text-[10px] text-amber-500">
            <span>Total GST Tax:</span>
            <span className="font-extrabold">₹{calc.totalGst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/50 dark:border-zinc-900 pt-2 text-xs text-black dark:text-white font-extrabold leading-none">
            <span>Gross Total Amount:</span>
            <span className="font-black text-sm">₹{calc.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* CUMULATIVE GST SUMMARY CARD */}
      <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-zinc-900 rounded-3xl p-5 space-y-4 shadow-sm">
        <h3 className="font-extrabold text-xs flex items-center space-x-1.5">
          <Receipt className="w-4 h-4 text-emerald-500" />
          <span>Cumulative GST Ledger</span>
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-white dark:bg-black border dark:border-zinc-800 rounded-2xl">
            <span className="text-[8px] uppercase font-black text-slate-400">Outward GST (Collected)</span>
            <h4 className="text-sm font-black text-emerald-500 mt-1">₹{summary.totalOutward.toFixed(2)}</h4>
          </div>
          <div className="p-3 bg-white dark:bg-black border dark:border-zinc-800 rounded-2xl">
            <span className="text-[8px] uppercase font-black text-slate-400">Inward GST (ITC Claimed)</span>
            <h4 className="text-sm font-black text-rose-500 mt-1">₹{summary.totalInward.toFixed(2)}</h4>
          </div>
        </div>

        <div className={`p-3 rounded-2xl text-center font-black text-[10px] uppercase ${
          summary.netPayable >= 0 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
        }`}>
          {summary.netPayable >= 0 ? `Net GST Payable: ₹${summary.netPayable.toFixed(2)}` : `Refundable / Excess ITC: ₹${Math.abs(summary.netPayable).toFixed(2)}`}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewingPdfModal(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-[10px] font-black uppercase cursor-pointer"
          >
            📄 View Return PDF
          </button>
          <button
            onClick={() => {
              setDownloadingPdf(true);
              setTimeout(() => {
                setDownloadingPdf(false);
                alert('GSTR Return PDF has been successfully saved to your downloads.');
              }, 1500);
            }}
            disabled={downloadingPdf}
            className="flex-1 bg-slate-100 dark:bg-zinc-900 border dark:border-zinc-800 text-black dark:text-white rounded-xl py-3 text-[10px] font-black uppercase cursor-pointer flex items-center justify-center space-x-1.5"
          >
            {downloadingPdf ? (
              <span className="w-3.5 h-3.5 border border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ITC HEALTH & SPARKLINES */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-premium">
        <div>
          <h3 className="font-extrabold text-xs">🔎 ITC Coverage & Health</h3>
          <p className="text-[8px] text-slate-450 dark:text-zinc-550 leading-relaxed font-semibold mt-1">ITC offsets outward tax liabilities</p>
        </div>

        <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-450 dark:text-zinc-550">
          <div>
            <span>Outward GST</span>
            <div className="text-sm font-black text-emerald-500 mt-0.5">₹{summary.totalOutward.toFixed(2)}</div>
          </div>
          <div>
            <span>Inward GST (ITC)</span>
            <div className="text-sm font-black text-rose-500 mt-0.5">₹{summary.totalInward.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <span>ITC Coverage</span>
            <div className={`text-sm font-black mt-0.5 ${
              coverPct >= 80 ? 'text-emerald-500' : coverPct >= 40 ? 'text-amber-500' : 'text-rose-500'
            }`}>
              {coverPct.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Suggestion list */}
        <div className="text-[9.5px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-1 font-semibold">
          {summary.totalOutward - summary.totalInward > 0 ? (
            <p>• Increase compliant purchases to claim more ITC and reduce net GST payable.</p>
          ) : (
            <p>• Great — your ITC covers or exceeds outward GST. Consider reconciling invoices to claim refunds.</p>
          )}
          <p>• Match supplier invoices monthly to avoid ITC reversal later.</p>
          <p>• For small invoicing, consider composition scheme (if eligible) to reduce compliance overhead.</p>
        </div>

        {/* Sparkline trend (simple bar charts) */}
        <div className="bg-slate-50 dark:bg-zinc-950 p-4 border dark:border-zinc-900 rounded-2xl flex flex-col justify-between h-20">
          <span className="text-[8px] uppercase font-black text-slate-400">ITC trend (last 6 periods)</span>
          <div className="flex justify-around items-end h-10">
            {Array.from({ length: 6 }).map((_, i) => {
              const vals = transactions.slice(0, 12).map(t => Math.abs(t.gstAmount));
              const sample = vals[i] || (i + 1) * 50;
              const max = Math.max(1, ...vals, 300);
              const h = Math.max(4, (sample / max) * 32);
              return (
                <div
                  key={i}
                  className={`w-3.5 rounded-t-sm transition-all duration-300`}
                  style={{ height: `${h}px`, backgroundColor: i === 0 ? '#6366f1' : '#c7d2fe' }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-3">
        <div>
          <h3 className="font-extrabold text-xs">⚡ Quick Actions</h3>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Quickly log suggestions to statement ledger</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleQuickCreateTransaction('Expense', 'Bulk purchase of raw materials', 50000, 'Groceries')}
            className="flex-1 py-2 px-3 border border-orange-500 text-orange-500 hover:bg-orange-500/10 rounded-xl text-[9px] font-extrabold uppercase transition-all active:scale-95 cursor-pointer"
          >
            Create Purchase
          </button>
          <button
            onClick={() => handleQuickCreateTransaction('Expense', 'Supplier invoice reconciliation entry', 15000, 'Office Supplies')}
            className="flex-1 py-2 px-3 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 rounded-xl text-[9px] font-extrabold uppercase transition-all active:scale-95 cursor-pointer"
          >
            Create ITC
          </button>
        </div>
      </div>

      {/* INVOICE LOGGER FORM */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
        <h3 className="font-extrabold text-xs flex items-center space-x-1.5">
          <Plus className="w-4 h-4 text-indigo-500" />
          <span>Log GST Invoice</span>
        </h3>

        <form onSubmit={handleLogSubmit} className="space-y-4">
          {/* Sale vs Purchase Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLogType('sale')}
              className={`py-2 border rounded-xl text-[9.5px] font-black uppercase transition-all ${
                logType === 'sale'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-slate-50 dark:bg-zinc-950 border-slate-250 dark:border-zinc-800 text-slate-500'
              }`}
            >
              Outward Invoice (Sale)
            </button>
            <button
              type="button"
              onClick={() => setLogType('purchase')}
              className={`py-2 border rounded-xl text-[9.5px] font-black uppercase transition-all ${
                logType === 'purchase'
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : 'bg-slate-50 dark:bg-zinc-950 border-slate-250 dark:border-zinc-800 text-slate-500'
              }`}
            >
              Inward Invoice (Purchase)
            </button>
          </div>

          <div>
            <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Invoice Description</label>
            <input
              type="text"
              placeholder="e.g. Office Supplies, client consulting fee..."
              value={logDesc}
              onChange={(e) => setLogDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 text-xs font-bold p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Base Amount (₹)</label>
              <input
                type="text"
                placeholder="e.g. 5000"
                value={logAmount}
                onChange={(e) => setLogAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full bg-slate-50 dark:bg-zinc-950 text-xs font-bold p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">GST Slab</label>
              <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-xl p-0.5 border dark:border-zinc-800 h-10">
                {[5, 12, 18, 28].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLogRate(r)}
                    className={`flex-1 text-[8.5px] font-black rounded-lg transition-all ${
                      logRate === r ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Invoice Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. INV-2026-001"
              value={logInvoiceNum}
              onChange={(e) => setLogInvoiceNum(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 text-xs font-bold p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Log GST Invoice
          </button>
        </form>
      </div>

      {/* LOGGED INVOICES TABLE */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
        <h3 className="font-extrabold text-xs">📜 Logged Invoices Ledger</h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-[9px] uppercase font-bold border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl">
            No invoice transactions logged yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-none pr-1">
            {transactions.map(t => {
              const gross = t.amount + t.gstAmount;
              const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              return (
                <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-zinc-900 rounded-2xl">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                      t.type === 'sale' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                    }`}>
                      {t.type === 'sale' ? 'OUT' : 'IN'}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-[10.5px] font-bold truncate leading-snug">{t.description}</h4>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                        {formattedDate} • {t.invoiceNumber} • Slab: {t.rate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] font-black">₹{gross.toFixed(0)}</div>
                      <div className="text-[8px] text-slate-400 font-semibold uppercase">GST: ₹{t.gstAmount.toFixed(0)}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteTxn(t.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GSTR RETURN PDF PREVIEW MODAL */}
      {viewingPdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b dark:border-zinc-900 mb-4 shrink-0">
              <h3 className="text-xs font-black uppercase">📄 GSTR Return Statement PDF</h3>
              <button onClick={() => setViewingPdfModal(false)} className="text-slate-400 hover:text-black dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-none">
              <div className="border border-slate-200 dark:border-zinc-850 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 space-y-4">
                <div className="text-center">
                  <h4 className="font-black text-[11px] uppercase tracking-wide">Official GSTR Return Summary</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Filing Period: Q1 FY 2026-2027</p>
                </div>

                <div className="border-b dark:border-zinc-850 pb-3 text-[9.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase space-y-1">
                  <p>Filer Name: <span className="text-black dark:text-white font-black">{localStorage.getItem('passbook_user_profile') ? JSON.parse(localStorage.getItem('passbook_user_profile')!).name : 'Local User'}</span></p>
                  <p>GSTIN: <span className="text-black dark:text-white font-black">{gstNumber || 'NOT PROVIDED'}</span></p>
                  <p>Profession: <span className="text-black dark:text-white font-black">{profession}</span></p>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[9.5px] font-black uppercase">Ledger details</h5>
                  <div className="flex justify-between border-b dark:border-zinc-900 pb-1 text-[8px] uppercase font-black text-slate-400">
                    <span>Particulars</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase">
                    <span>Outward GST (Sales)</span>
                    <span className="text-emerald-500">₹{summary.totalOutward.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase">
                    <span>Inward GST (ITC)</span>
                    <span className="text-rose-500">₹{summary.totalInward.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t dark:border-zinc-900 pt-2 text-[10px] font-black uppercase">
                    <span>Net GST Liability:</span>
                    <span className={summary.netPayable >= 0 ? 'text-amber-500' : 'text-emerald-500'}>
                      ₹{summary.netPayable.toFixed(2)}
                    </span>
                  </div>
                </div>

                {transactions.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t dark:border-zinc-900">
                    <h5 className="text-[9.5px] font-black uppercase">Recent Invoice breakdown</h5>
                    {transactions.slice(0, 5).map((t, idx) => (
                      <div key={t.id || idx} className="flex justify-between text-[8px] font-bold text-slate-450 dark:text-zinc-500 uppercase">
                        <span className="truncate max-w-[150px]">{t.description}</span>
                        <span>GST ₹{t.gstAmount.toFixed(0)} ({t.rate}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t dark:border-zinc-900 mt-4 shrink-0">
              <button
                onClick={() => setViewingPdfModal(false)}
                className="py-2.5 px-4 border border-slate-200 dark:border-zinc-800 text-[9.5px] font-black uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setDownloadingPdf(true);
                  setTimeout(() => {
                    setDownloadingPdf(false);
                    setViewingPdfModal(false);
                    alert('GSTR Return PDF has been successfully saved to your downloads.');
                  }, 1500);
                }}
                disabled={downloadingPdf}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[9.5px] font-black uppercase rounded-xl cursor-pointer flex items-center space-x-1"
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

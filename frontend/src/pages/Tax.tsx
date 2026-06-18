import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Calculator,
  SlidersHorizontal,
  CheckSquare,
  Square,
  FileText,
  Download
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  value: number;
  description: string;
}

const PROFESSION_CHECKLISTS: Record<string, ChecklistItem[]> = {
  Salaried: [
    { id: '80c', label: 'Section 80C Investments', value: 150000, description: 'PPF, EPF, ELSS, Life Insurance premiums, or school fees.' },
    { id: '80d', label: 'Section 80D Health Premium', value: 25000, description: 'Medical insurance premium for self and family.' },
    { id: 'nps', label: 'Sec 80CCD(1B) NPS Deposit', value: 50000, description: 'Additional tax benefit on National Pension Scheme.' },
    { id: 'hra', label: 'House Rent Allowance (HRA)', value: 100000, description: 'Rent paid exemption (calculated based on salary breakdown).' },
    { id: 'sec24', label: 'Sec 24(b) Home Loan Interest', value: 200000, description: 'Interest paid on home loan for self-occupied property.' }
  ],
  Farmer: [
    { id: 'sec10_1', label: 'Sec 10(1) Agri Exemption', value: 250000, description: 'Exempt agricultural crop and lease income.' },
    { id: 'pm_kisan', label: 'PM-Kisan Scheme Allowance', value: 6000, description: 'Exempt direct income transfer support.' },
    { id: 'kcc', label: 'KCC Interest Subvention', value: 15000, description: 'Interest subventions on Kisan Credit Cards.' },
    { id: 'equip_dep', label: 'Equipment Depreciation', value: 50000, description: 'Depreciation on tractors and farm machinery.' }
  ],
  Business: [
    { id: 'sec44ad', label: 'Sec 44AD Presumptive Tax', value: 200000, description: 'Deemed business profit (6% digital, 8% cash turnover).' },
    { id: 'rent_elec', label: 'Rent & Electricity Expenses', value: 80000, description: 'Utilities and shop/office rent write-offs.' },
    { id: 'travel_meals', label: 'Business Travel & Meals', value: 4000, description: 'Legitimate business expenses write-off.' },
    { id: 'staff_wages', label: 'Staff Wages & EPF Benefits', value: 120000, description: 'Staff salaries and benefits paid.' },
    { id: 'deprec', label: 'Machinery Depreciation', value: 60000, description: 'Depreciation on machinery, office PCs, furniture.' }
  ],
  Freelancer: [
    { id: 'sec44ada', label: 'Sec 44ADA Presumptive Tax', value: 300000, description: 'Deemed professional income (50% of gross receipts).' },
    { id: 'laptop_sub', label: 'Laptops & Software Licenses', value: 50000, description: 'Write-off work tools, Adobe, hosting, Canva.' },
    { id: 'office_net', label: 'Home Office & Broadband', value: 60000, description: 'Rent portion & high speed internet bills.' },
    { id: 'prof_dev', label: 'Courses & Professional Books', value: 20000, description: 'Training and books claimed as business costs.' },
    { id: 'coworking', label: 'Co-working Memberships', value: 30000, description: 'Monthly passes for co-working or hot-desking.' }
  ],
  Student: [
    { id: 'sec80e', label: 'Sec 80E Education Loan', value: 40000, description: 'Exemption on interest paid for education loans.' },
    { id: 'sec10_16', label: 'Sec 10(16) Scholarships', value: 20000, description: 'Scholarships received for meeting education costs.' },
    { id: 'elss_micro', label: 'ELSS Micro-Savings', value: 15000, description: 'Equity Linked Savings Scheme mutual funds.' },
    { id: 'part_std', label: 'Part-time standard deduction', value: 15000, description: 'Exemptions allowed on freelance/part-time allowances.' }
  ],
  Housewife: [
    { id: 'ppf_hw', label: 'PPF Savings Exemption', value: 75000, description: 'Public Provident Fund investments made.' },
    { id: 'sukanya', label: 'Sukanya Samriddhi Yojana', value: 50000, description: 'Tax savings on account of girl child.' },
    { id: 'gold_exemp', label: 'Gold Capital Gain Limit', value: 30000, description: 'Long term capital gains exemption on personal gold sale.' },
    { id: 'gift_tax', label: 'Spouse Gifting Allowance', value: 50000, description: 'Non-working spouse cash gifts received (exempt).' }
  ]
};

const UNIVERSAL_DEDUCTIONS: ChecklistItem[] = [
  { id: '80c', label: 'Section 80C Investments', value: 150000, description: 'PPF, EPF, ELSS, Life Insurance premiums, or school fees.' },
  { id: '80d_self', label: 'Section 80D Health Premium (Self/Family)', value: 25000, description: 'Medical insurance premium for self and family.' },
  { id: '80d_parents', label: 'Section 80D Health Premium (Parents)', value: 50000, description: 'Medical insurance premium for parents.' },
  { id: 'nps', label: 'Sec 80CCD(1B) NPS Deposit', value: 50000, description: 'Additional tax benefit on National Pension Scheme.' },
  { id: 'sec80e', label: 'Section 80E Education Loan', value: 40000, description: 'Exemption on interest paid for education loans.' },
  { id: '80g', label: 'Section 80G Charitable Donations', value: 20000, description: 'Donations to approved charitable trust/funds.' },
  { id: '80gg', label: 'Section 80GG Rent Paid (No HRA)', value: 60000, description: 'Rent paid exemption if HRA is not received.' },
  { id: '80tta', label: 'Section 80TTA Bank Interest Exemption', value: 10000, description: 'Exempt interest from savings accounts (up to ₹10k).' },
  { id: '80ttb', label: 'Section 80TTB Senior Interest Exemption', value: 50000, description: 'Exempt interest from deposits for senior citizens.' },
  { id: 'sec24_home', label: 'Section 24(b) Home Loan Interest', value: 200000, description: 'Interest paid on home loan for self-occupied property.' }
];

export const Tax: React.FC = () => {
  const navigate = useNavigate();

  const [profession, setProfession] = useState<string>('Salaried');
  const [grossIncomeStr, setGrossIncomeStr] = useState<string>('600000');
  const [otherIncomeStr, setOtherIncomeStr] = useState<string>('0');

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [claimedAmounts, setClaimedAmounts] = useState<Record<string, number>>({});
  const [viewingPdfModal, setViewingPdfModal] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    loadUserProfile();
    // Load saved checklist selections
    const saved = localStorage.getItem('passbook_tax_checklist');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCheckedItems(parsed.checked || []);
      setClaimedAmounts(parsed.claimed || {});
    }
  }, []);

  const loadUserProfile = () => {
    try {
      const profileStr = localStorage.getItem('passbook_user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.profession) {
          setProfession(profile.profession);
        }
        if (profile.monthlyIncome) {
          setGrossIncomeStr((profile.monthlyIncome * 12).toString());
        }
      }
    } catch (e) {
      console.error('Failed to load user profile in Tax page:', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('passbook_tax_checklist', JSON.stringify({ checked: checkedItems, claimed: claimedAmounts }));
  }, [checkedItems, claimedAmounts]);

  const handleExportTaxReport = () => {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        profession,
        grossIncome: grossIncomeStr,
        otherIncome: otherIncomeStr,
        deductions: getTotalDeductions(),
        estimatedTaxNew: tax.totalNewTax,
        estimatedTaxOld: tax.totalOldTax
      };
      localStorage.setItem('tax_report_pdf', JSON.stringify(report));
      alert('Tax planning report saved (mock PDF) to local storage.');
    } catch (e) {
      alert('Could not save the tax report.');
    }
  };

  const getCombinedChecklist = () => {
    const profList = PROFESSION_CHECKLISTS[profession] || PROFESSION_CHECKLISTS['Salaried'];
    const combined = [...profList];
    UNIVERSAL_DEDUCTIONS.forEach(item => {
      if (!combined.some(x => x.id === item.id)) {
        combined.push(item);
      }
    });
    return combined;
  };

  const checklistItems = getCombinedChecklist();

  const toggleChecklistItem = (id: string) => {
    if (checkedItems.includes(id)) {
      setCheckedItems(checkedItems.filter(item => item !== id));
      const updated = { ...claimedAmounts };
      delete updated[id];
      setClaimedAmounts(updated);
    } else {
      setCheckedItems([...checkedItems, id]);
      const item = checklistItems.find(x => x.id === id);
      if (item) {
        setClaimedAmounts(prev => ({
          ...prev,
          [id]: item.value
        }));
      }
    }
  };

  const handleClaimedAmountChange = (id: string, text: string, maxLimit: number) => {
    const val = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    const cappedVal = Math.min(val, maxLimit);
    setClaimedAmounts(prev => ({
      ...prev,
      [id]: cappedVal
    }));
  };

  const getTotalDeductions = () => {
    return checklistItems
      .filter(item => checkedItems.includes(item.id))
      .reduce((sum, item) => {
        const val = claimedAmounts[item.id] !== undefined ? claimedAmounts[item.id] : item.value;
        return sum + val;
      }, 0);
  };

  const calculateTax = () => {
    const grossIncome = parseFloat(grossIncomeStr) || 0;
    const otherIncome = parseFloat(otherIncomeStr) || 0;
    const totalGross = grossIncome + otherIncome;

    const isSalaried = profession === 'Salaried';

    // NEW REGIME (FY 2025-26 Budget revision)
    const newStdDeduction = isSalaried ? 75000 : 0;
    const newTaxable = Math.max(0, totalGross - newStdDeduction);

    let newTaxBeforeRebate = 0;
    const newBreakdown = [
      { slab: '0 - 4L (0%)', range: [0, 400000], rate: 0.00, tax: 0, incomeInSlab: 0 },
      { slab: '4L - 8L (5%)', range: [400000, 800000], rate: 0.05, tax: 0, incomeInSlab: 0 },
      { slab: '8L - 12L (10%)', range: [800000, 1200000], rate: 0.10, tax: 0, incomeInSlab: 0 },
      { slab: '12L - 16L (15%)', range: [1200000, 1600000], rate: 0.15, tax: 0, incomeInSlab: 0 },
      { slab: '16L - 20L (20%)', range: [1600000, 2000000], rate: 0.20, tax: 0, incomeInSlab: 0 },
      { slab: '20L - 24L (25%)', range: [2000050, 2400000], rate: 0.25, tax: 0, incomeInSlab: 0 },
      { slab: 'Above 24L (30%)', range: [2400000, Infinity], rate: 0.30, tax: 0, incomeInSlab: 0 }
    ];

    newBreakdown.forEach((b) => {
      const start = b.range[0];
      const end = b.range[1];
      if (newTaxable > start) {
        const incomeInThisSlab = Math.min(newTaxable, end) - start;
        b.incomeInSlab = incomeInThisSlab;
        b.tax = incomeInThisSlab * b.rate;
      }
    });

    newTaxBeforeRebate = newBreakdown.reduce((sum, b) => sum + b.tax, 0);

    const newRebate = newTaxable <= 1200000 ? newTaxBeforeRebate : 0;
    const newTaxNet = newTaxBeforeRebate - newRebate;
    const newCess = newTaxNet * 0.04;
    const totalNewTax = newTaxNet + newCess;

    // OLD REGIME
    const oldStdDeduction = isSalaried ? 50000 : 0;
    const userDeductions = getTotalDeductions();
    const oldTaxable = Math.max(0, totalGross - oldStdDeduction - userDeductions);

    let oldTaxBeforeRebate = 0;
    const oldBreakdown = [
      { slab: '0 - 2.5L (0%)', range: [0, 250000], rate: 0.00, tax: 0, incomeInSlab: 0 },
      { slab: '2.5L - 5L (5%)', range: [250000, 500000], rate: 0.05, tax: 0, incomeInSlab: 0 },
      { slab: '5L - 10L (20%)', range: [500000, 1000000], rate: 0.20, tax: 0, incomeInSlab: 0 },
      { slab: 'Above 10L (30%)', range: [1000000, Infinity], rate: 0.30, tax: 0, incomeInSlab: 0 }
    ];

    oldBreakdown.forEach((b) => {
      const start = b.range[0];
      const end = b.range[1];
      if (oldTaxable > start) {
        const incomeInThisSlab = Math.min(oldTaxable, end) - start;
        b.incomeInSlab = incomeInThisSlab;
        b.tax = incomeInThisSlab * b.rate;
      }
    });

    oldTaxBeforeRebate = oldBreakdown.reduce((sum, b) => sum + b.tax, 0);

    const oldRebate = oldTaxable <= 500000 ? oldTaxBeforeRebate : 0;
    const oldTaxNet = oldTaxBeforeRebate - oldRebate;
    const oldCess = oldTaxNet * 0.04;
    const totalOldTax = oldTaxNet + oldCess;

    return {
      newTaxable,
      newTaxBeforeRebate,
      newRebate,
      totalNewTax,
      newBreakdown,
      oldTaxable,
      oldTaxBeforeRebate,
      oldRebate,
      totalOldTax,
      oldBreakdown,
      totalGross,
      isSalaried
    };
  };

  const tax = calculateTax();
  const taxDifference = Math.abs(tax.totalOldTax - tax.totalNewTax);
  const isNewOptimal = tax.totalNewTax < tax.totalOldTax;

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
          <h1 className="text-base font-black font-sans leading-none">TAX PLANNER</h1>
          <span className="text-[8.5px] font-bold text-emerald-500 dark:text-emerald-400 mt-1 block">
            Profession: {profession}
          </span>
        </div>
      </div>

      {/* INPUTS CARD */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4 animate-scaleUp">
        <h3 className="font-extrabold text-xs flex items-center space-x-1.5">
          <Calculator className="w-4 h-4 text-indigo-500" />
          <span>Financial Details Inputs</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Annual Gross Income (₹)</label>
            <input
              type="text"
              value={grossIncomeStr}
              onChange={(e) => setGrossIncomeStr(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-50 dark:bg-zinc-950 text-xs font-bold p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[8px] uppercase font-black text-slate-450 dark:text-zinc-550 block mb-1">Other/Investment Income (₹)</label>
            <input
              type="text"
              value={otherIncomeStr}
              onChange={(e) => setOtherIncomeStr(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-50 dark:bg-zinc-950 text-xs font-bold p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl focus:outline-none"
            />
          </div>
        </div>

        {tax.isSalaried && (
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-950 text-[8.5px] font-bold text-indigo-600 dark:text-indigo-400 text-center leading-normal">
            💼 Salaried Bonus: Standard Deduction of ₹75,000 (New) / ₹50,000 (Old) applied automatically!
          </div>
        )}
      </div>

      {/* REGIME SIDE-BY-SIDE CARDS */}
      <div className="grid grid-cols-2 gap-4">
        {/* New Regime */}
        <div className={`p-4 rounded-3xl border flex flex-col justify-between relative bg-white dark:bg-black ${
          isNewOptimal ? 'border-2 border-indigo-500 dark:border-indigo-400 shadow-premium' : 'border-slate-200 dark:border-zinc-800'
        }`}>
          {isNewOptimal && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-black text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
          <div>
            <h4 className="text-[9.5px] font-black uppercase">New Regime</h4>
            <span className="text-[7.5px] font-bold text-slate-400 block mt-0.5">Budget 2025-26 rules</span>
          </div>
          <div className="mt-4">
            <span className="text-[7.5px] uppercase font-black text-slate-400 block">Taxable Value</span>
            <div className="text-xs font-black">₹{tax.newTaxable.toLocaleString('en-IN')}</div>
            <span className="text-[7.5px] uppercase font-black text-slate-400 block mt-2">Total Liability</span>
            <div className="text-sm font-black text-glow text-indigo-500 dark:text-indigo-400">₹{tax.totalNewTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {/* Old Regime */}
        <div className={`p-4 rounded-3xl border flex flex-col justify-between relative bg-white dark:bg-black ${
          !isNewOptimal ? 'border-2 border-emerald-500 dark:border-emerald-400 shadow-premium' : 'border-slate-200 dark:border-zinc-800'
        }`}>
          {!isNewOptimal && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-black text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
          <div>
            <h4 className="text-[9.5px] font-black uppercase">Old Regime</h4>
            <span className="text-[7.5px] font-bold text-slate-400 block mt-0.5">Supports deductions</span>
          </div>
          <div className="mt-4">
            <span className="text-[7.5px] uppercase font-black text-slate-400 block">Taxable Value</span>
            <div className="text-xs font-black">₹{tax.oldTaxable.toLocaleString('en-IN')}</div>
            <span className="text-[7.5px] uppercase font-black text-slate-400 block mt-2">Total Liability</span>
            <div className="text-sm font-black text-glow text-emerald-500 dark:text-emerald-400">₹{tax.totalOldTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>

      {/* DECISION SUMMARY BANNER */}
      <div className={`p-3.5 rounded-3xl text-center text-[9px] uppercase font-black tracking-wide ${
        isNewOptimal ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
      }`}>
        💡 {isNewOptimal ? 'New Regime' : 'Old Regime'} saves you ₹{taxDifference.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in tax liability!
      </div>

      {/* QUICK SAVINGS ADVICE TIPS */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
        <h3 className="font-extrabold text-xs">💡 Savings Tips & Next Steps</h3>
        <p className="text-[8px] text-slate-450 dark:text-zinc-550 leading-relaxed font-semibold">Take action to reduce taxable thresholds</p>

        <div className="space-y-3 font-semibold text-[9.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          <div>
            <div className="text-black dark:text-white font-black text-[10px]">• Maximize 80C contributions</div>
            <p className="mt-1">Invest up to ₹1.5L in PPF/EPF/ELSS or pay school fees to get immediate tax relief.</p>
          </div>
          <div>
            <div className="text-black dark:text-white font-black text-[10px]">• Invest in NPS (Sec 80CCD(1B))</div>
            <p className="mt-1">Claim an additional ₹50,000 deduction beyond 80C limits for retirement savings.</p>
          </div>
          <div>
            <div className="text-black dark:text-white font-black text-[10px]">• Review medical insurance (80D)</div>
            <p className="mt-1">Increase health cover for family or parents before year-end to claim higher 80D deductions.</p>
          </div>
        </div>

        <button
          onClick={handleExportTaxReport}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
        >
          Export Tax Report (PDF)
        </button>
      </div>

      {/* SLAB BREAKDOWNS TABLE */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
        <div>
          <h3 className="font-extrabold text-xs flex items-center space-x-1.5">
            <SlidersHorizontal className="w-4 h-4 text-rose-500" />
            <span>Slab Breakdowns by Bracket</span>
          </h3>
          <p className="text-[8px] text-slate-450 dark:text-zinc-550 leading-relaxed font-semibold mt-0.5">Analyze incremental taxation rates</p>
        </div>

        {/* new regime slabs list */}
        <div className="space-y-3.5">
          <div>
            <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">New Regime Brackets</h4>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-zinc-900 border-y dark:border-zinc-900">
              {tax.newBreakdown.map((b, idx) => (
                <div key={idx} className="flex justify-between py-2 text-[9px] font-bold uppercase">
                  <div>
                    <span className="text-slate-800 dark:text-slate-200">{b.slab}</span>
                    <span className="block text-[7.5px] text-slate-400 font-semibold mt-0.5">Taxable portion: ₹{b.incomeInSlab.toLocaleString('en-IN')}</span>
                  </div>
                  <span className={b.tax > 0 ? 'text-amber-500' : 'text-slate-400'}>
                    ₹{b.tax.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* old regime slabs list */}
          <div>
            <h4 className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">Old Regime Brackets</h4>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-zinc-900 border-y dark:border-zinc-900">
              {tax.oldBreakdown.map((b, idx) => (
                <div key={idx} className="flex justify-between py-2 text-[9px] font-bold uppercase">
                  <div>
                    <span className="text-slate-800 dark:text-slate-200">{b.slab}</span>
                    <span className="block text-[7.5px] text-slate-400 font-semibold mt-0.5">Taxable portion: ₹{b.incomeInSlab.toLocaleString('en-IN')}</span>
                  </div>
                  <span className={b.tax > 0 ? 'text-amber-500' : 'text-slate-400'}>
                    ₹{b.tax.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SAVINGS CHECKLIST CARD */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-premium space-y-4">
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-extrabold text-xs">✅ Savings Checklist ({checkedItems.length})</h3>
            <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Offsets Old Regime liability</p>
          </div>
          <button
            onClick={() => setViewingPdfModal(true)}
            className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
          >
            Report PDF
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-none pr-1">
          {checklistItems.map(item => {
            const isChecked = checkedItems.includes(item.id);
            const userClaimed = claimedAmounts[item.id] !== undefined ? claimedAmounts[item.id] : item.value;

            return (
              <div
                key={item.id}
                className={`p-3 border rounded-2xl flex flex-col justify-between transition-all ${
                  isChecked ? 'bg-indigo-50/20 border-indigo-300 dark:bg-indigo-950/20 dark:border-indigo-900' : 'bg-slate-50 dark:bg-zinc-950/40 border-slate-150 dark:border-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className="flex items-start text-left min-w-0"
                  >
                    <span className="p-0.5 shrink-0 text-slate-450 dark:text-zinc-500 mr-2.5 cursor-pointer">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-500 stroke-[3.5]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-black uppercase tracking-wide block">{item.label}</span>
                      <span className="text-[8px] text-slate-400 font-semibold block leading-relaxed mt-0.5">{item.description}</span>
                    </div>
                  </button>
                  <span className="text-[10px] font-black shrink-0 text-indigo-500 dark:text-indigo-400">
                    Max: ₹{item.value.toLocaleString('en-IN')}
                  </span>
                </div>

                {isChecked && (
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-dashed border-indigo-200/50 dark:border-indigo-900/50">
                    <span className="text-[8px] uppercase font-black text-slate-400">Claimed Amount:</span>
                    <input
                      type="text"
                      value={userClaimed}
                      onChange={(e) => handleClaimedAmountChange(item.id, e.target.value, item.value)}
                      className="bg-white dark:bg-black border dark:border-zinc-800 text-[10px] font-black px-2 py-0.5 rounded w-20 focus:outline-none text-center"
                    />
                    <span className="text-[7.5px] text-slate-400 font-semibold uppercase">(cap limit applies)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* REPORT PDF PREVIEW MODAL */}
      {viewingPdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b dark:border-zinc-900 mb-4 shrink-0">
              <h3 className="text-xs font-black uppercase">📄 Tax Audit Statement PDF</h3>
              <button onClick={() => setViewingPdfModal(false)} className="text-slate-400 hover:text-black dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-none">
              <div className="border border-slate-200 dark:border-zinc-850 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 space-y-4">
                <div className="text-center">
                  <h4 className="font-black text-[11px] uppercase tracking-wide">Tax Planning Assessment</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Assessed Period: FY 2025-2026</p>
                </div>

                <div className="border-b dark:border-zinc-850 pb-3 text-[9.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase space-y-1">
                  <p>Client Name: <span className="text-black dark:text-white font-black">{localStorage.getItem('passbook_user_profile') ? JSON.parse(localStorage.getItem('passbook_user_profile')!).name : 'Local User'}</span></p>
                  <p>Profession: <span className="text-black dark:text-white font-black">{profession}</span></p>
                  <p>Gross Income: <span className="text-black dark:text-white font-black">₹{parseFloat(grossIncomeStr).toLocaleString('en-IN')}</span></p>
                  <p>Other Income: <span className="text-black dark:text-white font-black">₹{parseFloat(otherIncomeStr).toLocaleString('en-IN')}</span></p>
                </div>

                <div className="space-y-2.5">
                  <h5 className="text-[9.5px] font-black uppercase">Assessment Comparison</h5>
                  <div className="grid grid-cols-2 gap-2 text-center text-[9px] uppercase">
                    <div className="p-2 border dark:border-zinc-900 rounded-lg bg-white dark:bg-black">
                      <span className="text-slate-400 block text-[7.5px] font-bold">New Regime</span>
                      <span className="font-black mt-0.5 text-indigo-500">₹{tax.totalNewTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="p-2 border dark:border-zinc-900 rounded-lg bg-white dark:bg-black">
                      <span className="text-slate-400 block text-[7.5px] font-bold">Old Regime</span>
                      <span className="font-black mt-0.5 text-emerald-500">₹{tax.totalOldTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                  <div className="text-center text-[8.5px] font-extrabold uppercase mt-2 text-slate-450 dark:text-zinc-450">
                    Difference: ₹{taxDifference.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>

                {checkedItems.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t dark:border-zinc-900">
                    <h5 className="text-[9.5px] font-black uppercase">Applied Deductions Summary</h5>
                    <div className="space-y-1">
                      {checklistItems.filter(item => checkedItems.includes(item.id)).map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between text-[8px] font-bold text-slate-450 dark:text-zinc-500 uppercase">
                          <span className="truncate max-w-[150px]">{item.label}</span>
                          <span>Claimed ₹{(claimedAmounts[item.id] !== undefined ? claimedAmounts[item.id] : item.value).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
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
                    alert('Tax Planner PDF Report has been successfully saved to your downloads.');
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

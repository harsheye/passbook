import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ChecklistItem {
  id: string;
  label: string;
  value: number;
  description: string;
}

// Checklist items by profession
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
    { id: 'staff_wages', label: 'Staff Wages & EPF Benefits', value: 120000, description: 'Salaries and benefits paid to employees.' },
    { id: 'deprec', label: 'Machinery Depreciation', value: 60000, description: 'Depreciation on machinery, office PCs, furniture.' }
  ],
  Freelancer: [
    { id: 'sec44ada', label: 'Sec 44ADA Presumptive Tax', value: 300000, description: 'Deemed professional income (50% of gross receipts).' },
    { id: 'laptop_sub', label: 'Laptops & Software Licenses', value: 50000, description: 'Write-off work tools, Adobe, hosting, Canva.' },
    { id: 'office_net', label: 'Home Office & Broadband', value: 60000, description: 'Rent portion & high speed internet bills.' },
    { id: 'prof_dev', label: 'Courses & Professional Books', value: 20000, description: 'Training and books claimed as business costs.' },
    { id: 'coworking', label: 'Co-working Memberships', value: 30000, description: 'Monthly passes for hot-desking or private office.' }
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

export const TaxScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();

  // User details
  const [profession, setProfession] = useState<string>('Salaried');
  
  // Annual Gross Income and other inputs
  const [grossIncomeStr, setGrossIncomeStr] = useState<string>('600000');
  const [otherIncomeStr, setOtherIncomeStr] = useState<string>('0');

  // Interactive Checklist State (keeps track of checked item IDs and custom amounts)
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [claimedAmounts, setClaimedAmounts] = useState<Record<string, number>>({});
  
  const [viewingPdfModal, setViewingPdfModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const horizontalScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileStr = await AsyncStorage.getItem('passbook_user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.profession) {
          setProfession(profile.profession);
        }
        // Prefill gross income from monthly income (monthlyIncome * 12)
        if (profile.monthlyIncome) {
          setGrossIncomeStr((profile.monthlyIncome * 12).toString());
        }
      }
    } catch (e) {
      console.error('Failed to load user profile in TaxScreen:', e);
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

  // Toggle checklist
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
    const numericText = text.replace(/[^0-9]/g, '');
    const val = parseFloat(numericText) || 0;
    // Cap at the maximum limit of deduction
    const cappedVal = Math.min(val, maxLimit);
    setClaimedAmounts(prev => ({
      ...prev,
      [id]: cappedVal
    }));
  };

  // Get total deductions from checked items using custom claimed amounts
  const getTotalDeductions = () => {
    return checklistItems
      .filter(item => checkedItems.includes(item.id))
      .reduce((sum, item) => {
        const val = claimedAmounts[item.id] !== undefined ? claimedAmounts[item.id] : item.value;
        return sum + val;
      }, 0);
  };

  // Calculations for Old & New Regime
  const calculateTax = () => {
    const grossIncome = parseFloat(grossIncomeStr) || 0;
    const otherIncome = parseFloat(otherIncomeStr) || 0;
    const totalGross = grossIncome + otherIncome;

    const isSalaried = profession === 'Salaried';

    // 1. NEW REGIME (FY 2025-26 Budget 2025 revision)
    const newStdDeduction = isSalaried ? 75000 : 0;
    const newTaxable = Math.max(0, totalGross - newStdDeduction);
    
    let newTaxBeforeRebate = 0;
    const newBreakdown = [
      { slab: '0 - 4L (0%)', range: [0, 400000], rate: 0.00, tax: 0, incomeInSlab: 0 },
      { slab: '4L - 8L (5%)', range: [400000, 800000], rate: 0.05, tax: 0, incomeInSlab: 0 },
      { slab: '8L - 12L (10%)', range: [800000, 1200000], rate: 0.10, tax: 0, incomeInSlab: 0 },
      { slab: '12L - 16L (15%)', range: [1200000, 1600000], rate: 0.15, tax: 0, incomeInSlab: 0 },
      { slab: '16L - 20L (20%)', range: [1600000, 2000000], rate: 0.20, tax: 0, incomeInSlab: 0 },
      { slab: '20L - 24L (25%)', range: [2000000, 2400000], rate: 0.25, tax: 0, incomeInSlab: 0 },
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

    // New Regime 87A rebate up to 12 Lakhs taxable income (max rebate ₹60,000)
    const newRebate = newTaxable <= 1200000 ? newTaxBeforeRebate : 0;
    const newTaxNet = newTaxBeforeRebate - newRebate;
    const newCess = newTaxNet * 0.04;
    const totalNewTax = newTaxNet + newCess;

    // 2. OLD REGIME
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

    // Old Regime 87A rebate up to 5 Lakhs (Taxable income after standard deduction & exemptions <= 5L)
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER (SCROLLABLE WITH THE PAGE) */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 0, paddingBottom: 8, paddingHorizontal: 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>←</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>TAX PLANNER</Text>
            <Text style={[styles.professionSub, { color: colors.subText }]}>Profession: {profession}</Text>
          </View>
        </View>

        {/* INPUTS CARD */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>💵 Enter Financial Details</Text>
          
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Annual Gross Income (₹)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={grossIncomeStr}
                  onChangeText={setGrossIncomeStr}
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Other/Investment Income (₹)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={otherIncomeStr}
                  onChangeText={setOtherIncomeStr}
                />
              </View>
            </View>
          </View>

          {tax.isSalaried && (
            <View style={styles.stdDeductionBadge}>
              <Text style={styles.stdDeductionBadgeText}>
                💼 Salaried Bonus: Standard Deduction of ₹75,000 (New) / ₹50,000 (Old) applied automatically!
              </Text>
            </View>
          )}
        </View>

        {/* REGIME SIDE-BY-SIDE CARDS */}
        <View style={styles.comparisonGrid}>
          {/* New Regime Card */}
          <View style={[styles.regimeCard, { backgroundColor: colors.card, borderColor: colors.border }, isNewOptimal && styles.optimalRegimeBorder]}>
            {isNewOptimal && <View style={styles.optimalBadge}><Text style={styles.optimalBadgeText}>RECOMMENDED</Text></View>}
            <Text style={styles.regimeTitle}>NEW REGIME</Text>
            <Text style={[styles.regimeSub, { color: colors.subText }]}>FY 2025-26 Budget</Text>
            
            <View style={styles.regimeMetrics}>
              <Text style={[styles.taxableLabel, { color: colors.subText }]}>Taxable Income:</Text>
              <Text style={[styles.taxableVal, { color: colors.text }]}>₹{tax.newTaxable.toLocaleString('en-IN')}</Text>
              
              <Text style={[styles.taxLabel, { color: colors.subText }]}>Calculated Tax:</Text>
              <Text style={styles.taxValue}>₹{tax.totalNewTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>

          {/* Old Regime Card */}
          <View style={[styles.regimeCard, { backgroundColor: colors.card, borderColor: colors.border }, !isNewOptimal && styles.optimalRegimeBorder]}>
            {!isNewOptimal && <View style={styles.optimalBadge}><Text style={styles.optimalBadgeText}>RECOMMENDED</Text></View>}
            <Text style={styles.regimeTitle}>OLD REGIME</Text>
            <Text style={[styles.regimeSub, { color: colors.subText }]}>Allows Slab Deductions</Text>
            
            <View style={styles.regimeMetrics}>
              <Text style={[styles.taxableLabel, { color: colors.subText }]}>Taxable Income:</Text>
              <Text style={[styles.taxableVal, { color: colors.text }]}>₹{tax.oldTaxable.toLocaleString('en-IN')}</Text>
              
              <Text style={[styles.taxLabel, { color: colors.subText }]}>Calculated Tax:</Text>
              <Text style={styles.taxValue}>₹{tax.totalOldTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        </View>

        {/* DECISION SUMMARY BANNER */}
        <View style={[styles.optimalBanner, { backgroundColor: isNewOptimal ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)' }]}>
          <Text style={[styles.optimalBannerText, { color: isNewOptimal ? '#818cf8' : '#10b981' }]}>
            💡 {isNewOptimal ? 'New Regime' : 'Old Regime'} saves you ₹{taxDifference.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in tax liability!
          </Text>
        </View>

        {/* SLAB BREAKDOWNS CARD */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 4 }]}>📊 Slab Breakdowns by Bracket</Text>
          <Text style={{ fontSize: 11, color: colors.subText, marginBottom: 12 }}>Check how much tax is calculated in each slab category.</Text>

          {/* NEW REGIME SLABS */}
          <Text style={[styles.subRegimeHeading, { color: '#6366f1', fontWeight: '800', fontSize: 12, marginBottom: 8 }]}>New Regime Brackets</Text>
          <View style={styles.slabTable}>
            {tax.newBreakdown.map((b: any, idx) => (
              <View key={idx} style={[styles.slabTableRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.slabTableLabel, { color: colors.text }]}>{b.slab}</Text>
                  <Text style={{ fontSize: 9, color: colors.subText }}>Taxable portion: ₹{b.incomeInSlab.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={[styles.slabTableVal, { color: b.tax > 0 ? '#fbbf24' : colors.text }]}>
                  ₹{b.tax.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>

          {/* OLD REGIME SLABS */}
          <Text style={[styles.subRegimeHeading, { color: '#10b981', fontWeight: '800', fontSize: 12, marginTop: 16, marginBottom: 8 }]}>Old Regime Brackets</Text>
          <View style={styles.slabTable}>
            {tax.oldBreakdown.map((b: any, idx) => (
              <View key={idx} style={[styles.slabTableRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.slabTableLabel, { color: colors.text }]}>{b.slab}</Text>
                  <Text style={{ fontSize: 9, color: colors.subText }}>Taxable portion: ₹{b.incomeInSlab.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={[styles.slabTableVal, { color: b.tax > 0 ? '#fbbf24' : colors.text }]}>
                  ₹{b.tax.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* SAVINGS CHECKLIST CARD */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 0 }]}>✅ Savings Checklist ({checkedItems.length})</Text>
            <TouchableOpacity
              onPress={() => setViewingPdfModal(true)}
              style={{ backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>📄 View PDF Report</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: colors.subText, marginBottom: 12 }}>
            Toggle checkboxes to complete investments. Verified items are deducted from the Old Regime tax model live!
          </Text>

          <View style={styles.checklistList}>
            {checklistItems.map(item => {
              const isChecked = checkedItems.includes(item.id);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.checkItemCard,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    isChecked && styles.checkItemCardSelected
                  ]}
                >
                  <View style={styles.checkItemRow}>
                    <TouchableOpacity
                      onPress={() => toggleChecklistItem(item.id)}
                      style={[
                        styles.checkbox,
                        { borderColor: colors.border },
                        isChecked && { backgroundColor: '#10b981', borderColor: '#10b981' }
                      ]}
                    >
                      {isChecked && <Text style={{ color: '#000', fontSize: 8, fontWeight: 'bold' }}>✓</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => toggleChecklistItem(item.id)} activeOpacity={0.7} style={{ flex: 1 }}>
                      <Text style={[styles.checkTitle, { color: colors.text, fontWeight: '700' }]}>{item.label}</Text>
                      <Text style={[styles.checkDesc, { color: colors.subText, fontSize: 10 }]}>{item.description}</Text>
                      <Text style={[styles.checkLimit, { fontSize: 10, fontWeight: 'bold', marginTop: 2, color: colors.text }]}>Max Deductible: ₹{item.value.toLocaleString('en-IN')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* DEDUCTIONS NET SUMMARY */}
          <View style={[styles.deductionsSummaryBox, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 12 }]}>
            <Text style={[styles.deductionsLabel, { color: colors.subText }]}>Total Checklist Deductions:</Text>
            <Text style={styles.deductionsValue}>₹{getTotalDeductions().toLocaleString('en-IN')}</Text>
          </View>
        </View>

      </ScrollView>

      {/* MOCK PDF MODAL */}
      <Modal
        visible={viewingPdfModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingPdfModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, width: '100%', maxHeight: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 15 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>📄 TAX PLANNER AUDIT PDF</Text>
              <TouchableOpacity onPress={() => setViewingPdfModal(false)}>
                <Text style={{ color: colors.subText, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ borderStyle: 'solid', borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: 8, backgroundColor: colors.background }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: colors.text, marginBottom: 2 }}>OFFICIAL INCOME TAX ESTIMATE REPORT</Text>
                <Text style={{ textAlign: 'center', fontSize: 9, color: colors.subText, marginBottom: 15 }}>Financial Year 2026-2027</Text>

                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 10 }}>
                  <Text style={{ fontSize: 10, color: colors.text }}>Assessee Name: <Text style={{ fontWeight: 'bold' }}>Harsh</Text></Text>
                  <Text style={{ fontSize: 10, color: colors.text }}>Profession Category: <Text style={{ fontWeight: 'bold' }}>{profession}</Text></Text>
                  <Text style={{ fontSize: 10, color: colors.text }}>Gross Annual Income: <Text style={{ fontWeight: 'bold' }}>₹{Number(grossIncomeStr).toLocaleString('en-IN')}</Text></Text>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.text }}>Deductions & Exemptions</Text>
                  {checkedItems.map(id => {
                    const item = checklistItems.find(i => i.id === id);
                    if (!item) return null;
                    return (
                      <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 9.5, color: colors.subText }}>• {item.label}</Text>
                        <Text style={{ fontSize: 9.5, color: colors.text }}>₹{item.value.toLocaleString('en-IN')}</Text>
                      </View>
                    );
                  })}
                  {checkedItems.length === 0 && (
                    <Text style={{ fontSize: 9.5, color: colors.subText, fontStyle: 'italic' }}>No tax-saving deductions claimed.</Text>
                  )}
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 15, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: colors.text }}>Calculated Old Regime Tax:</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>₹{tax.totalOldTax.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: colors.text }}>Calculated New Regime Tax:</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>₹{tax.totalNewTax.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6366f1' }}>Optimal Regime Choice:</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6366f1' }}>{isNewOptimal ? 'New Regime' : 'Old Regime'}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                onPress={() => setViewingPdfModal(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.subText, fontSize: 11, fontWeight: '900' }}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setDownloadingPdf(true);
                  setTimeout(() => {
                    setDownloadingPdf(false);
                    setViewingPdfModal(false);
                    Alert.alert('Download Complete', 'Official Tax Estimate Report has been saved to your downloads as PDF.');
                  }, 1500);
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900' }}>DOWNLOAD PDF</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  professionSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#818cf8',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  inputCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  stdDeductionBadge: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  stdDeductionBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#818cf8',
    lineHeight: 12,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  regimeCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  optimalRegimeBorder: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  optimalBadge: {
    position: 'absolute',
    top: -9,
    right: 12,
    backgroundColor: '#6366f1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optimalBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '900',
  },
  regimeTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  regimeSub: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  regimeMetrics: {
    marginTop: 16,
  },
  taxableLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  taxableVal: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  taxLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 12,
  },
  taxValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fbbf24',
    marginTop: 2,
  },
  optimalBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  optimalBannerText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  // Swipe Panel styles
  swipePanelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    borderBottomWidth: 1,
  },
  tabHeaderBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabHeaderBtnActive: {
    borderBottomColor: '#6366f1',
  },
  tabHeaderBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  tabHeaderBtnTextActive: {
    color: '#6366f1',
  },
  panelScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  panelTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  panelSub: {
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 12,
  },
  slabsContainer: {
    gap: 12,
  },
  subRegimeHeading: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#6366f1',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  slabTable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  slabTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  slabTableLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  slabTableVal: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  checklistContainer: {
    gap: 12,
  },
  checklistList: {
    gap: 8,
    marginTop: 12,
  },
  checkItemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  checkItemCardSelected: {
    borderColor: '#6366f1',
    borderLeftWidth: 4,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#71717a',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  checkLabel: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  checkLabelSelected: {
    color: '#6366f1',
  },
  checkDesc: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 11,
  },
  deductionsSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  deductionsLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  deductionsValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10b981',
  },
  claimedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  claimedInputLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  claimedInput: {
    borderWidth: 1,
    borderRadius: 6,
    height: 28,
    paddingHorizontal: 6,
    fontSize: 10,
    fontWeight: '700',
    width: 110,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  checkTitle: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  checkLimit: {
    fontSize: 9.5,
    fontWeight: '700',
  },
});

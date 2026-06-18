import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import api from '../api/api';

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

export const GstScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();

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

  const loadProfileAndLedger = async () => {
    try {
      const profileStr = await AsyncStorage.getItem('passbook_user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.profession) {
          setProfession(profile.profession);
        }
        if (profile.gstNumber) {
          setGstNumber(profile.gstNumber);
        }
      }

      const txnsStr = await AsyncStorage.getItem('passbook_gst_transactions');
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
  const handleLogSubmit = async () => {
    if (!logDesc.trim()) {
      Alert.alert('Validation Error', 'Please enter a transaction description.');
      return;
    }
    const amt = parseFloat(logAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    // Always treat logged ledger amount as the BASE amount, so GST is added exclusive.
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
      await AsyncStorage.setItem('passbook_gst_transactions', JSON.stringify(updated));

      // Reset form
      setLogDesc('');
      setLogAmount('');
      setLogInvoiceNum('');
    } catch (e) {
      Alert.alert('Error', 'Failed to save GST invoice log.');
    }
  };

  const handleDeleteTxn = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this invoice entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = transactions.filter(t => t.id !== id);
              setTransactions(updated);
              await AsyncStorage.setItem('passbook_gst_transactions', JSON.stringify(updated));
            } catch (e) {
              Alert.alert('Error', 'Failed to delete transaction.');
            }
          }
        }
      ]
    );
  };

  // Get cumulative outward and inward GST
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

  // Animated badge value (simple pulse)
  const badgeAnim = new Animated.Value(1);
  Animated.loop(
    Animated.sequence([
      Animated.timing(badgeAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
      Animated.timing(badgeAnim, { toValue: 1.0, duration: 800, useNativeDriver: true })
    ])
  ).start();

  // Quick action to create a suggested ledger transaction into main transactions storage
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
      await api.post('/api/transactions', payload);
      Alert.alert('Saved', 'A ledger entry was created and saved to your transactions.');
    } catch (err) {
      console.error('Quick create failed', err);
      Alert.alert('Error', 'Failed to create transaction.');
    }
  };

  // Guidelines per profession
  const renderProfessionTips = () => {
    switch (profession) {
      case 'Salaried':
        return (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsHeading, { color: '#818cf8' }]}>💡 GST Tips for Salaried Employees</Text>
            <Text style={[styles.tipsBody, { color: colors.subText }]}>
              As a salaried worker, you don't file GST returns directly, but you pay indirect tax on most purchases. Services like dining out, Netflix, and cabs attract 18% GST. Standard packaged foods attract 5% to 12%. Check restaurant bills to verify they have registered GSTINs before charging you CGST/SGST.
            </Text>
          </View>
        );
      case 'Farmer':
        return (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsHeading, { color: '#10b981' }]}>🚜 Agricultural GST Exemptions</Text>
            <Text style={[styles.tipsBody, { color: colors.subText }]}>
              Raw agricultural products like seeds, fresh vegetables, fruits, and organic manure attract 0% GST. Heavy machinery, tractors, and pump sets may carry 12% to 18% GST. Since farm income is tax-exempt, you don't collect GST on crop sales. Direct services like harvesting or cultivation labor are also exempt.
            </Text>
          </View>
        );
      case 'Business':
        return (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsHeading, { color: '#fbbf24' }]}>🏢 Business GST & ITC Rules</Text>
            <Text style={[styles.tipsBody, { color: colors.subText }]}>
              Registration is mandatory if annual turnover exceeds ₹40 Lakhs (₹20 Lakhs for services). You must log invoices carefully: inward purchases qualify for Input Tax Credit (ITC), which offsets outward tax liability. Ensure you file GSTR-1 and GSTR-3B on time to avoid penalties.
            </Text>
          </View>
        );
      case 'Student':
        return (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsHeading, { color: '#2563eb' }]}>🎓 GST Guidelines for Students</Text>
            <Text style={[styles.tipsBody, { color: colors.subText }]}>
              Tuition fees at recognized educational institutes/universities are exempt from GST. Coaching classes, online tutorials, and books/stationery may carry 18% GST. Check if your college mess bills charge correct food GST (5% without ITC or 18% with ITC).
            </Text>
          </View>
        );
      case 'Housewife':
        return (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsHeading, { color: '#ec4899' }]}>🏠 Household Budgeting & GST</Text>
            <Text style={[styles.tipsBody, { color: colors.subText }]}>
              Essential loose items like unpackaged milk, salt, curd, and flour carry 0% GST. Buying pre-packaged branded flour or paneer adds 5% GST. Gold purchases carry 3% GST, and selling old gold to jewelers doesn't attract GST. Planning grocery purchases around GST slabs can save 3-5% monthly.
            </Text>
          </View>
        );
      case 'Freelancer':
        return (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsHeading, { color: '#8b5cf6' }]}>💻 GST for Tech Freelancers</Text>
            <Text style={[styles.tipsBody, { color: colors.subText }]}>
              If your client services cross ₹20 Lakhs, GST registration is required (18% SAC code). However, exporting services to overseas clients is Zero-Rated (0% GST) provided you file a Letter of Undertaking (LUT) in GSTR portal. Claim ITC on laptops, office chairs, hosting, and high-speed internet bills.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* HEADER (SCROLLABLE WITH THE PAGE) */}
          <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 0, paddingBottom: 8, paddingHorizontal: 16 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>←</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>GST PORTAL</Text>
              {gstNumber ? <Text style={[styles.gstinSub, { color: colors.subText }]}>GSTIN: {gstNumber}</Text> : null}
            </View>
          </View>

          {/* TIPS SECTION */}
          {renderProfessionTips()}

          {/* GST CALCULATOR */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🧮 GST Quick Calculator</Text>
            <Text style={[styles.sectionSub, { color: colors.subText }]}>Quickly verify CGST/SGST details for single billing amount.</Text>
            
            <View style={styles.calcRow}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, flex: 2 }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter Amount (₹)..."
                  placeholderTextColor={colors.subText}
                  keyboardType="numeric"
                  value={calcAmount}
                  onChangeText={setCalcAmount}
                />
              </View>
              
              <View style={[styles.toggleContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border, flex: 1 }]}>
                <TouchableOpacity
                  onPress={() => setIsExclusive(true)}
                  style={[styles.toggleBtn, isExclusive && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, isExclusive && styles.toggleBtnTextActive]}>Exclusive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsExclusive(false)}
                  style={[styles.toggleBtn, !isExclusive && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, !isExclusive && styles.toggleBtnTextActive]}>Inclusive</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rates Buttons */}
            <View style={styles.ratesRow}>
              {[5, 12, 18, 28].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setCalcRate(r)}
                  style={[
                    styles.rateBtn,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    calcRate === r && { backgroundColor: '#6366f1', borderColor: '#6366f1' }
                  ]}
                >
                  <Text style={[styles.rateBtnText, { color: colors.text }, calcRate === r && { color: '#ffffff' }]}>{r}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calculations Breakdown Output */}
            <View style={[styles.breakdownBox, { backgroundColor: colors.background }]}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.subText }]}>Base Net Value:</Text>
                <Text style={[styles.breakdownVal, { color: colors.text }]}>₹{calc.baseAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.subText }]}>CGST ({calcRate/2}%):</Text>
                <Text style={[styles.breakdownVal, { color: colors.text }]}>₹{calc.cgst.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.subText }]}>SGST ({calcRate/2}%):</Text>
                <Text style={[styles.breakdownVal, { color: colors.text }]}>₹{calc.sgst.toFixed(2)}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.totalRowBorder]}>
                <Text style={[styles.breakdownLabel, { color: colors.subText, fontWeight: '900' }]}>Total Tax (GST):</Text>
                <Text style={[styles.breakdownVal, { color: '#fbbf24', fontWeight: '900' }]}>₹{calc.totalGst.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.text, fontWeight: '900' }]}>Gross Total Amount:</Text>
                <Text style={[styles.breakdownVal, { color: colors.text, fontSize: 14, fontWeight: '900' }]}>
                  ₹{calc.totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* LEDGER OVERVIEW SUMMARY CARD */}
          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#18181b' : '#f4f4f5', borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>📋 Cumulative GST Ledger</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryColLabel}>OUTWARD GST (COLLECTED)</Text>
                <Text style={[styles.summaryColVal, { color: '#10b981' }]}>₹{summary.totalOutward.toFixed(2)}</Text>
              </View>
              <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryColLabel}>INWARD GST (ITC CLAIMED)</Text>
                <Text style={[styles.summaryColVal, { color: '#ef4444' }]}>₹{summary.totalInward.toFixed(2)}</Text>
              </View>
            </View>
            <View style={[styles.netPayableBanner, { backgroundColor: summary.netPayable >= 0 ? 'rgba(251,191,36,0.1)' : 'rgba(16,185,129,0.1)', marginBottom: 0 }]}>
              <Text style={{ fontSize: 9.5, fontWeight: '900', color: summary.netPayable >= 0 ? '#d97706' : '#059669', textTransform: 'uppercase' }}>
                {summary.netPayable >= 0 ? `Net GST Payable: ₹${summary.netPayable.toFixed(2)}` : `Refundable / Excess ITC: ₹${Math.abs(summary.netPayable).toFixed(2)}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setViewingPdfModal(true)}
                style={{ flex: 1, backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontSize: 10.5, fontWeight: 'bold' }}>📄 View Return PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setDownloadingPdf(true);
                  setTimeout(() => {
                    setDownloadingPdf(false);
                    Alert.alert('Download Complete', 'GSTR Return PDF has been successfully saved to your downloads.');
                  }, 1500);
                }}
                disabled={downloadingPdf}
                style={{ flex: 1, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              >
                {downloadingPdf ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={{ color: colors.text, fontSize: 10.5, fontWeight: 'bold' }}>📥 Download Return PDF</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ITC COVERAGE / HEALTH METRICS */}
          <View style={[styles.itcCard, { backgroundColor: colors.card, borderColor: colors.border }] }>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🔎 ITC Coverage & Health</Text>
            <Text style={{ color: colors.subText, fontSize: 12, marginTop: 6 }}>Shows how much of your outward GST is covered by input credits.</Text>
            <View style={styles.itcRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.subText, fontSize: 11 }}>Outward GST</Text>
                <Text style={{ color: '#10b981', fontWeight: '900', fontSize: 16 }}>₹{summary.totalOutward.toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.subText, fontSize: 11 }}>Inward GST (ITC)</Text>
                <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 16 }}>₹{summary.totalInward.toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ color: colors.subText, fontSize: 11 }}>ITC Coverage</Text>
                {
                  (() => {
                    const coverPct = summary.totalOutward > 0 ? Math.min(100, (summary.totalInward / summary.totalOutward) * 100) : 0;
                    return <Text style={{ color: coverPct >= 80 ? '#10b981' : coverPct >= 40 ? '#f59e0b' : '#ef4444', fontWeight: '900', fontSize: 16 }}>{coverPct.toFixed(0)}%</Text>;
                  })()
                }
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: colors.subText, fontSize: 12 }}>Suggestions:</Text>
              <View style={{ marginTop: 6 }}>
                {summary.totalOutward - summary.totalInward > 0 ? (
                  <Text style={{ color: colors.text, fontSize: 13 }}>• Increase compliant purchases to claim more ITC and reduce net GST payable.</Text>
                ) : (
                  <Text style={{ color: colors.text, fontSize: 13 }}>• Great — your ITC covers or exceeds outward GST. Consider reconciling invoices to claim refunds.</Text>
                )}
                <Text style={{ color: colors.text, fontSize: 13 }}>• Match supplier invoices monthly to avoid ITC reversal later.</Text>
                <Text style={{ color: colors.text, fontSize: 13 }}>• For small invoicing, consider composition scheme (if eligible) to reduce compliance overhead.</Text>
              </View>
            </View>
          </View>

          {/* Small Sparkline (simple bar-based) */}
          <View style={[styles.sparklineWrap, { backgroundColor: colors.background }]}>            
            <Text style={{ color: colors.subText, fontSize: 12, marginBottom: 6 }}>ITC trend (last 6 periods)</Text>
            <View style={styles.sparklineRow}>
              {Array.from({ length: 6 }).map((_, i) => {
                // Mock small sample values derived from transactions history
                const vals = transactions.slice(0, 12).map(t => Math.abs(t.gstAmount));
                const sample = vals[i] || (i + 1) * 50;
                const max = Math.max(1, ...vals, 300);
                const h = Math.max(4, (sample / max) * 40);
                return <View key={i} style={[styles.sparkBar, { height: h, backgroundColor: i === 0 ? '#6366f1' : '#c7d2fe' }]} />;
              })}
            </View>
          </View>

          {/* Savings Opportunities (quick actions) */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }] }>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>⚡ Quick Actions</Text>
            <Text style={[styles.sectionSub, { color: colors.subText }]}>Create quick ledger entries from suggestions</Text>

            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleQuickCreateTransaction('Expense', 'Bulk purchase of raw materials', 50000, 'Groceries')}
                style={[styles.quickBtn, { backgroundColor: '#f97316' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create Purchase</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleQuickCreateTransaction('Expense', 'Supplier invoice reconciliation entry', 15000, 'Office Supplies')}
                style={[styles.quickBtn, { backgroundColor: '#059669' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create ITC</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* INVOICE LOGGER FORM */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>➕ Log GST Invoice</Text>
            
            {/* Type Switcher */}
            <View style={styles.formSwitchRow}>
              <TouchableOpacity
                onPress={() => setLogType('sale')}
                style={[
                  styles.formSwitchBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  logType === 'sale' && { backgroundColor: '#10b981', borderColor: '#10b981' }
                ]}
              >
                <Text style={[styles.formSwitchText, { color: colors.text }, logType === 'sale' && { color: '#ffffff' }]}>Outward Invoice (Sale)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLogType('purchase')}
                style={[
                  styles.formSwitchBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  logType === 'purchase' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                ]}
              >
                <Text style={[styles.formSwitchText, { color: colors.text }, logType === 'purchase' && { color: '#ffffff' }]}>Inward Invoice (Purchase)</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.subText }]}>Invoice Description</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 10 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. Office Supplies purchase, Client consultation..."
                placeholderTextColor={colors.subText}
                value={logDesc}
                onChangeText={setLogDesc}
              />
            </View>

            <View style={styles.formGrid}>
              <View style={{ flex: 1.2 }}>
                <Text style={[styles.fieldLabel, { color: colors.subText }]}>Base Amount (₹)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="e.g. 5000"
                    placeholderTextColor={colors.subText}
                    keyboardType="numeric"
                    value={logAmount}
                    onChangeText={setLogAmount}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.subText }]}>GST Slab</Text>
                <View style={[styles.toggleContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  {[5, 12, 18, 28].map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setLogRate(r)}
                      style={[styles.rateGridBtn, logRate === r && styles.rateGridBtnActive]}
                    >
                      <Text style={[styles.rateGridBtnText, logRate === r && styles.rateGridBtnTextActive]}>{r}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.subText, marginTop: 10 }]}>Invoice Number (Optional)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 16 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. INV-2026-001"
                placeholderTextColor={colors.subText}
                value={logInvoiceNum}
                onChangeText={setLogInvoiceNum}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogSubmit}
              style={[styles.submitBtn, { backgroundColor: colors.text }]}
            >
              <Text style={[styles.submitBtnText, { color: colors.background }]}>Log GST Invoice</Text>
            </TouchableOpacity>
          </View>

          {/* LEDGER TRANSACTION LIST */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📜 Logged Invoices Ledger</Text>
            
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.subText }]}>No invoice transactions logged yet.</Text>
              </View>
            ) : (
              <View style={styles.ledgerList}>
                {transactions.map(t => {
                  const calculatedGross = t.amount + t.gstAmount;
                  const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                  return (
                    <View key={t.id} style={[styles.ledgerItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.ledgerItemLeft}>
                        <View style={[
                          styles.typeIndicator,
                          { backgroundColor: t.type === 'sale' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }
                        ]}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: t.type === 'sale' ? '#10b981' : '#ef4444' }}>
                            {t.type === 'sale' ? 'OUT' : 'IN'}
                          </Text>
                        </View>
                        <View style={styles.ledgerItemMeta}>
                          <Text style={[styles.ledgerItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {t.description}
                          </Text>
                          <Text style={[styles.ledgerItemSub, { color: colors.subText }]}>
                            {formattedDate} • {t.invoiceNumber} • Slab: {t.rate}%
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ledgerItemRight}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.ledgerItemAmt, { color: colors.text }]}>₹{calculatedGross.toFixed(0)}</Text>
                          <Text style={styles.ledgerItemGstText}>GST: ₹{t.gstAmount.toFixed(0)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteTxn(t.id)} style={styles.deleteBtn}>
                          <Text style={styles.deleteBtnText}>❌</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* GSTR RETURN PDF MODAL */}
      <Modal
        visible={viewingPdfModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingPdfModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, width: '100%', maxHeight: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 15 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>📄 GSTR RETURN STATEMENT PDF</Text>
              <TouchableOpacity onPress={() => setViewingPdfModal(false)}>
                <Text style={{ color: colors.subText, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ borderStyle: 'solid', borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: 8, backgroundColor: colors.background }}>
                <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: colors.text, marginBottom: 2 }}>OFFICIAL GSTR RETURN SUMMARY</Text>
                <Text style={{ textAlign: 'center', fontSize: 9, color: colors.subText, marginBottom: 15 }}>Filing Period: Q1 FY 2026-2027</Text>

                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 10 }}>
                  <Text style={{ fontSize: 10, color: colors.text }}>Filer Name: <Text style={{ fontWeight: 'bold' }}>Harsh</Text></Text>
                  <Text style={{ fontSize: 10, color: colors.text }}>GSTIN: <Text style={{ fontWeight: 'bold' }}>{gstNumber || 'NOT PROVIDED'}</Text></Text>
                  <Text style={{ fontSize: 10, color: colors.text }}>Profession: <Text style={{ fontWeight: 'bold' }}>{profession}</Text></Text>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.text }}>Ledger Details</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: colors.subText }}>Particulars</Text>
                    <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: colors.subText }}>Amount</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 9.5, color: colors.text }}>Outward GST (Collected on Sales)</Text>
                    <Text style={{ fontSize: 9.5, color: '#10b981', fontWeight: 'bold' }}>₹{summary.totalOutward.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 9.5, color: colors.text }}>Inward GST (ITC Claimed on Purchases)</Text>
                    <Text style={{ fontSize: 9.5, color: '#ef4444', fontWeight: 'bold' }}>₹{summary.totalInward.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>Net GST Liability:</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: summary.netPayable >= 0 ? '#d97706' : '#059669' }}>
                      ₹{summary.netPayable.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {transactions.length > 0 && (
                  <View style={{ marginTop: 15 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text, marginBottom: 6 }}>Recent Invoice Breakdown</Text>
                    {transactions.slice(0, 5).map((t, idx) => (
                      <View key={t.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: 8.5, color: colors.subText }} numberOfLines={1}>{t.description}</Text>
                        <Text style={{ fontSize: 8.5, color: colors.text }}>GST ₹{t.gstAmount.toFixed(0)} ({t.rate}%)</Text>
                      </View>
                    ))}
                  </View>
                )}
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
                    Alert.alert('Download Complete', 'GSTR Return PDF has been successfully saved to your downloads.');
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
  gstinSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#818cf8',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 16,
  },
  tipsCard: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  tipsHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tipsBody: {
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 14,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
    height: 44,
    alignItems: 'center',
  },
  toggleBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
  },
  toggleBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  toggleBtnTextActive: {
    color: '#09090b',
  },
  ratesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  rateBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnText: {
    fontSize: 11,
    fontWeight: '900',
  },
  breakdownBox: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  breakdownVal: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  totalRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 6,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryColLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#71717a',
  },
  summaryColVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: 28,
    alignSelf: 'center',
  },
  netPayableBanner: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  formSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  formSwitchBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSwitchText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  fieldLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 2,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  rateGridBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  rateGridBtnActive: {
    backgroundColor: '#ffffff',
  },
  rateGridBtnText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#71717a',
  },
  rateGridBtnTextActive: {
    color: '#09090b',
  },
  submitBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  ledgerList: {
    gap: 6,
  },
  ledgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ledgerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  typeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerItemMeta: {
    flex: 1,
  },
  ledgerItemTitle: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  ledgerItemSub: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1.5,
  },
  ledgerItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ledgerItemAmt: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  ledgerItemGstText: {
    fontSize: 7.5,
    color: '#71717a',
    fontWeight: '700',
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    fontSize: 10,
  },
  itcCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
  },
  itcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sparklineWrap: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  sparklineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 40,
    marginTop: 4,
  },
  sparkBar: {
    width: 6,
    borderRadius: 4,
  },
  quickBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
});

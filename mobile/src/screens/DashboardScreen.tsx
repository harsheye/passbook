import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
  Modal,
  Dimensions,
  Switch
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Circle, G, Text as SvgText, Path, Line, Rect } from 'react-native-svg';
import { api, Transaction } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBar } from '../components/BottomTabBar';
import { SparklesIcon } from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';
import { useTab } from '../context/TabContext';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import LottieView from 'lottie-react-native';

interface DashboardSummaryData {
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
    daily: any[];
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  'Salary': '💼',
  'Eating Out/Ordering In': '🍔',
  'Eating Out': '🍔',
  'Shopping': '🛍️',
  'Rent': '🏠',
  'Travel': '🚗',
  'Groceries': '🛒',
  'Subscriptions': '📺',
  'Investment': '📈',
  'Utilities/Bills': '⚡',
  'Utilities': '⚡',
  'Freelancing': '💻',
  // Personalized categories icons
  'Dining': '🍔',
  'Transit': '🚇',
  'Entertainment': '🎬',
  'Healthcare': '🏥',
  'Agriculture Income': '🌾',
  'Seeds/Fertilizers': '🌱',
  'Equipment': '🚜',
  'Labor/Wages': '👥',
  'Mandi/Transport': '🚚',
  'Subsidies': '💸',
  'Personal': '👤',
  'Sales Revenue': '📈',
  'Inventory Cost': '📦',
  'Office Rent': '🏢',
  'Wages/Salaries': '👥',
  'Marketing': '📣',
  'Tax/GST': '🧾',
  'Office Supplies': '📁',
  'Pocket Money': '🪙',
  'Tuition Fees': '🎓',
  'Books/Stationery': '📚',
  'Dining Out': '🍔',
  'Gadgets': '💻',
  'Household Budget': '👛',
  'Kids Education': '🎒',
  'Gold/Jewelry': '👑',
  'Emergency Savings': '🏦',
  'Client Payments': '💳',
  'Software/Tools': '🛠️',
  'Co-working Rent': '🏢',
  'Internet/Phone': '🌐',
  'Professional Fees': '👨‍💼',
  'GST/Tax': '🧾'
};

const CATEGORIES = [
  'All',
  'Salary',
  'Eating Out/Ordering In',
  'Shopping',
  'Rent',
  'Travel',
  'Groceries',
  'Subscriptions',
  'Investment',
  'Utilities/Bills',
  'Freelancing'
];

const CATEGORY_COLORS: Record<string, string> = {
  'All': '#6366f1', // Indigo
  'Salary': '#10b981', // Emerald green
  'Eating Out/Ordering In': '#f97316', // Orange
  'Eating Out': '#f97316',
  'Shopping': '#ec4899', // Pink
  'Rent': '#8b5cf6', // Violet
  'Travel': '#3b82f6', // Blue
  'Groceries': '#eab308', // Yellow
  'Subscriptions': '#ef4444', // Red
  'Investment': '#06b6d4', // Cyan
  'Utilities/Bills': '#64748b', // Slate
  'Utilities': '#64748b',
  'Freelancing': '#a855f7', // Purple
};

// Chart configuration for react-native-chart-kit
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(16,185,129, ${opacity})`,
  strokeWidth: 2,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
};

// Try to require a Lottie animation if present. This keeps the app from failing if the asset is missing.
let sparkleAnim: any = null;
try {
  sparkleAnim = require('../assets/animations/sparkles.json');
} catch (e) {
  sparkleAnim = null;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();
  const { setActiveTab } = useTab();

  // States
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pieFlowType, setPieFlowType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [profile, setProfile] = useState<any>(null);
  const [selectedDashboardProf, setSelectedDashboardProf] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [ratioCardVisible, setRatioCardVisible] = useState<boolean>(true);

  // New customization & modal states
  const [yearDropdownOpen, setYearDropdownOpen] = useState<boolean>(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
  const [taxModalVisible, setTaxModalVisible] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [combinedFeatures, setCombinedFeatures] = useState<boolean>(false);
  const [taxCheckedItems, setTaxCheckedItems] = useState<string[]>([]);
  const [taxClaimedAmounts, setTaxClaimedAmounts] = useState<Record<string, number>>({});
  const [showVisualizations, setShowVisualizations] = useState<boolean>(true);

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
      displayIncome += t.amount;
    } else if (type === 'EXPENSE' || type === 'GAMBLING') {
      displayExpense += t.amount;
    }
  });

  // Fixed mini-chart values for Consolidated Net Worth card (stable UI)
  const miniValues = [displayIncome || 0, Math.abs(displayExpense) || 0, Math.abs(displayIncome - displayExpense) || 0];
  const miniMax = Math.max(...miniValues, 1);
  const miniHeights = miniValues.map(v => (v / miniMax) * 80); // up to 80px height

  const userProfession = selectedDashboardProf || profile?.profession || 'Salaried';

  const renderBusinessDashboard = () => {

    // Calculate monthly spending (12 months)
    const monthlySpent = Array(12).fill(0);
    yearlyTxns.forEach(t => {
      const txDate = t.transactionDate || (t as any).date;
      if (!txDate) return;
      const d = new Date(txDate);
      const m = d.getMonth(); // 0-11
      const type = (t.transactionType || '').toUpperCase();
      if (type === 'EXPENSE' || type === 'GAMBLING') {
        monthlySpent[m] += Math.abs(t.amount);
      }
    });

    const maxVal = Math.max(...monthlySpent);
    const minVal = Math.min(...monthlySpent);
    const range = maxVal - minVal;

    // Svg configuration
    const x_coords = [35, 85, 135, 185, 235, 285, 335, 385, 435, 485, 535, 585];
    const pts = monthlySpent.map((val, idx) => {
      const x = x_coords[idx];
      // Map to Y height 30 to 100
      const y = range === 0 ? 60 : 100 - ((val - minVal) / range) * 70;
      return { x, y, val };
    });

    const isNegativeNet = Math.abs(displayExpense) > displayIncome;
    const chartColor = isNegativeNet ? '#ef4444' : '#22c55e';
    const areaFillColor = isNegativeNet ? 'rgba(239, 68, 68, 0.06)' : 'rgba(34, 197, 94, 0.06)';

    let pathD = '';
    let areaD = '';
    if (pts.length > 0) {
      pathD = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaD = `M ${pts[0].x} 105 ` + pts.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x} 105 Z`;
    }

    const totalAmt = displayIncome + displayExpense;
    const incomePct = totalAmt > 0 ? displayIncome / totalAmt : 0.5;
    const expensePct = totalAmt > 0 ? displayExpense / totalAmt : 0.5;

    const radius = 32;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    const incomeOffset = circumference - (incomePct * circumference);
    const expenseOffset = circumference - (expensePct * circumference);

    let salesTitle = 'Sales in the last week';
    let cashTitle = 'Cash at the end of the month';
    let taxSubtitle = 'Employee Tax & Deductions';

    salesTitle = 'Inflows in the last week';
    cashTitle = 'Cash at the end of the month';
    taxSubtitle = 'Tax Plan & Deductions';


    if (userProfession === 'Farmer') {
      salesTitle = 'Crop Sales in past 6 months';
      cashTitle = 'Farm Cash at end of month';
      taxSubtitle = 'Section 10(1) Agri Deductions';
    } else if (userProfession === 'Freelancer') {
      salesTitle = 'Receipts in the last week';
      cashTitle = 'Freelance Cash at end of month';
      taxSubtitle = 'Sec 44ADA Tax & Write-offs';
    } else if (userProfession === 'Business') {
      salesTitle = 'Business Sales in the last week';
      cashTitle = 'Business Cash at end of month';
      taxSubtitle = 'Sec 44AD Business Tax Slab';
    } else if (userProfession === 'Salaried') {
      salesTitle = 'Salary & Inflow in the last week';
      cashTitle = 'Cash at the end of the month';
      taxSubtitle = 'Salaried Tax Plan & Deductions';
    } else if (userProfession === 'Student') {
      salesTitle = 'Pocket Money & Inflow in the last week';
      cashTitle = 'Balance at the end of the month';
      taxSubtitle = 'Student Savings Checklist';
    } else if (userProfession === 'Housewife') {
      salesTitle = 'Budget & Inflow in the last week';
      cashTitle = 'Household Cash at end of month';
      taxSubtitle = 'Household Savings Checklist';
    }

    const isFarmer = userProfession === 'Farmer';
    const barData = isFarmer
      ? [
          { label: 'Jan', val: 85, color: '#10b981' }, // Harvest sales (Mandi)
          { label: 'Feb', val: 0, color: '#71717a' },  // Planting phase (no sales)
          { label: 'Mar', val: 0, color: '#71717a' },  // Growing phase (no sales)
          { label: 'Apr', val: 0, color: '#71717a' },  // Growing phase (no sales)
          { label: 'May', val: 0, color: '#71717a' },  // Maturation phase (no sales)
          { label: 'Jun', val: 95, color: '#eab308' }  // Harvest sales (Mandi, 5 months apart)
        ]
      : [
          { label: 'Mon', val: 50, color: '#f59e0b' },
          { label: 'Tue', val: 75, color: '#f97316' },
          { label: 'Wed', val: 60, color: '#3b82f6' },
          { label: 'Thu', val: 90, color: '#10b981' }
        ];

    return (
      <View style={{ gap: 16 }}>

        {/* CASH AT THE END OF THE MONTH (LINE CHART) */}
        <View style={[styles.customCard, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 60 }]}>
          <View style={styles.customCardHeader}>
            <Text style={[styles.customCardTitle, { color: colors.text }]}>Analysis</Text>
            <TouchableOpacity
              onPress={() => setYearDropdownOpen(!yearDropdownOpen)}
              style={styles.yearDropdown}
            >
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '900' }}>{selectedYear} ▼</Text>
            </TouchableOpacity>
          </View>

          {yearDropdownOpen && (
            <View style={[styles.yearDropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[2026, 2025, 2024].map(yr => (
                <TouchableOpacity
                  key={yr}
                  onPress={() => {
                    setSelectedYear(yr);
                    setYearDropdownOpen(false);
                  }}
                  style={[
                    styles.yearDropdownItem,
                    yr === selectedYear && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
                  ]}
                >
                  <Text style={{ color: yr === selectedYear ? '#10b981' : colors.text, fontSize: 10, fontWeight: 'bold' }}>{yr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.lineChartContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <View style={{ width: 620, height: 140 }}>
                <Svg width={620} height={120} viewBox="0 0 620 120">
                  {/* Y Axis Gridlines */}
                  {[0.8, 0.6, 0.4, 0.2, 0].map((ratio, idx) => {
                    const yVal = 30 + ratio * 70;
                    const gridVal = minVal + ratio * range;
                    return (
                      <G key={idx}>
                        <Line x1="15" y1={yVal} x2="600" y2={yVal} stroke={colors.border} strokeWidth="1" strokeDasharray="3,3" />
                        <SvgText x="15" y={yVal - 4} fill={colors.subText} fontSize="6" fontWeight="bold">
                          ₹{Math.round(gridVal).toLocaleString('en-IN')}
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* Area under the path */}
                  {areaD ? (
                    <Path
                      d={areaD}
                      fill={areaFillColor}
                    />
                  ) : null}

                  {/* The main line */}
                  {pathD ? (
                    <Path
                      d={pathD}
                      fill="none"
                      stroke={chartColor}
                      strokeWidth="2.5"
                    />
                  ) : null}

                  {/* Circles and tooltip texts */}
                  {pts.map((pt, i) => (
                    <G key={i}>
                      <Circle cx={pt.x} cy={pt.y} r="4" fill={chartColor} />
                      <Circle cx={pt.x} cy={pt.y} r="2.2" fill="#ffffff" />
                      <SvgText x={pt.x} y={pt.y - 8} fill={colors.text} fontSize="7" fontWeight="bold" textAnchor="middle">
                        ₹{Math.round(pt.val).toLocaleString('en-IN')}
                      </SvgText>
                    </G>
                  ))}
                </Svg>
                
                {/* X Axis Month Labels */}
                <View style={{ flexDirection: 'row', width: 620, position: 'absolute', bottom: 0, left: 0 }}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
                    const leftPos = x_coords[i] - 15;
                    return (
                      <Text
                        key={i}
                        style={{
                          position: 'absolute',
                          left: leftPos,
                          width: 30,
                          textAlign: 'center',
                          fontSize: 8,
                          fontWeight: '700',
                          color: colors.subText
                        }}
                      >
                        {m}
                      </Text>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>

          <View style={styles.lineLegendRow}>
            <View style={[styles.legendLineIcon, { backgroundColor: chartColor }]} />
            <Text style={{ fontSize: 8.5, color: colors.subText, fontWeight: '700', textTransform: 'uppercase' }}>
              Monthly Spending
            </Text>
          </View>
        </View>

        {/* CATEGORY SPENDING (DONUT CHART) */}
        {ratioCardVisible && (
          <View style={[styles.customCard, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 50 }]}>
            <View style={styles.customCardHeader}>
              <Text style={[styles.customCardTitle, { color: colors.text }]}>Category Spending ({selectedYear})</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  style={styles.yearDropdown}
                >
                  <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '900' }}>
                    {selectedCategory === 'All' ? 'Exclude: None' : `Exclude: ${selectedCategory}`} ▼
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRatioCardVisible(false)}>
                  <Text style={{ fontSize: 11, color: colors.subText, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {categoryDropdownOpen && (
              <View style={[styles.yearDropdownList, { backgroundColor: colors.card, borderColor: colors.border, right: 16, top: 36, width: 140 }]}>
                {['All', ...Object.keys(CATEGORY_ICONS)].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setCategoryDropdownOpen(false);
                    }}
                    style={[
                      styles.yearDropdownItem,
                      cat === selectedCategory && { backgroundColor: 'rgba(99, 102, 241, 0.15)' }
                    ]}
                  >
                    <Text style={{ color: cat === selectedCategory ? '#6366f1' : colors.text, fontSize: 10, fontWeight: 'bold' }}>
                      {cat === 'All' ? 'Exclude: None' : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {data ? renderPieChart(getFilteredChartData()) : null}
          </View>
        )}

      </View>
    );
  };

  const loadDashboardData = async () => {
    try {
      const summaryRes = await api.get('/api/dashboard/summary');
      setData(summaryRes.data);

      const txnsRes = await api.get('/api/transactions');
      setTransactions(txnsRes.data || []);

      const profileStr = await AsyncStorage.getItem('passbook_user_profile');
      if (profileStr) {
        setProfile(JSON.parse(profileStr));
      }

      const combinedStr = await AsyncStorage.getItem('passbook_combined_features');
      setCombinedFeatures(combinedStr === 'true');

      // Load claimed deductions for reports
      const storedChecked = await AsyncStorage.getItem('tax_checked_items');
      const storedAmounts = await AsyncStorage.getItem('tax_claimed_amounts');
      if (storedChecked) setTaxCheckedItems(JSON.parse(storedChecked));
      if (storedAmounts) setTaxClaimedAmounts(JSON.parse(storedAmounts));

      const showVisVal = await AsyncStorage.getItem('passbook_show_visualizations');
      setShowVisualizations(showVisVal !== 'false');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Filter transactions for recent history (stop filtering, return recent 4)
  const getFilteredTransactions = () => {
    return transactions.slice(0, 4); // Limit to top 4 recent transactions
  };

  // Helper to handle mock pdf generation
  const handleDownloadPdf = async (type: 'report' | 'tax') => {
    setDownloadingPdf(true);
    try {
      const RNHTMLtoPDF = require('react-native-html-to-pdf');
      const RNFS = require('react-native-fs');

      // Build a simple HTML summary for the PDF
      const html = `
        <html>
          <body style="font-family: -apple-system, Roboto, 'Helvetica Neue', Arial; padding: 20px;">
            <h2>${type === 'report' ? 'Statement Report' : 'Tax Statement'}</h2>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <h3>Summary</h3>
            <ul>
              <li>Total Inflows: ₹${(data?.summary.totalIncome || 0).toLocaleString('en-IN')}</li>
              <li>Total Outflows: ₹${(data?.summary.totalExpenses || 0).toLocaleString('en-IN')}</li>
              <li>Net Savings: ₹${((data?.summary.totalIncome || 0) - (data?.summary.totalExpenses || 0)).toLocaleString('en-IN')}</li>
            </ul>
            <h3>Recent Transactions</h3>
            <table style="width:100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd">Date</th>
                  <th style="text-align:left; padding:6px; border-bottom:1px solid #ddd">Description</th>
                  <th style="text-align:right; padding:6px; border-bottom:1px solid #ddd">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.slice(0, 10).map(t => {
                  const dt = new Date(t.transactionDate || (t as any).date).toLocaleDateString('en-GB');
                  const amt = (t.amount || 0);
                  return `<tr><td style="padding:6px; border-bottom:1px solid #f1f1f1">${dt}</td><td style="padding:6px; border-bottom:1px solid #f1f1f1">${t.description}</td><td style="padding:6px; border-bottom:1px solid #f1f1f1; text-align:right">₹${amt.toLocaleString('en-IN')}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const options = {
        html,
        fileName: `passbook_${type}_${Date.now()}`,
        base64: false,
      };

      const file = await RNHTMLtoPDF.convert(options);
      // file.filePath contains the generated PDF path
      const savedPath = file.filePath;

      // On Android, we may want to move it to external storage; keep it simple and inform the user.
      Alert.alert('Download Complete', `PDF saved to: ${savedPath}`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      Alert.alert('Error', 'Failed to generate PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Filter and group chart data: exclude the selectedCategory if not "All"
  const getFilteredChartData = () => {
    if (!data) return [];
    const isExpense = pieFlowType === 'EXPENSE';
    const baseChartData = isExpense ? data.charts.category : data.charts.categoryIncome;

    if (selectedCategory === 'All') {
      return baseChartData;
    }

    const isMatch = (catName: string, filterName: string) => {
      if (!catName || !filterName) return false;
      const c = catName.toLowerCase();
      const f = filterName.toLowerCase();
      return c === f || c.includes(f) || f.includes(c);
    };

    return baseChartData.filter(item => !isMatch(item.name, selectedCategory));
  };

  // Helper to format date
  const formatTimeStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  // Donut SVG Pie Chart Renderer
  const renderPieChart = (chartData: { name: string; value: number }[]) => {
    const totalSum = chartData.reduce((sum, item) => sum + item.value, 0);
    const paletteColors = ['#6366f1', '#ec4899', '#f97316', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

    if (totalSum === 0) {
      return (
        <View style={styles.donutPlaceholder}>
          <Svg width={140} height={140} viewBox="0 0 120 120">
            <Circle
              cx="60"
              cy="60"
              r="48"
              fill="transparent"
              stroke="#27272a"
              strokeWidth="10"
              strokeDasharray="6,6"
            />
          </Svg>
          <View style={styles.donutPlaceholderContent}>
            <Text style={[styles.donutPlaceholderText, { color: colors.subText }]}>No Flow</Text>
            <Text style={[styles.donutPlaceholderSubText, { color: colors.subText }]}>Logged</Text>
          </View>
        </View>
      );
    }

    const radius = 48;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
      <View style={styles.pieContainer}>
        <View style={styles.donutWrapper}>
          <Svg width={140} height={140} viewBox="0 0 120 120">
            <G transform="rotate(-90 60 60)">
              {chartData.map((item, idx) => {
                const percent = item.value / totalSum;
                const strokeDashoffset = circumference - (percent * circumference);
                const rotation = accumulatedPercent * 360;
                accumulatedPercent += percent;

                return (
                  <Circle
                    key={item.name}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke={paletteColors[idx % paletteColors.length]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(${rotation} 60 60)`}
                    strokeLinecap="round"
                  />
                );
              })}
            </G>
          </Svg>
          <View style={styles.donutCenterContent}>
            <Text style={[styles.donutCenterLabel, { color: colors.subText }]}>TOTAL</Text>
            <Text style={[styles.donutCenterValue, { color: colors.text }]}>
              ₹{totalSum.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {chartData.slice(0, 4).map((item, idx) => {
            const percent = Math.round((item.value / totalSum) * 100);
            return (
              <View key={item.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: paletteColors[idx % paletteColors.length] }]} />
                <Text style={[styles.legendText, { color: colors.subText }]} numberOfLines={1}>
                  {item.name} ({percent}%)
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const hasData = data && (data.summary.totalIncome > 0 || data.summary.totalExpenses > 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#2fb09b" />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Fetching statement summary...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* TOP BAR BRANDING HEADER (SCROLLABLE WITH THE PAGE) */}
            <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: 0, borderBottomWidth: 0, paddingBottom: 8, paddingTop: 24 }]}>
              <View>
                <Text style={[styles.brandSub, { color: colors.subText }]}>
                  {profile ? `Welcome back, ${profile.name} (${profile.profession})` : 'Smart Finance companion'}
                </Text>
                <Text style={[styles.brandTitle, { color: colors.text }]}>SALT</Text>
              </View>
            </View>


            {/* CONSOLIDATED NET WORTH CARD */}
            <LinearGradient colors={['#06b6d4', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.netWorthCard, { borderColor: colors.border, paddingVertical: 12 }] }>
              <Text style={[styles.netWorthLabel, { color: '#ffffff' }]}>CONSOLIDATED NET WORTH</Text>
              <Text style={[styles.netWorthVal, { color: '#ffffff' }]}>
                ₹{((data?.summary.totalIncome || 0) - (data?.summary.totalExpenses || 0)).toLocaleString('en-IN')}
              </Text>
              <View style={[styles.netWorthRow, { marginTop: 6 }] }>
                <View style={styles.netWorthCol}>
                  <Text style={[styles.netWorthColLabel, { color: 'rgba(255,255,255,0.9)' }]}>TOTAL INFLOWS</Text>
                  <Text style={[styles.netWorthColAmt, { color: '#d1fae5' }]}>
                    ₹{(data?.summary.totalIncome || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                 <View style={styles.netWorthCol}>
                   <Text style={[styles.netWorthColLabel, { color: 'rgba(255,255,255,0.9)' }]}>TOTAL OUTFLOWS</Text>
                   <Text style={[styles.netWorthColAmt, { color: '#fecaca' }]}>
                     ₹{(data?.summary.totalExpenses || 0).toLocaleString('en-IN')}
                   </Text>
                 </View>
               </View>
            </LinearGradient>

            {/* FINANCIAL HUB SHORTCUTS */}
            {(() => {
              const showGst = combinedFeatures || userProfession === 'Business' || userProfession === 'Freelancer' || userProfession === 'Farmer';
              const showTax = combinedFeatures || (userProfession !== 'Student' && userProfession !== 'Housewife');

              if (!showGst && !showTax) return null;

              return (
                <View style={styles.hubSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax & Business Tools</Text>
                  <View style={styles.hubGrid}>
                    {showGst && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Gst')}
                        style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Text style={styles.hubIcon}>🏷️</Text>
                        <View style={styles.hubMeta}>
                          <Text style={[styles.hubCardTitle, { color: colors.text }]}>GST Portal</Text>
                          <Text style={[styles.hubCardDesc, { color: colors.subText }]}>Invoices & credit logs</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {showTax && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Tax')}
                        style={[styles.hubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Text style={styles.hubIcon}>📊</Text>
                        <View style={styles.hubMeta}>
                          <Text style={[styles.hubCardTitle, { color: colors.text }]}>Tax Center</Text>
                          <Text style={[styles.hubCardDesc, { color: colors.subText }]}>Calculators & investments</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* CONDITIONAL CHARTS LAYOUT */}
            {showVisualizations && renderBusinessDashboard()}

            {/* RECENT HISTORY BLOCK */}
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>Recent History</Text>
                {transactions.length > 0 ? (
                  <TouchableOpacity onPress={() => setActiveTab('Transactions')}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {getFilteredTransactions().length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Text style={[styles.emptyHistoryText, { color: colors.subText }]}>
                    No statements logged for {selectedCategory}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddTransaction')}
                    style={[styles.addFirstBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <Text style={[styles.addFirstBtnText, { color: colors.text }]}>+ Log Transaction</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {getFilteredTransactions().map(txn => {
                    const isExpense = txn.amount < 0;
                    const catName = typeof txn.category === 'object' ? txn.category.name : txn.category;
                    const emoji = CATEGORY_ICONS[catName || ''] || '💰';

                    return (
                      <View key={txn.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                        <View style={styles.historyItemLeft}>
                          <View style={[styles.historyIconBox, { backgroundColor: colors.background }]}>
                            <Text style={styles.historyIconEmoji}>{emoji}</Text>
                          </View>
                          <View>
                            <Text style={[styles.historyItemTitle, { color: colors.text }]} numberOfLines={1}>
                              {txn.description}
                            </Text>
                            <Text style={[styles.historyItemDate, { color: colors.subText }]}>
                              {formatTimeStr(txn.transactionDate || (txn as any).date)} • {txn.paymentMethod || 'UPI'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.historyItemAmt, isExpense ? styles.expenseColor : styles.incomeColor]}>
                          {isExpense ? '-' : '+'}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>


          </ScrollView>
        )}

        {/* REPORTS PREVIEW MODAL */}
        <Modal
          visible={reportModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Monthly Statement</Text>
                <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                  <Text style={{ fontSize: 16, color: colors.subText }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSub, { color: colors.subText }]}>Statement Period: 01 May - 31 May 2026</Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.subText, fontSize: 11 }}>Total Revenue Inflow</Text>
                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '900' }}>₹{(displayIncome || 25000).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.subText, fontSize: 11 }}>Total Outflow Bills</Text>
                    <Text style={{ color: '#f43f5e', fontSize: 12, fontWeight: '900' }}>₹{Math.abs(displayExpense || 18500).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.subText, fontSize: 11, fontWeight: 'bold' }}>Net Cash Savings</Text>
                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '900' }}>₹{(displayIncome - Math.abs(displayExpense) || 6500).toLocaleString('en-IN')}</Text>
                  </View>

                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.text, marginTop: 12, textTransform: 'uppercase' }}>Audited Ledger Statements</Text>
                  {transactions.slice(0, 5).map(t => {
                    const isExpense = t.amount < 0;
                    return (
                      <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{t.description}</Text>
                          <Text style={{ color: colors.subText, fontSize: 8 }}>{new Date(t.transactionDate || (t as any).date).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <Text style={{ color: isExpense ? '#f43f5e' : '#10b981', fontSize: 11, fontWeight: '800' }}>
                          {isExpense ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => {
                  setReportModalVisible(false);
                  handleDownloadPdf('report');
                }}
                style={{ backgroundColor: '#f43f5e', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Download PDF Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* TAX DEDUCTIONS PREVIEW MODAL */}
        <Modal
          visible={taxModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setTaxModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Tax Plan Details</Text>
                <TouchableOpacity onPress={() => setTaxModalVisible(false)}>
                  <Text style={{ fontSize: 16, color: colors.subText }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSub, { color: colors.subText }]}>Assessment Year: FY 2026-27</Text>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.subText, fontSize: 11 }}>Annual Gross Income</Text>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800' }}>
                      ₹{((profile?.monthlyIncome || 60000) * 12).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.subText, fontSize: 11 }}>Claimed Deductions Checklist</Text>
                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                      ₹{Object.values(taxClaimedAmounts).reduce((sum, v) => sum + v, 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.text, marginTop: 12, textTransform: 'uppercase' }}>Deductions Itemization</Text>
                  {taxCheckedItems.length === 0 ? (
                    <Text style={{ color: colors.subText, fontSize: 10, fontStyle: 'italic' }}>No deductions claimed. Go to Tax Planner Checklist to claim write-offs.</Text>
                  ) : (
                    taxCheckedItems.map(itemId => {
                      const amount = taxClaimedAmounts[itemId] || 0;
                      return (
                        <View key={itemId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                          <Text style={{ color: colors.subText, fontSize: 10, flex: 1, marginRight: 8 }} numberOfLines={1}>{itemId.toUpperCase()}</Text>
                          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>₹{amount.toLocaleString('en-IN')}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => {
                  setTaxModalVisible(false);
                  handleDownloadPdf('tax');
                }}
                style={{ backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Download PDF Statement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Home" />

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  brandSub: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  netWorthCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  netWorthLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  netWorthVal: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  netWorthCol: {
    flex: 1,
    alignItems: 'center',
  },
  netWorthColLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  netWorthColAmt: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  netWorthDivider: {
    width: 1,
    height: 24,
  },
  incomeColor: {
    color: '#10b981',
  },
  expenseColor: {
    color: '#f43f5e',
  },
  categorySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  categoryScroll: {
    paddingVertical: 2,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  breakdownCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    paddingBottom: 10,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  breakdownSub: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
  },
  toggleBtnText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#71717a',
  },
  toggleBtnTextActive: {
    color: '#09090b',
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  donutWrapper: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  donutCenterValue: {
    fontSize: 12.5,
    fontWeight: '900',
    marginTop: 2,
  },
  donutPlaceholder: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  donutPlaceholderContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutPlaceholderText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  donutPlaceholderSubText: {
    fontSize: 7.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '700',
    flex: 1,
  },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  hubSection: {
    marginBottom: 16,
  },
  hubGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  hubCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  hubIcon: {
    fontSize: 20,
  },
  hubMeta: {
    flex: 1,
  },
  hubCardTitle: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  hubCardDesc: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  viewAllText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2fb09b',
    textTransform: 'uppercase',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyHistoryText: {
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  addFirstBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addFirstBtnText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyIconEmoji: {
    fontSize: 16,
  },
  historyItemTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  historyItemDate: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  historyItemAmt: {
    fontSize: 12,
    fontWeight: '900',
  },
  insightsCard: {
    backgroundColor: 'rgba(47,176,155,0.03)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(47,176,155,0.15)',
    paddingBottom: 8,
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2fb09b',
    marginLeft: 6,
    letterSpacing: 1,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  insightBullet: {
    color: '#2fb09b',
    marginRight: 6,
    fontSize: 10,
    fontWeight: '900',
  },
  insightText: {
    color: '#a1a1aa',
    fontSize: 9.5,
    fontWeight: '700',
    flex: 1,
    lineHeight: 13,
  },
  customCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  customCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customCardTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  moreIcon: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  barChartContainer: {
    height: 140,
    position: 'relative',
    flexDirection: 'row',
  },
  yAxisContainer: {
    width: 30,
    height: 120,
    justifyContent: 'space-between',
  },
  gridLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    width: '100%',
  },
  yAxisText: {
    fontSize: 7.5,
    fontWeight: '800',
    width: 24,
    textAlign: 'right',
  },
  gridLine: {
    height: 1,
    flex: 1,
    marginLeft: 6,
    opacity: 0.1,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingLeft: 10,
  },
  barItem: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 100,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
  },
  barLabelText: {
    fontSize: 8.5,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  scrollIndicatorBg: {
    height: 4,
    borderRadius: 2,
    width: 100,
    alignSelf: 'center',
    overflow: 'hidden',
    marginTop: 12,
  },
  scrollIndicatorFill: {
    height: '100%',
    borderRadius: 2,
  },
  yearDropdown: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  lineChartContainer: {
    height: 150,
    position: 'relative',
  },
  yAxisContainerLine: {
    position: 'absolute',
    left: 0,
    top: 15,
    right: 0,
    height: 105,
    justifyContent: 'space-between',
  },
  gridLineRowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  svgOverlay: {
    position: 'absolute',
    left: 20,
    top: 15,
    right: 0,
    height: 120,
    zIndex: 10,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 30,
    paddingRight: 10,
    marginTop: 125,
  },
  xAxisText: {
    fontSize: 8,
    fontWeight: '800',
  },
  lineLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  legendLineIcon: {
    width: 24,
    height: 2,
    backgroundColor: '#22c55e',
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  ratioLegendContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 12,
  },
  ratioLegendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ratioLegendLabel: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  ratioLegendValue: {
    fontSize: 10,
    fontWeight: '900',
  },
  splitCardsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  splitCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  splitCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  splitCardSub: {
    fontSize: 7.5,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  splitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  splitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  splitBtnText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  splitViewTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  splitViewText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  yearDropdownList: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: 90,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 10000,
    elevation: 8,
  },
  yearDropdownItem: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  }
});

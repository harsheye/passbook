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
import Svg, { Circle, G, Text as SvgText, Path, Line, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { api, Transaction, fetchSchedulesApi, approveOccurrenceApi, skipOccurrenceApi, RecurringTransaction } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBar } from '../components/BottomTabBar';
import { SparklesIcon } from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';
import { useTab } from '../context/TabContext';
import { LinearGradient } from 'expo-linear-gradient';

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

// Lottie animation placeholder to avoid unresolved local requires
let sparkleAnim: any = null;

const getEffectiveNextRunDate = (item: RecurringTransaction) => {
  const nextRun = new Date(item.nextRunDate);
  if (isNaN(nextRun.getTime())) {
    return new Date(); // Safe fallback
  }
  const catName = typeof item.category === 'object' ? (item.category as any).name : item.category;
  const cat = (catName || '').toLowerCase();
  const isNecessity = cat.includes('utility') || cat.includes('bill') || cat.includes('rent') || cat.includes('grocer');
  if (isNecessity) {
    nextRun.setDate(nextRun.getDate() - 1);
  }
  return nextRun;
};

const getPendingText = (item: RecurringTransaction) => {
  const catName = typeof item.category === 'object' ? (item.category as any).name : item.category;
  const cat = (catName || '').toLowerCase();
  const isNecessity = cat.includes('utility') || cat.includes('bill') || cat.includes('rent') || cat.includes('grocer');
  if (isNecessity) {
    const nextRun = new Date(item.nextRunDate);
    if (isNaN(nextRun.getTime())) {
      return 'Pending Approval';
    }
    const formattedDate = nextRun.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${item.description} on ${formattedDate} today pay or skip`;
  }
  return 'Pending Approval';
};

const describeAnnularSector = (
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngleRad: number,
  endAngleRad: number
) => {
  let diff = endAngleRad - startAngleRad;
  if (diff < 0) {
    diff += 2 * Math.PI;
  }
  if (diff >= 2 * Math.PI) {
    diff = 2 * Math.PI - 0.0001;
  }
  const adjustedEnd = startAngleRad + diff;

  const xInnerStart = cx + rInner * Math.cos(startAngleRad);
  const yInnerStart = cy + rInner * Math.sin(startAngleRad);
  const xOuterStart = cx + rOuter * Math.cos(startAngleRad);
  const yOuterStart = cy + rOuter * Math.sin(startAngleRad);
  
  const xOuterEnd = cx + rOuter * Math.cos(adjustedEnd);
  const yOuterEnd = cy + rOuter * Math.sin(adjustedEnd);
  const xInnerEnd = cx + rInner * Math.cos(adjustedEnd);
  const yInnerEnd = cy + rInner * Math.sin(adjustedEnd);

  const largeArcFlag = diff > Math.PI ? 1 : 0;

  return [
    `M ${xInnerStart} ${yInnerStart}`,
    `L ${xOuterStart} ${yOuterStart}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${xOuterEnd} ${yOuterEnd}`,
    `L ${xInnerEnd} ${yInnerEnd}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${xInnerStart} ${yInnerStart}`,
    'Z'
  ].join(' ');
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();
  const { activeTab, setActiveTab } = useTab();

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
  const [radialCardVisible, setRadialCardVisible] = useState<boolean>(true);

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

  // Overdue and notifications states
  const [schedules, setSchedules] = useState<RecurringTransaction[]>([]);
  const [overdueItem, setOverdueItem] = useState<RecurringTransaction | null>(null);
  const [dismissedOverdue, setDismissedOverdue] = useState<boolean>(false);

  // Chart interactivity states
  const [activeCandle, setActiveCandle] = useState<{ month: number; side: 'left' | 'right' } | null>(null);
  const [activeDonutSlice, setActiveDonutSlice] = useState<{
    type: 'inner' | 'outer';
    name: string;
    value: number;
    parentName?: string;
    percent: number;
    x: number;
    y: number;
  } | null>(null);

  const yearlyTxns = transactions.filter(t => {
    const txDate = t.transactionDate || (t as any).date;
    if (!txDate) return false;
    const d = new Date(txDate);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === selectedYear;
  });

  let displayIncome = 0;
  let displayExpense = 0;
  yearlyTxns.forEach(t => {
    const type = (t.transactionType || '').toUpperCase();
    const amt = Math.abs(parseFloat(t.amount as any));
    if (isNaN(amt)) return;
    if (type === 'INCOME') {
      displayIncome += amt;
    } else if (type === 'EXPENSE' || type === 'GAMBLING') {
      displayExpense += amt;
    }
  });

  // Fixed mini-chart values for Consolidated Net Worth card (stable UI)
  const miniValues = [displayIncome || 0, Math.abs(displayExpense) || 0, Math.abs(displayIncome - displayExpense) || 0];
  const miniMax = Math.max(...miniValues, 1);
  const miniHeights = miniValues.map(v => (v / miniMax) * 80); // up to 80px height

  const userProfession = selectedDashboardProf || profile?.profession || 'Salaried';

  const renderBusinessDashboard = () => {
    // Calculate monthly cumulative net balance (Inflows - Outflows)
    const monthlyNet = Array(12).fill(0);
    const monthlyInflow = Array(12).fill(0);
    const monthlyOutflow = Array(12).fill(0);

    yearlyTxns.forEach(t => {
      const txDate = t.transactionDate || (t as any).date;
      if (!txDate) return;
      const d = new Date(txDate);
      if (isNaN(d.getTime())) return;
      const m = d.getMonth(); // 0-11
      const type = (t.transactionType || '').toUpperCase();
      const amt = Math.abs(parseFloat(t.amount as any));
      if (isNaN(amt)) return;
      if (type === 'INCOME') {
        monthlyInflow[m] += amt;
        monthlyNet[m] += amt;
      } else if (type === 'EXPENSE' || type === 'GAMBLING') {
        monthlyOutflow[m] += amt;
        monthlyNet[m] -= amt;
      }
    });

    const monthlyMaxHeights = Array(12).fill(0).map((_, j) => {
      const mIn = monthlyInflow[j];
      const mOut = monthlyOutflow[j];
      const mSav = Math.max(0, monthlyNet[j]);
      const mSorted = [mIn, mOut, mSav].sort((a, b) => a - b);
      return mSorted[0] + mSorted[2];
    });
    const maxOverallHeight = Math.max(...monthlyMaxHeights, 1);

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 32; // Horizontal padding: 16px on each side.
    const height = 300; // Increased height to prevent data clipping
    const cx = chartWidth / 2;
    const cy = 150; // Centered vertically in 300px
    const r0 = 38; // inner circle radius
    const rMax = Math.min(chartWidth / 2 - 45, 115); // Scale maximum outer radius dynamically, capping at 115

    // Theme-specific strokes for gridlines and wedges
    const gridStroke = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)';
    const borderStroke = isDark ? '#ffffff' : '#000000';
    const wedgeStroke = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)';

    // Semantic colors for circular visualization (Green for Inflow, Red for Outflow, Indigo for Savings)
    const inflowColor = isDark ? 'rgba(52, 211, 153, 0.75)' : 'rgba(16, 185, 129, 0.8)';
    const outflowColor = isDark ? 'rgba(248, 113, 113, 0.75)' : 'rgba(239, 68, 68, 0.8)';
    const savingsColor = isDark ? 'rgba(99, 102, 241, 0.95)' : 'rgba(79, 70, 229, 1.0)';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let salesTitle = 'Inflows in the last week';
    let cashTitle = 'Cash at the end of the month';
    let taxSubtitle = 'Employee Tax & Deductions';

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

    return (
      <View style={{ gap: 16 }}>

        {/* CASH AT THE END OF THE MONTH (WIND-ROSE / POLAR STACKED AREA CHART) */}
        {radialCardVisible && (
          <View style={[styles.customCard, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 60 }]}>
            <View style={styles.customCardHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.customCardTitle, { color: colors.text }]} numberOfLines={1}>{cashTitle}</Text>
                <Text style={{ fontSize: 7.5, color: colors.subText, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>Monthly Stacked Circular Distribution</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setYearDropdownOpen(!yearDropdownOpen)}
                  style={[
                    styles.yearDropdown,
                    {
                      borderRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                      borderWidth: 1,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800', marginRight: 6 }}>{selectedYear}</Text>
                  <Text style={{ color: '#10b981', fontSize: 9 }}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRadialCardVisible(false)}>
                  <Text style={{ fontSize: 11, color: colors.subText, fontWeight: '800', paddingLeft: 4 }}>✕</Text>
                </TouchableOpacity>
              </View>
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
                      yr === selectedYear && { backgroundColor: 'rgba(16, 185, 129, 0.12)' }
                    ]}
                  >
                    <Text style={{ color: yr === selectedYear ? '#10b981' : colors.text, fontSize: 11, fontWeight: 'bold' }}>{yr}</Text>
                    {yr === selectedYear && <Text style={{ color: '#10b981', fontSize: 11, fontWeight: 'bold' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 300, width: chartWidth, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Svg width={chartWidth} height={300} viewBox={`0 0 ${chartWidth} 300`}>
                {/* Darker circular background region */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={rMax}
                  fill={isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.02)'}
                />

                {/* Concentric Gridlines (solid, thin, subtle) */}
                {[40, 58, 76].map((radius, idx) => (
                  <Circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="transparent"
                    stroke={gridStroke}
                    strokeWidth="0.8"
                    opacity={0.35}
                  />
                ))}

                {/* Solid Outer Border Circle */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={rMax}
                  fill="transparent"
                  stroke={borderStroke}
                  strokeWidth="1.5"
                />

                {/* Sector boundary tick marks */}
                {months.map((_, i) => {
                  const angle = (i * 30 - 90) * Math.PI / 180;
                  const x1 = cx + rMax * Math.cos(angle);
                  const y1 = cy + rMax * Math.sin(angle);
                  const x2 = cx + (rMax + 5) * Math.cos(angle);
                  const y2 = cy + (rMax + 5) * Math.sin(angle);
                  return (
                    <Line
                      key={`tick-${i}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={borderStroke}
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Wedge paths for 12 months */}
                {months.map((m, i) => {
                  const startAngle = (i * 30 - 90) * Math.PI / 180;
                  const endAngle = ((i + 1) * 30 - 90) * Math.PI / 180;
                  const midAngle = (startAngle + endAngle) / 2;

                  const pad = 1.8 * Math.PI / 180;
                  const gap = 0.8 * Math.PI / 180;

                  const startLeft = startAngle + pad;
                  const endLeft = midAngle - gap;
                  const startRight = midAngle + gap;
                  const endRight = endAngle - pad;

                  const valIn = monthlyInflow[i];
                  const valOut = monthlyOutflow[i];
                  const valNet = monthlyNet[i];

                  const vSavings = Math.max(0, valNet);
                  const vOutflow = valOut;
                  const vInflow = valIn;

                  const items = [
                    { val: vInflow, color: inflowColor, label: 'Inflow' },
                    { val: vOutflow, color: outflowColor, label: 'Outflow' },
                    { val: vSavings, color: savingsColor, label: 'Savings' }
                  ];
                  const sorted = [...items].sort((a, b) => a.val - b.val);
                  const lowest = sorted[0];
                  const middle = sorted[1];
                  const highest = sorted[2];

                  const rMid = r0 + (middle.val / maxOverallHeight) * (rMax - r0);
                  const rLow = r0 + (lowest.val / maxOverallHeight) * (rMax - r0);
                  const rHigh = rLow + (highest.val / maxOverallHeight) * (rMax - r0);

                  // Month Label Position
                  const xLabel = cx + (rMax + 18) * Math.cos(midAngle);
                  const yLabel = cy + (rMax + 18) * Math.sin(midAngle);

                  // Guides
                  const guideX = cx + rMax * Math.cos(startAngle);
                  const guideY = cy + rMax * Math.sin(startAngle);

                  return (
                    <G key={i}>
                      {/* Sector Highlight Wedge background (grey translucent behind) */}
                      {activeCandle && activeCandle.month === i && (
                        <Path
                          d={describeAnnularSector(
                            cx,
                            cy,
                            r0,
                            (activeCandle.side === 'left' ? rMid : rHigh) + 8,
                            activeCandle.side === 'left' ? startLeft - 0.01 : startRight - 0.01,
                            activeCandle.side === 'left' ? endLeft + 0.01 : endRight + 0.01
                          )}
                          fill={isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"}
                        />
                      )}

                      {/* Sector guide line */}
                      <Line
                        x1={cx}
                        y1={cy}
                        x2={guideX}
                        y2={guideY}
                        stroke={gridStroke}
                        strokeWidth="0.8"
                        opacity="0.3"
                      />

                      {/* Left Candle: Middle value */}
                      {middle.val > 0 && (
                        <Path
                          d={describeAnnularSector(cx, cy, r0, rMid, startLeft, endLeft)}
                          fill={middle.color}
                          stroke={wedgeStroke}
                          strokeWidth={1}
                        />
                      )}

                      {/* Right Candle Bottom Segment: Lowest value */}
                      {lowest.val > 0 && (
                        <Path
                          d={describeAnnularSector(cx, cy, r0, rLow, startRight, endRight)}
                          fill={lowest.color}
                          stroke={wedgeStroke}
                          strokeWidth={1}
                        />
                      )}

                      {/* Right Candle Top Segment: Highest value */}
                      {highest.val > 0 && (
                        <Path
                          d={describeAnnularSector(cx, cy, rLow, rHigh, startRight, endRight)}
                          fill={highest.color}
                          stroke={wedgeStroke}
                          strokeWidth={1}
                        />
                      )}

                      {/* Month text label */}
                      <SvgText
                        x={xLabel}
                        y={yLabel + 3}
                        textAnchor="middle"
                        fill={colors.subText}
                        fontSize="8.5"
                        fontWeight="bold"
                      >
                        {m}
                      </SvgText>

                      {/* Invisible tap target for Left Candle */}
                      <Path
                        d={describeAnnularSector(cx, cy, r0, Math.max(rMid + 15, rMax + 15), startAngle, midAngle)}
                        fill="transparent"
                        onPress={() => {
                          if (activeCandle && activeCandle.month === i && activeCandle.side === 'left') {
                            setActiveCandle(null);
                          } else {
                            setActiveCandle({ month: i, side: 'left' });
                          }
                        }}
                      />

                      {/* Invisible tap target for Right Candle */}
                      <Path
                        d={describeAnnularSector(cx, cy, r0, Math.max(rHigh + 15, rMax + 15), midAngle, endAngle)}
                        fill="transparent"
                        onPress={() => {
                          if (activeCandle && activeCandle.month === i && activeCandle.side === 'right') {
                            setActiveCandle(null);
                          } else {
                            setActiveCandle({ month: i, side: 'right' });
                          }
                        }}
                      />
                    </G>
                  );
                })}

                {/* Center Text Cover Circle */}
                <Circle 
                  cx={cx} 
                  cy={cy} 
                  r={r0 - 2} 
                  fill={colors.card} 
                  stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} 
                  strokeWidth={1.5}
                />
                {(() => {
                  const label = activeCandle !== null ? months[activeCandle.month].toUpperCase() : 'NET';
                  const netVal = activeCandle !== null ? monthlyNet[activeCandle.month] : (displayIncome - displayExpense);
                  const absNetStr = Math.abs(Math.round(netVal)).toLocaleString('en-IN');
                  const netText = `${netVal < 0 ? '-' : ''}₹${absNetStr}`;
                  return (
                    <G>
                      <SvgText
                        x={cx}
                        y={cy - 4}
                        textAnchor="middle"
                        fill={colors.subText}
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {label}
                      </SvgText>
                      <SvgText
                        x={cx}
                        y={cy + 8}
                        textAnchor="middle"
                        fill={netVal >= 0 ? '#10b981' : '#ef4444'}
                        fontSize="9.5"
                        fontWeight="bold"
                      >
                        {netText}
                      </SvgText>
                    </G>
                  );
                })()}
              </Svg>

              {/* Floating Tooltip overlay (positioned dynamically near active candle) */}
              {activeCandle !== null && (() => {
                const i = activeCandle.month;
                const startAngle = (i * 30 - 90) * Math.PI / 180;
                const endAngle = ((i + 1) * 30 - 90) * Math.PI / 180;
                const midAngle = (startAngle + endAngle) / 2;

                const pad = 1.8 * Math.PI / 180;
                const gap = 0.8 * Math.PI / 180;

                const angleLeft = (startAngle + pad + midAngle - gap) / 2;
                const angleRight = (midAngle + gap + endAngle - pad) / 2;

                const candleAngle = activeCandle.side === 'left' ? angleLeft : angleRight;

                const valIn = monthlyInflow[i];
                const valOut = monthlyOutflow[i];
                const valNet = monthlyNet[i];
                const vSavings = Math.max(0, valNet);
                const vOutflow = valOut;
                const vInflow = valIn;

                const items = [
                  { val: vInflow, color: inflowColor, label: 'Inflow' },
                  { val: vOutflow, color: outflowColor, label: 'Outflow' },
                  { val: vSavings, color: savingsColor, label: 'Savings' }
                ];
                const sorted = [...items].sort((a, b) => a.val - b.val);
                const lowest = sorted[0];
                const middle = sorted[1];
                const highest = sorted[2];

                const rMid = r0 + (middle.val / maxOverallHeight) * (rMax - r0);
                const rLow = r0 + (lowest.val / maxOverallHeight) * (rMax - r0);
                const rHigh = rLow + (highest.val / maxOverallHeight) * (rMax - r0);

                const candleRadius = activeCandle.side === 'left' ? rMid : rHigh;
                const rTooltip = Math.min(candleRadius + 15, rMax + 20);

                const tx = cx + rTooltip * Math.cos(candleAngle);
                const ty = cy + rTooltip * Math.sin(candleAngle);

                const tooltipLeft = Math.max(10, Math.min(chartWidth - 170, tx - 80));
                const tooltipTop = Math.max(10, Math.min(300 - 120, ty - 50));

                const isLeft = activeCandle.side === 'left';

                return (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setActiveCandle(null)}
                    style={{
                      position: 'absolute',
                      left: tooltipLeft,
                      top: tooltipTop,
                      backgroundColor: isDark ? '#18181b' : '#ffffff',
                      borderColor: colors.border,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      padding: 10,
                      width: 160,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 5,
                      elevation: 5,
                      zIndex: 200,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '900', color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4, marginBottom: 6 }}>
                      {months[i]} {selectedYear} ({isLeft ? 'Savings' : 'Flows'})
                    </Text>

                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#34d399' : '#10b981' }} />
                          <Text style={{ fontSize: 9.5, color: colors.subText, fontWeight: (!isLeft && (highest.label === 'Inflow' || lowest.label === 'Inflow')) ? '900' : '500' }}>Inflow</Text>
                        </View>
                        <Text style={{ fontSize: 9.5, color: colors.text, fontWeight: (!isLeft && (highest.label === 'Inflow' || lowest.label === 'Inflow')) ? '900' : '500' }}>
                          ₹{Math.round(valIn).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#f87171' : '#ef4444' }} />
                          <Text style={{ fontSize: 9.5, color: colors.subText, fontWeight: (!isLeft && (highest.label === 'Outflow' || lowest.label === 'Outflow')) ? '900' : '500' }}>Outflow</Text>
                        </View>
                        <Text style={{ fontSize: 9.5, color: colors.text, fontWeight: (!isLeft && (highest.label === 'Outflow' || lowest.label === 'Outflow')) ? '900' : '500' }}>
                          ₹{Math.round(valOut).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#6366f1' : '#4f46e5' }} />
                          <Text style={{ fontSize: 9.5, color: colors.subText, fontWeight: (isLeft || highest.label === 'Savings' || lowest.label === 'Savings') ? '900' : '500' }}>Savings</Text>
                        </View>
                        <Text style={{ fontSize: 9.5, color: '#10b981', fontWeight: (isLeft || highest.label === 'Savings' || lowest.label === 'Savings') ? '900' : '500' }}>
                          ₹{Math.round(vSavings).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()}
            </View>

            <View style={styles.lineLegendRow}>
              <View style={[styles.legendLineIcon, { backgroundColor: isDark ? '#34d399' : '#10b981', height: 4, borderRadius: 2 }]} />
              <Text style={{ fontSize: 8.5, color: colors.subText, fontWeight: '700', textTransform: 'uppercase', marginRight: 12 }}>
                Inflow
              </Text>
              <View style={[styles.legendLineIcon, { backgroundColor: isDark ? '#f87171' : '#ef4444', height: 4, borderRadius: 2 }]} />
              <Text style={{ fontSize: 8.5, color: colors.subText, fontWeight: '700', textTransform: 'uppercase', marginRight: 12 }}>
                Outflow
              </Text>
              <View style={[styles.legendLineIcon, { backgroundColor: isDark ? '#6366f1' : '#4f46e5', height: 4, borderRadius: 2 }]} />
              <Text style={{ fontSize: 8.5, color: colors.subText, fontWeight: '700', textTransform: 'uppercase' }}>
                Savings
              </Text>
            </View>
          </View>
        )}

        {/* CATEGORY SPENDING (DOUBLE-DONUT CHART) */}
        {ratioCardVisible && (
          <View style={[styles.customCard, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 50 }]}>
            <View style={styles.customCardHeader}>
              <Text style={[styles.customCardTitle, { color: colors.text }]}>Category Spending ({selectedYear})</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  style={[
                    styles.categoryDropdown,
                    {
                      borderRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      borderColor: 'rgba(99, 102, 241, 0.25)',
                      borderWidth: 1,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '800', marginRight: 6 }}>
                    {selectedCategory === 'All' ? 'Filter: None' : `Filter: ${selectedCategory}`}
                  </Text>
                  <Text style={{ color: '#6366f1', fontSize: 9 }}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRatioCardVisible(false)}>
                  <Text style={{ fontSize: 11, color: colors.subText, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {categoryDropdownOpen && (
              <View style={[styles.yearDropdownList, { backgroundColor: colors.card, borderColor: colors.border, right: 16, top: 42, width: 170, maxHeight: 220 }]}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  {['All', ...Object.keys(CATEGORY_ICONS)].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setCategoryDropdownOpen(false);
                      }}
                      style={[
                        styles.yearDropdownItem,
                        cat === selectedCategory && { backgroundColor: 'rgba(99, 102, 241, 0.12)' }
                      ]}
                    >
                      <Text style={{ color: cat === selectedCategory ? '#6366f1' : colors.text, fontSize: 11, fontWeight: 'bold', flex: 1 }} numberOfLines={1}>
                        {cat === 'All' ? 'Filter: None' : cat}
                      </Text>
                      {cat === selectedCategory && <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: 'bold' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {data ? renderPieChart(pieFlowType === 'EXPENSE' ? data.charts.category : data.charts.categoryIncome) : null}
          </View>
        )}

      </View>
    );
  };

  const checkEightPmNotifications = async (schedulesList: RecurringTransaction[]) => {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 20) { // 8 PM or later
      const todayStr = now.toISOString().split('T')[0];
      const lastWarned = await AsyncStorage.getItem('last_8pm_warning_date');
      if (lastWarned === todayStr) {
        return; // Already warned today
      }

      // Find any active schedule due today (or earlier) that hasn't been approved
      const pendingToday = schedulesList.filter(s => {
        if ((s.status || 'ACTIVE') === 'COMPLETED') return false;
        const due = new Date(s.nextRunDate);
        return due.toISOString().split('T')[0] <= todayStr;
      });

      if (pendingToday.length > 0) {
        const names = pendingToday.map(s => s.description).join(', ');
        Alert.alert(
          'Payment Due Reminder',
          `Your payment for ${names} will become overdue soon. Please approve or skip before the end of the day.`,
          [{ text: 'OK' }]
        );
        await AsyncStorage.setItem('last_8pm_warning_date', todayStr);
      }
    }
  };

  const handleApproveOverdue = async (id: string) => {
    try {
      await approveOccurrenceApi(id);
      loadDashboardData();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve occurrence.');
    }
  };

  const handleSkipOverdue = async (id: string) => {
    try {
      await skipOccurrenceApi(id);
      loadDashboardData();
    } catch (err) {
      Alert.alert('Error', 'Failed to skip occurrence.');
    }
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

      // Fetch schedules to check for overdue items
      const schedRes = await fetchSchedulesApi();
      setSchedules(schedRes);

      // Check for overdue item to display in overlay
      const overdueList = schedRes.filter(s => {
        if ((s.status || 'ACTIVE') === 'COMPLETED') return false;
        const effectiveDate = getEffectiveNextRunDate(s);
        return effectiveDate <= new Date();
      });

      // Sort overdue items ascendingly by nextRunDate
      overdueList.sort((a, b) => new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime());

      if (overdueList.length > 0) {
        setOverdueItem(overdueList[0]);
      } else {
        setOverdueItem(null);
      }

      // Check 8 PM warnings
      await checkEightPmNotifications(schedRes);

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

  // Filter transactions for recent history (filter by category if selected)
  const getFilteredTransactions = () => {
    let filtered = transactions;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(t => {
        const catName = typeof t.category === 'object' ? t.category.name : t.category;
        return catName === selectedCategory;
      });
    }
    return filtered.slice(0, 4); // Limit to top 4 recent transactions
  };

  // Helper to handle mock pdf generation
  const handleDownloadPdf = async (type: 'report' | 'tax') => {
    setDownloadingPdf(true);
    try {
      // Simulate statement generation
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
      Alert.alert(
        'Statement Generated',
        `${type === 'report' ? 'Statement Report' : 'Tax Statement'} has been generated successfully and saved to your device.`,
        [{ text: 'OK' }]
      );
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

  // Donut SVG Pie Chart Renderer (Centered, Legend Below, Filterable Badges)
  const renderPieChart = (chartData: { name: string; value: number }[]) => {
    const totalSum = chartData.reduce((sum, item) => sum + item.value, 0);

    if (totalSum === 0) {
      return (
        <View style={styles.donutPlaceholder}>
          <Svg width={160} height={160} viewBox="0 0 120 120">
            <Circle
              cx="60"
              cy="60"
              r="48"
              fill="transparent"
              stroke="#27272a"
              strokeWidth="10"
              strokeDasharray={[6, 6]}
            />
          </Svg>
          <View style={styles.donutPlaceholderContent}>
            <Text style={[styles.donutPlaceholderText, { color: colors.subText }]}>No Flow</Text>
            <Text style={[styles.donutPlaceholderSubText, { color: colors.subText }]}>Logged</Text>
          </View>
        </View>
      );
    }

    const paletteColors = ['#6366f1', '#ec4899', '#f97316', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const getCategoryColor = (catName: string, idx: number) => {
      return CATEGORY_COLORS[catName] || paletteColors[idx % paletteColors.length];
    };

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 32; // Horizontal padding
    const height = 260;
    const cx = chartWidth / 2;
    const cy = 110;

    const scale = Math.min(chartWidth / 300, 1.25);
    const innerRadius1 = 44 * scale;
    const outerRadius1 = 70 * scale;
    const innerRadius2 = 74 * scale;
    const outerRadius2 = 88 * scale;

    const hexToRgbaLocal = (hex: string, alpha: number): string => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const isExpense = pieFlowType === 'EXPENSE';
    const nestedData = chartData.map((item, idx) => {
      const catColor = getCategoryColor(item.name, idx);
      
      const catTxns = yearlyTxns.filter(t => {
        const catName = typeof t.category === 'object' ? t.category.name : t.category;
        const match = catName === item.name;
        const txType = (t.transactionType || '').toUpperCase();
        const typeMatch = isExpense ? (txType === 'EXPENSE' || txType === 'GAMBLING') : (txType === 'INCOME');
        return match && typeMatch;
      });

      const pmTotals: Record<string, number> = {};
      catTxns.forEach(t => {
        const pm = t.paymentMethod || 'UPI';
        pmTotals[pm] = (pmTotals[pm] || 0) + Math.abs(t.amount);
      });

      const outerSegments = Object.keys(pmTotals).map(pm => ({
        name: pm,
        value: pmTotals[pm],
      })).sort((a, b) => b.value - a.value);

      if (outerSegments.length === 0) {
        outerSegments.push({
          name: 'Other',
          value: item.value,
        });
      }

      return {
        ...item,
        color: catColor,
        outerSegments,
      };
    }).sort((a, b) => b.value - a.value);

    let currentAngle = -Math.PI / 2;

    const innerPaths: React.ReactNode[] = [];
    const outerPaths: React.ReactNode[] = [];

    const isAnySelected = selectedCategory !== 'All';

    nestedData.forEach((item, idx) => {
      const isSelected = selectedCategory === item.name;
      const opacity = isAnySelected ? (isSelected ? 1.0 : 0.15) : 1.0;
      
      const angleWidth = (item.value / totalSum) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleWidth;

      const innerPathD = describeAnnularSector(cx, cy, innerRadius1, outerRadius1, startAngle, endAngle);
      innerPaths.push(
        <Path
          key={`inner-${item.name}`}
          d={innerPathD}
          fill={item.color}
          opacity={opacity}
          stroke={colors.card}
          strokeWidth={1}
          onPress={() => {
            const isSelected = selectedCategory === item.name;
            const nextCategory = isSelected ? 'All' : item.name;
            setSelectedCategory(nextCategory);
            
            if (isSelected) {
              setActiveDonutSlice(null);
            } else {
              const percent = (item.value / totalSum) * 100;
              const midAngle = startAngle + angleWidth / 2;
              const rMid = (innerRadius1 + outerRadius1) / 2;
              const tx = cx + rMid * Math.cos(midAngle);
              const ty = cy + rMid * Math.sin(midAngle);
              setActiveDonutSlice({
                type: 'inner',
                name: item.name,
                value: item.value,
                percent,
                x: tx,
                y: ty,
              });
            }
          }}
        />
      );

      let outerAngle = startAngle;
      item.outerSegments.forEach((sub, subIdx) => {
        const subAngleWidth = (sub.value / item.value) * angleWidth;
        const subStartAngle = outerAngle;
        const subEndAngle = outerAngle + subAngleWidth;

        const opacities = [0.9, 0.7, 0.5, 0.3];
        const alpha = opacities[subIdx % opacities.length];
        const subColor = hexToRgbaLocal(item.color, alpha);

        const outerPathD = describeAnnularSector(cx, cy, innerRadius2, outerRadius2, subStartAngle, subEndAngle);
        outerPaths.push(
          <Path
            key={`outer-${item.name}-${sub.name}-${subIdx}`}
            d={outerPathD}
            fill={subColor}
            opacity={opacity}
            stroke={colors.card}
            strokeWidth={0.8}
            onPress={() => {
              setSelectedCategory(item.name);
              const percent = (sub.value / item.value) * 100;
              const midAngle = subStartAngle + subAngleWidth / 2;
              const rMid = (innerRadius2 + outerRadius2) / 2;
              const tx = cx + rMid * Math.cos(midAngle);
              const ty = cy + rMid * Math.sin(midAngle);
              setActiveDonutSlice({
                type: 'outer',
                name: sub.name,
                value: sub.value,
                parentName: item.name,
                percent,
                x: tx,
                y: ty,
              });
            }}
          />
        );

        outerAngle = subEndAngle;
      });

      currentAngle = endAngle;
    });

    const displayTitle = selectedCategory === 'All' ? 'TOTAL' : selectedCategory.toUpperCase();
    const displayValue = selectedCategory === 'All'
      ? totalSum
      : (nestedData.find(item => item.name === selectedCategory)?.value || 0);

    return (
      <View style={{ alignItems: 'center', width: '100%', paddingVertical: 12 }}>
        <View style={{ width: chartWidth, height: 260, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Svg width={chartWidth} height={260} viewBox={`0 0 ${chartWidth} 260`}>
            {innerPaths}
            {outerPaths}
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 90, height: 90 }}>
            <Text style={{ fontSize: 7.5, fontWeight: '900', color: colors.subText, letterSpacing: 0.5, textAlign: 'center' }} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
              ₹{Math.round(displayValue).toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Donut Tooltip */}
          {activeDonutSlice !== null && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setActiveDonutSlice(null)}
              style={{
                position: 'absolute',
                left: Math.max(10, Math.min(chartWidth - 210, activeDonutSlice.x - 100)),
                top: Math.max(10, Math.min(260 - 85, activeDonutSlice.y - 45)),
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                borderColor: colors.border,
                borderWidth: 1.5,
                borderRadius: 12,
                padding: 10,
                width: 200,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 5,
                zIndex: 200,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 4, marginBottom: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getCategoryColor(activeDonutSlice.parentName || activeDonutSlice.name, 0) }} />
                <Text style={{ fontSize: 9.5, fontWeight: '900', color: colors.text }} numberOfLines={1}>
                  {activeDonutSlice.name}
                </Text>
              </View>
              <Text style={{ fontSize: 9, color: colors.subText, fontWeight: '600' }}>
                {activeDonutSlice.type === 'inner' ? 'Class Category' : `Method in ${activeDonutSlice.parentName}`}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '900', color: colors.text, marginTop: 4 }}>
                ₹{Math.round(activeDonutSlice.value).toLocaleString('en-IN')}{' '}
                <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 9.5 }}>
                  ({activeDonutSlice.percent.toFixed(0)}%)
                </Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24, width: '100%', paddingHorizontal: 16 }}>
          {nestedData.slice(0, 8).map((item, idx) => {
            const percent = Math.round((item.value / totalSum) * 100);
            const isSelected = selectedCategory === item.name;
            const isAnySelected = selectedCategory !== 'All';

            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => setSelectedCategory(isSelected ? 'All' : item.name)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isSelected ? item.color : colors.border,
                    backgroundColor: isSelected ? `${item.color}15` : colors.inputBackground,
                    opacity: isAnySelected ? (isSelected ? 1.0 : 0.5) : 1.0,
                  }
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.legendDot, { backgroundColor: item.color, marginRight: 6 }]} />
                <Text style={{ fontSize: 9.5, color: colors.text, fontWeight: '700' }}>
                  {item.name} <Text style={{ color: colors.subText, fontSize: 8.5 }}>({percent}%)</Text>
                </Text>
              </TouchableOpacity>
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

        {/* OVERDUE OVERLAY MODAL */}
        <Modal
          visible={activeTab === 'Home' && overdueItem !== null && !dismissedOverdue}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setDismissedOverdue(true)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.overdueModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Close Button X */}
              <TouchableOpacity
                onPress={() => setDismissedOverdue(true)}
                style={styles.overdueCloseBtn}
              >
                <Text style={[styles.overdueCloseText, { color: colors.subText }]}>✕</Text>
              </TouchableOpacity>

              <View style={styles.overdueIconContainer}>
                <Text style={styles.overdueIconEmoji}>⚠️</Text>
              </View>

              <Text style={[styles.overdueTitle, { color: '#f43f5e' }]}>Payment Overdue</Text>

              {/* Payment Details in Middle */}
              <View style={styles.overdueInfoContainer}>
                <Text style={[styles.overdueDescription, { color: colors.text }]}>
                  {overdueItem?.description}
                </Text>
                <Text style={[styles.overdueCategory, { color: colors.subText }]}>
                  {(typeof overdueItem?.category === 'object' ? (overdueItem.category as any).name : overdueItem?.category) || ''} • {overdueItem?.frequency}
                </Text>
                <Text style={[styles.overdueAmount, { color: '#f43f5e' }]}>
                  ₹{overdueItem ? Math.abs(overdueItem.amount).toLocaleString('en-IN') : 0}
                </Text>

                {/* Prompt Details */}
                <Text style={[styles.overduePrompt, { color: colors.text }]}>
                  {overdueItem ? getPendingText(overdueItem) : ''}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.overdueActionRow}>
                <TouchableOpacity
                  onPress={() => overdueItem && handleSkipOverdue(overdueItem.id)}
                  style={[styles.overdueSkipBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.overdueSkipText, { color: colors.subText }]}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => overdueItem && handleApproveOverdue(overdueItem.id)}
                  style={styles.overduePayBtn}
                >
                  <Text style={styles.overduePayText}>Paid</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
    marginTop: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  lineChartContainer: {
    height: 230,
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
    top: 42,
    right: 0,
    width: 125,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    overflow: 'hidden',
    padding: 4,
  },
  yearDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 1.5,
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
  },
  overdueModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  overdueCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overdueCloseText: {
    fontSize: 14,
    fontWeight: '800',
  },
  overdueIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  overdueIconEmoji: {
    fontSize: 24,
  },
  overdueTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  overdueInfoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  overdueDescription: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  overdueCategory: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overdueAmount: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 10,
  },
  overduePrompt: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  overdueActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  overdueSkipBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueSkipText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  overduePayBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  overduePayText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  }
});

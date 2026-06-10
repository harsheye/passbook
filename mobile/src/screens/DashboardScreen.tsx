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
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { api } from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import {
  SparklesIcon,
  ChevronDownIcon
} from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';

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

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();

  // States
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pieFlowType, setPieFlowType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const loadDashboardData = async () => {
    if (!data) {
      setLoading(true);
    }
    try {
      const res = await api.get('/api/dashboard/summary');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* TOP BAR BRANDING HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.brandSub, { color: colors.subText }]}>Smart Finance companion</Text>
            <Text style={[styles.brandTitle, { color: colors.text }]}>SALT</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#2fb09b" />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Fetching statement summary...</Text>
          </View>
        ) : !data ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Failed to load ledger metrics.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* CONSOLIDATED NET WORTH CARD */}
            <View style={[styles.netWorthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.netWorthLabel, { color: colors.subText }]}>CONSOLIDATED NET WORTH</Text>
              <Text style={[styles.netWorthVal, { color: colors.text }]}>
                ₹{(data.summary.totalIncome - data.summary.totalExpenses).toLocaleString('en-IN')}
              </Text>
              <View style={styles.netWorthRow}>
                <View style={styles.netWorthCol}>
                  <Text style={[styles.netWorthColLabel, { color: colors.subText }]}>TOTAL INFLOWS</Text>
                  <Text style={[styles.netWorthColAmt, styles.incomeColor]}>
                    ₹{data.summary.totalIncome.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.netWorthDivider, { backgroundColor: colors.border }]} />
                <View style={styles.netWorthCol}>
                  <Text style={[styles.netWorthColLabel, { color: colors.subText }]}>TOTAL OUTFLOWS</Text>
                  <Text style={[styles.netWorthColAmt, styles.expenseColor]}>
                    ₹{data.summary.totalExpenses.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {/* METRICS GRID */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                {/* Net Savings */}
                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.metricLabel, { color: colors.subText }]}>Net Savings</Text>
                  <Text style={[styles.metricVal, { color: colors.text }]}>₹{data.summary.netSavings.toLocaleString('en-IN')}</Text>
                </View>
                {/* Daily Average */}
                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border, marginLeft: 10 }]}>
                  <Text style={[styles.metricLabel, { color: colors.subText }]}>Daily Average</Text>
                  <Text style={[styles.metricVal, { color: colors.text }]}>₹{data.summary.avgDailySpending.toFixed(0)}</Text>
                </View>
              </View>

              <View style={[styles.metricsRow, { marginTop: 10 }]}>
                {/* Highest Category */}
                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.metricLabel, { color: colors.subText }]}>Highest Spend Area</Text>
                  <Text style={[styles.metricVal, { color: colors.text }]} numberOfLines={1}>
                    {data.summary.highestCategory || 'None'}
                  </Text>
                </View>
                {/* Mom Growth */}
                <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border, marginLeft: 10 }]}>
                  <Text style={[styles.metricLabel, { color: colors.subText }]}>MoM Expense Growth</Text>
                  <Text style={[styles.metricVal, { color: data.summary.expenseGrowthPct > 0 ? '#ef4444' : '#10b981' }]}>
                    {data.summary.expenseGrowthPct > 0 ? '+' : ''}{data.summary.expenseGrowthPct.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* CATEGORY BREAKDOWN CHART */}
            <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.breakdownHeader}>
                <View>
                  <Text style={[styles.breakdownTitle, { color: colors.text }]}>1-Month Category Flow</Text>
                  <Text style={[styles.breakdownSub, { color: colors.subText }]}>Flow proportions analysis</Text>
                </View>
                
                {/* Flow type toggle buttons */}
                <View style={[styles.toggleContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setPieFlowType('EXPENSE')}
                    style={[styles.toggleBtn, pieFlowType === 'EXPENSE' && { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.toggleBtnText, { color: pieFlowType === 'EXPENSE' ? colors.text : colors.subText }]}>EXP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPieFlowType('INCOME')}
                    style={[styles.toggleBtn, pieFlowType === 'INCOME' && { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.toggleBtnText, { color: pieFlowType === 'INCOME' ? colors.text : colors.subText }]}>INC</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.breakdownList}>
                {(() => {
                  const chartData = pieFlowType === 'EXPENSE' ? data.charts.category : data.charts.categoryIncome;
                  if (!chartData || chartData.length === 0) {
                    return (
                      <Text style={[styles.emptyBreakdownText, { color: colors.subText }]}>
                        No records logged in the current month.
                      </Text>
                    );
                  }

                  const totalSum = chartData.reduce((sum, item) => sum + item.value, 0) || 1;
                  const paletteColors = ['#3b82f6', '#ec4899', '#f97316', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

                  return chartData.map((item, idx) => {
                    const percentage = Math.round((item.value / totalSum) * 100);
                    return (
                      <View key={item.name} style={styles.barRow}>
                        <View style={styles.barMeta}>
                          <Text style={[styles.barLabel, { color: colors.subText }]}>{item.name}</Text>
                          <Text style={[styles.barValue, { color: colors.text }]}>{percentage}% (₹{item.value})</Text>
                        </View>
                        <View style={[styles.barOuter, { backgroundColor: colors.background }]}>
                          <View style={[styles.barInner, { width: `${percentage}%`, backgroundColor: paletteColors[idx % paletteColors.length] }]} />
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>



          </ScrollView>
        )}

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  brandSub: {
    fontSize: 8,
    color: '#71717a',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 10,
    color: '#f43f5e',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  netWorthCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  netWorthLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#71717a',
    letterSpacing: 1.5,
  },
  netWorthVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#09090b',
    marginTop: 4,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
  },
  netWorthCol: {
    flex: 1,
    alignItems: 'center',
  },
  netWorthColLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#a1a1aa',
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
    backgroundColor: '#e4e4e7',
  },
  incomeColor: {
    color: '#10b981',
  },
  expenseColor: {
    color: '#f43f5e',
  },
  metricsGrid: {
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 12,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  breakdownCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
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
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  breakdownSub: {
    fontSize: 8,
    color: '#71717a',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
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
  breakdownList: {
  },
  emptyBreakdownText: {
    fontSize: 9,
    color: '#71717a',
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 12,
    textTransform: 'uppercase',
  },
  barRow: {
    marginBottom: 10,
  },
  barMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 9,
    color: '#a1a1aa',
    fontWeight: '800',
  },
  barValue: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '900',
  },
  barOuter: {
    height: 6,
    backgroundColor: '#09090b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 3,
  },
  insightsCard: {
    backgroundColor: '#122325',
    borderWidth: 1.5,
    borderColor: '#1f4246',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f4246',
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
    color: '#7ea0a4',
    fontSize: 9.5,
    fontWeight: '700',
    flex: 1,
    lineHeight: 13,
  },
});

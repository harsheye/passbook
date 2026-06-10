import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getBaseUrl } from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import { SparklesIcon } from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';

interface CombinedSummary {
  metrics: {
    personalIncome: number;
    personalExpenses: number;
    investments: number;
    gamblingProfit: number;
    netWorth: number;
  };
  assetBalances: { name: string; value: number }[];
  gamblingMeta: {
    currentBalance: number;
    deposits: number;
    withdrawals: number;
  } | null;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors, toggleTheme } = useTheme();

  // States
  const [summary, setSummary] = useState<CombinedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('Standard User');
  const [userEmail, setUserEmail] = useState('');

  const loadProfileData = async () => {
    try {
      // Get stored user information
      const savedUser = await AsyncStorage.getItem('passbook_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setIsAdmin(parsed.role === 'ADMIN');
        setUserName(parsed.name || 'Standard User');
        setUserEmail(parsed.email || '');
      }

      if (!summary) {
        setLoading(true);
      }
      
      const res = await api.get('/api/dashboard/admin-summary');
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Load Error', 'Failed to retrieve portfolio metrics. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    try {
      const apiBase = await getBaseUrl();
      const url = `${apiBase}/api/transactions/export?format=${format}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Export Error', 'Cannot open browser to download file.');
      }
    } catch (err) {
      Alert.alert('Export Failed', 'An error occurred triggering the download.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout Session',
      'Are you sure you want to log out of your Passbook account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('passbook_token');
              await AsyncStorage.removeItem('passbook_user');
              // Clear Axios headers
              delete api.defaults.headers.common['Authorization'];
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (err) {
              Alert.alert('Error', 'Failed to logout session.');
            }
          }
        }
      ]
    );
  };

  const handleBypassAction = (action: string) => {
    if (action === 'import') {
      Alert.alert('Import Data', 'CSV ledger statements import is available inside the web app portal.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER SECTION */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={styles.headerSub}>Consolidated ledger profile</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>PORTFOLIO CENTER</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.themeToggleText, { color: colors.text }]}>
                {isDark ? '🌙 Dark' : '☀️ Light'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: '#ef4444' }]}
            >
              <Text style={[styles.themeToggleText, { color: '#ef4444' }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Auditing consolidated net worth...</Text>
          </View>
        ) : !summary ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Auditing Failed</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            
            {/* USER METADATA CARD */}
            <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.userIconCircle}>
                <Text style={styles.userAvatarText}>{userName[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={[styles.userNameText, { color: colors.text }]}>{userName}</Text>
                <Text style={[styles.userEmailText, { color: colors.subText }]}>{userEmail}</Text>
                <View style={[styles.roleTag, { backgroundColor: isAdmin ? 'rgba(99,102,241,0.1)' : 'rgba(113,113,122,0.1)' }]}>
                  <Text style={[styles.roleTagText, { color: isAdmin ? '#818cf8' : '#a1a1aa' }]}>
                    {isAdmin ? 'ADMIN ACCOUNT' : 'USER ACCOUNT'}
                  </Text>
                </View>
              </View>
            </View>

            {/* NET WORTH HEADER PANEL */}
            <View style={[
              styles.netWorthCard, 
              isDark 
                ? { backgroundColor: '#ffffff', borderColor: '#e2e8f0' } 
                : { backgroundColor: '#09090b', borderColor: '#27272a' }
            ]}>
              <View style={styles.netWorthRow}>
                <SparklesIcon color={isDark ? '#000000' : '#ffffff'} size={14} />
                <Text style={[styles.netWorthSub, { color: isDark ? '#71717a' : '#a1a1aa' }]}>Consolidated Portfolios Health</Text>
              </View>
              <Text style={[styles.netWorthVal, { color: isDark ? '#09090b' : '#ffffff' }]}>
                ₹{summary.metrics.netWorth.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.netWorthDesc}>
                Net Worth = Cash + Investments {isAdmin ? '+ Bets ' : ''}- Expense
              </Text>
            </View>

            {/* DETAILED FLOW METRICS */}
            <View style={styles.metricsList}>
              {/* Cash Inflows */}
              <View style={[styles.metricItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.metricLeft}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <Text style={styles.greenText}>IN</Text>
                  </View>
                  <View style={styles.metricMeta}>
                    <Text style={styles.metricLabel}>Total Cash Inflows</Text>
                    <Text style={[styles.metricTitle, { color: colors.text }]}>Revenues</Text>
                  </View>
                </View>
                <Text style={[styles.metricAmt, styles.greenText]}>
                  ₹{summary.metrics.personalIncome.toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Cash Outflows */}
              <View style={[styles.metricItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.metricLeft}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Text style={styles.roseText}>OUT</Text>
                  </View>
                  <View style={styles.metricMeta}>
                    <Text style={styles.metricLabel}>Total Cash Outflows</Text>
                    <Text style={[styles.metricTitle, { color: colors.text }]}>Liabilities</Text>
                  </View>
                </View>
                <Text style={[styles.metricAmt, styles.roseText]}>
                  ₹{summary.metrics.personalExpenses.toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Investments */}
              <View style={[styles.metricItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.metricLeft}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Text style={styles.amberText}>INV</Text>
                  </View>
                  <View style={styles.metricMeta}>
                    <Text style={styles.metricLabel}>Portfolio Values</Text>
                    <Text style={[styles.metricTitle, { color: colors.text }]}>Investments</Text>
                  </View>
                </View>
                <Text style={[styles.metricAmt, styles.amberText]}>
                  ₹{summary.metrics.investments.toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Gambling Net (ADMIN ONLY) */}
              {isAdmin ? (
                <View style={[styles.metricItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.metricLeft}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                      <Text style={styles.purpleText}>BET</Text>
                    </View>
                    <View style={styles.metricMeta}>
                      <Text style={styles.metricLabel}>Betting Ledger Winnings</Text>
                      <Text style={[styles.metricTitle, { color: colors.text }]}>Gambling Net</Text>
                    </View>
                  </View>
                  <Text style={[styles.metricAmt, summary.metrics.gamblingProfit >= 0 ? { color: colors.text } : styles.roseText]}>
                    ₹{summary.metrics.gamblingProfit.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* PORTFOLIO ALLOCATIONS PIE CHART */}
            <View style={[styles.allocationsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.allocationsTitle, { color: colors.text }]}>Portfolio Allocations Ratio</Text>
              
              <View style={styles.barsContainer}>
                {summary.assetBalances.map((item, idx) => {
                  const barColors = isDark ? ['#ffffff', '#94a3b8', '#475569'] : ['#4f46e5', '#475569', '#94a3b8'];
                  const total = summary.assetBalances.reduce((sum, i) => sum + i.value, 0) || 1;
                  const percentage = Math.round((item.value / total) * 100);
                  
                  return (
                    <View key={item.name} style={styles.barRow}>
                      <View style={styles.barMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.colorIndicator, { backgroundColor: barColors[idx % barColors.length] }]} />
                          <Text style={[styles.barLabel, { color: colors.subText }]}>{item.name}</Text>
                        </View>
                        <Text style={[styles.barValue, { color: colors.text }]}>{percentage}% (₹{item.value.toLocaleString('en-IN')})</Text>
                      </View>
                      <View style={[styles.barOuter, { backgroundColor: colors.background }]}>
                        <View style={[styles.barInner, { width: `${percentage}%`, backgroundColor: barColors[idx % barColors.length] }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* EXPORTER SUITE */}
            <View style={[styles.exporterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.exporterLabel}>Statement Ledger Exporter</Text>
              <Text style={[styles.exporterDesc, { color: colors.subText }]}>
                Download structured CSV, Excel sheets, or raw JSON statement ledgers directly to your local file explorer.
              </Text>
              <View style={styles.exportButtonsRow}>
                <TouchableOpacity onPress={() => handleExport('csv')} style={[styles.exportBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.exportBtnText, { color: colors.text }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleExport('xlsx')} style={[styles.exportBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.exportBtnText, { color: colors.text }]}>XLSX</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleExport('json')} style={[styles.exportBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.exportBtnText, { color: colors.text }]}>JSON</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QUICK SHORTCUTS */}
            <View style={[styles.exporterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.exporterLabel}>Quick Shortcuts Actions</Text>
              <View style={styles.shortcutRow}>
                <TouchableOpacity onPress={() => handleBypassAction('import')} style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.shortcutText, { color: colors.text }]}>📂 Import Data</Text>
                </TouchableOpacity>
                {isAdmin ? (
                  <TouchableOpacity onPress={() => navigation.navigate('Hub')} style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.shortcutText, { color: colors.text }]}>🎰 Hub System</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

          </ScrollView>
        )}

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Profile" />

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
  },
  headerSub: {
    fontSize: 8,
    color: '#71717a',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  themeToggle: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  errorText: {
    fontSize: 10,
    color: '#f43f5e',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  userCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  userIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '900',
  },
  userEmailText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  roleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 7,
    fontWeight: '900',
  },
  netWorthCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netWorthSub: {
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netWorthVal: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  netWorthDesc: {
    fontSize: 8,
    fontWeight: '700',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  metricsList: {
    marginBottom: 16,
  },
  metricItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metricMeta: {
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricAmt: {
    fontSize: 12,
    fontWeight: '900',
  },
  greenText: {
    color: '#10b981',
    fontWeight: '900',
    fontSize: 9,
  },
  roseText: {
    color: '#f43f5e',
    fontWeight: '900',
    fontSize: 9,
  },
  amberText: {
    color: '#f59e0b',
    fontWeight: '900',
    fontSize: 9,
  },
  purpleText: {
    color: '#a78bfa',
    fontWeight: '900',
    fontSize: 9,
  },
  allocationsCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  allocationsTitle: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  barsContainer: {
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
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  barValue: {
    fontSize: 9,
    fontWeight: '800',
  },
  barOuter: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 3,
  },
  exporterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  exporterLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  exporterDesc: {
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 13,
    marginBottom: 12,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  exportBtnText: {
    fontSize: 10,
    fontWeight: '900',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shortcutBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  shortcutText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

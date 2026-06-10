import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  BackHandler
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchGamblingAnalyticsApi, GamblingSummary } from '../api/api';
import { LockIcon, ShieldIcon, CheckIcon } from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';

export const HubScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true; // prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Analytics states
  const [analytics, setAnalytics] = useState<GamblingSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthenticate = () => {
    if (passwordInput === 'admin123') {
      setIsAuthenticated(true);
      setAuthError('');
      loadAnalyticsData();
    } else {
      setAuthError('Incorrect Admin Password');
      setPasswordInput('');
    }
  };

  const loadAnalyticsData = async () => {
    if (!analytics) {
      setLoading(true);
    }
    try {
      const data = await fetchGamblingAnalyticsApi();
      setAnalytics(data);
    } catch (err) {
      Alert.alert('Privilege Error', 'Failed to retrieve consolidated Hub metrics from the backend. Make sure your server is online.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.lockContainer}>
          <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.lockHeader}>
              <ShieldIcon color="#a78bfa" size={24} />
              <Text style={[styles.lockTitle, { color: colors.text }]}>HUB GATEWAY</Text>
            </View>

            <Text style={[styles.lockSub, { color: colors.subText }]}>
              This system contains restricted administrative audit controls. Please enter the master password to authorize this session.
            </Text>

            <View style={styles.passwordGroup}>
              <View style={[styles.passwordInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <LockIcon color={colors.subText} size={14} />
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  secureTextEntry
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  placeholder="Master Password..."
                  placeholderTextColor={colors.subText}
                  onSubmitEditing={handleAuthenticate}
                />
              </View>
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
            </View>

            <View style={styles.lockActions}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.lockBtn, styles.lockBtnCancel, { borderColor: colors.border }]}
              >
                <Text style={[styles.lockBtnTextCancel, { color: colors.subText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAuthenticate}
                style={[styles.lockBtn, styles.lockBtnAuth, { backgroundColor: colors.text, borderColor: colors.text }]}
              >
                <Text style={[styles.lockBtnTextAuth, { color: colors.background }]}>Authorize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER SECTION */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.headerSub, { color: colors.subText }]}>Consolidated audit log</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>HUB SYSTEM</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.closeBtnText, { color: colors.text }]}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#a78bfa" />
            <Text style={[styles.loadingText, { color: colors.subText }]}>Loading Hub systems...</Text>
          </View>
        ) : !analytics ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Consolidated metrics failed</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            
            {/* NET WORTH HEADER PANEL */}
            <View style={[styles.netWorthCard, { backgroundColor: '#a78bfa' }]}>
              <View style={styles.netWorthRow}>
                <ShieldIcon color="#000000" size={14} />
                <Text style={styles.netWorthSub}>System consolidated status</Text>
              </View>
              <Text style={styles.netWorthVal}>
                ₹{analytics.summary.currentBalance.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.netWorthDesc}>Consolidated Platform Balance</Text>
            </View>

            {/* Platform Metrics details cards */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricsLabel, { color: colors.subText }]}>TOTAL DEPOSITS</Text>
                <Text style={[styles.metricsValue, { color: colors.text }]}>₹{analytics.summary.totalDeposits.toLocaleString('en-IN')}</Text>
              </View>

              <View style={[styles.metricsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricsLabel, { color: colors.subText }]}>WITHDRAWALS</Text>
                <Text style={[styles.metricsValue, { color: colors.text }]}>₹{analytics.summary.totalWithdrawals.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* ROI Profit card */}
            <View style={[styles.roiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.roiLabel, { color: colors.subText }]}>SYSTEM ROI NET PROFIT</Text>
              <View style={styles.roiRow}>
                <Text style={[styles.roiValue, analytics.summary.netProfit >= 0 ? styles.positiveText : styles.negativeText]}>
                  ₹{analytics.summary.netProfit.toLocaleString('en-IN')}
                </Text>
                <View style={[styles.roiBadge, { backgroundColor: analytics.summary.netProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)' }]}>
                  <Text style={[styles.roiBadgeText, analytics.summary.netProfit >= 0 ? styles.positiveText : styles.negativeText]}>
                    ROI: {analytics.summary.roi.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Platforms list */}
            <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryBoxTitle, { color: colors.text }]}>Platform Ledger details</Text>
              
              <View style={styles.ledgerRow}>
                <Text style={[styles.ledgerLabel, { color: colors.subText }]}>Total Bookkeeping Bets Placed</Text>
                <Text style={[styles.ledgerValue, { color: colors.text }]}>{analytics.summary.totalBets}</Text>
              </View>
              <View style={[styles.ledgerDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.ledgerRow}>
                <Text style={[styles.ledgerLabel, { color: colors.subText }]}>Winning Book Bets Count</Text>
                <Text style={[styles.ledgerValue, styles.positiveText]}>{analytics.summary.totalWins}</Text>
              </View>
              <View style={[styles.ledgerDivider, { backgroundColor: colors.border }]} />

              <View style={styles.ledgerRow}>
                <Text style={[styles.ledgerLabel, { color: colors.subText }]}>Losing Book Bets Count</Text>
                <Text style={[styles.ledgerValue, styles.negativeText]}>{analytics.summary.totalLosses}</Text>
              </View>
            </View>

          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    marginLeft: 8,
    letterSpacing: 1.5,
  },
  lockSub: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '600',
    lineHeight: 14,
    marginBottom: 20,
  },
  passwordGroup: {
    marginBottom: 20,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  passwordInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#f43f5e',
    textTransform: 'uppercase',
    marginTop: 6,
    marginLeft: 4,
  },
  lockActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  lockBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBtnCancel: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  lockBtnAuth: {
    backgroundColor: '#ffffff',
  },
  lockBtnTextCancel: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '800',
  },
  lockBtnTextAuth: {
    color: '#09090b',
    fontSize: 10,
    fontWeight: '900',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
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
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    borderRadius: 10,
  },
  closeBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#e2e8f0',
    textTransform: 'uppercase',
  },
  loadingContainer: {
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 10,
    color: '#f43f5e',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  netWorthCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  netWorthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netWorthSub: {
    fontSize: 8,
    fontWeight: '900',
    color: '#71717a',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netWorthVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#09090b',
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
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricsCard: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  metricsLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#71717a',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricsValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  roiCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  roiLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#71717a',
    letterSpacing: 1,
    marginBottom: 6,
  },
  roiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roiValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  roiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roiBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  summaryBox: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  summaryBoxTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f4f4f5',
    marginBottom: 16,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ledgerLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#a1a1aa',
  },
  ledgerValue: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: '#27272a',
  },
  positiveText: {
    color: '#10b981',
  },
  negativeText: {
    color: '#f43f5e',
  },
});

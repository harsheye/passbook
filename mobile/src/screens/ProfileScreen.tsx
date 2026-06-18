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
  Modal,
  TextInput,
  Linking,
  Platform,
  Switch
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/api';
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

const DEFAULT_CATEGORIES_FOR_PROFESSION: Record<string, string[]> = {
  Salaried: ['Salary', 'Groceries', 'Rent', 'Dining', 'Transit', 'Subscriptions', 'Entertainment', 'Healthcare'],
  Farmer: ['Agriculture Income', 'Seeds/Fertilizers', 'Equipment', 'Labor/Wages', 'Mandi/Transport', 'Subsidies', 'Personal'],
  Business: ['Sales Revenue', 'Inventory Cost', 'Office Rent', 'Utilities', 'Wages/Salaries', 'Marketing', 'Tax/GST', 'Office Supplies'],
  Student: ['Pocket Money', 'Tuition Fees', 'Books/Stationery', 'Dining Out', 'Transit', 'Entertainment', 'Gadgets'],
  Housewife: ['Household Budget', 'Groceries', 'Kids Education', 'Shopping', 'Gold/Jewelry', 'Emergency Savings', 'Utilities'],
  Freelancer: ['Client Payments', 'Software/Tools', 'Co-working Rent', 'Internet/Phone', 'Travel', 'Professional Fees', 'GST/Tax'],
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors, toggleTheme } = useTheme();

  // States
  const [summary, setSummary] = useState<CombinedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('Standard User');
  const [userEmail, setUserEmail] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.001');
  const [userProfession, setUserProfession] = useState('Salaried');

  // Admin Modal States
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [modalError, setModalError] = useState('');

  // Edit Profile custom modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editProfession, setEditProfession] = useState('Salaried');
  const [editIncome, setEditIncome] = useState('');
  const [editSavings, setEditSavings] = useState('');
  const [editGstRegistered, setEditGstRegistered] = useState(false);
  const [editGstNumber, setEditGstNumber] = useState('');
  const [professionDropdownOpen, setProfessionDropdownOpen] = useState(false);
  const [combinedFeatures, setCombinedFeatures] = useState(false);
  const [combinedSettingsModalOpen, setCombinedSettingsModalOpen] = useState(false);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [showVisualizations, setShowVisualizations] = useState<boolean>(true);

  const loadProfileData = async () => {
    try {
      // Check admin status
      const adminVal = await AsyncStorage.getItem('passbook_admin_logged_in');
      const isCurrentlyAdmin = adminVal === 'true';
      setIsAdmin(isCurrentlyAdmin);

      let finalName = isCurrentlyAdmin ? 'Administrator' : 'Local Wallet User';
      let finalSub = isCurrentlyAdmin ? 'admin@passbook.local' : 'local.user@offline.app';

      // Increment App version counter
      try {
        const buildStr = await AsyncStorage.getItem('passbook_build_counter');
        let buildNum = 1;
        if (buildStr) {
          buildNum = parseInt(buildStr) + 1;
        }
        await AsyncStorage.setItem('passbook_build_counter', String(buildNum));
        setAppVersion(`1.0.${String(buildNum).padStart(3, '0')}`);
      } catch (e) {
        console.error(e);
      }

      // Load Combined Mode
      const combinedVal = await AsyncStorage.getItem('passbook_combined_features');
      const combinedEnabled = combinedVal === 'true';
      setCombinedFeatures(combinedEnabled);

      try {
        const profileStr = await AsyncStorage.getItem('passbook_user_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (!isCurrentlyAdmin) {
            if (profile.name) finalName = profile.name;
            if (profile.profession) {
              finalSub = `${profile.profession} Account`;
              setUserProfession(profile.profession);
            }
          }
          // Prefill values
          setEditName(profile.name || '');
          setEditProfession(profile.profession || 'Salaried');
          setEditIncome(String(profile.monthlyIncome || ''));
          setEditSavings(String(profile.savingsGoal || ''));
          setEditGstRegistered(profile.gstRegistered || false);
          setEditGstNumber(profile.gstNumber || '');
          setEditCategories(profile.categories || []);
        }
        const showVisVal = await AsyncStorage.getItem('passbook_show_visualizations');
        setShowVisualizations(showVisVal !== 'false');
      } catch (e) {
        console.error('Failed to parse user profile in ProfileScreen:', e);
      }

      setUserName(finalName);
      setUserEmail(finalSub);

      if (!summary) {
        setLoading(true);
      }

      const res = await api.get('/api/dashboard/admin-summary');
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Load Error', 'Failed to retrieve local portfolio metrics.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const handleAdminToggle = async () => {
    if (isAdmin) {
      Alert.alert(
        'Exit Admin Mode',
        'Are you sure you want to lock admin controls and hide gambling records?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit Admin',
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.setItem('passbook_admin_logged_in', 'false');
                setIsAdmin(false);
                setUserName('Local Wallet User');
                setUserEmail('local.user@offline.app');
                loadProfileData();
              } catch (err) {
                Alert.alert('Error', 'Failed to exit admin mode.');
              }
            }
          }
        ]
      );
    } else {
      setAdminModalVisible(true);
    }
  };

  const handleAdminSubmit = async () => {
    if (passwordInput === 'rathouse') {
      try {
        await AsyncStorage.setItem('passbook_admin_logged_in', 'true');
        setAdminModalVisible(false);
        setPasswordInput('');
        setModalError('');
        loadProfileData();
      } catch (err) {
        setModalError('Failed to save session state.');
      }
    } else {
      setModalError('Incorrect Admin Password');
    }
  };

  const renderShortcuts = () => {
    const showGst = combinedFeatures || userProfession === 'Business' || userProfession === 'Freelancer' || userProfession === 'Farmer';
    const showTax = combinedFeatures || (userProfession !== 'Student' && userProfession !== 'Housewife');

    const buttons = [];
    if (showGst) {
      buttons.push(
        <TouchableOpacity key="gst" onPress={() => navigation.navigate('Gst')} style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.shortcutText, { color: colors.text }]}>🧾 GST Portal</Text>
        </TouchableOpacity>
      );
    }
    if (showTax) {
      buttons.push(
        <TouchableOpacity key="tax" onPress={() => navigation.navigate('Tax')} style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.shortcutText, { color: colors.text }]}>📊 Tax Planner</Text>
        </TouchableOpacity>
      );
    }

    const editBtn = (
      <TouchableOpacity
        key="edit"
        onPress={() => setEditModalOpen(true)}
        style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <Text style={[styles.shortcutText, { color: colors.text }]}>⚙️ Edit Profile</Text>
      </TouchableOpacity>
    );

    const adminBtn = isAdmin ? (
      <TouchableOpacity key="admin" onPress={() => navigation.navigate('Hub')} style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.shortcutText, { color: colors.text }]}>🎰 Hub System</Text>
      </TouchableOpacity>
    ) : null;

    const combinedBtn = (
      <TouchableOpacity
        key="combined"
        onPress={() => setCombinedSettingsModalOpen(true)}
        style={[styles.shortcutBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <Text style={[styles.shortcutText, { color: colors.text }]}>👑 Personalization page</Text>
      </TouchableOpacity>
    );

    const allButtons = [...buttons, editBtn, combinedBtn];
    if (adminBtn) allButtons.push(adminBtn);

    const rows = [];
    for (let i = 0; i < allButtons.length; i += 2) {
      rows.push(
        <View key={i} style={[styles.shortcutRow, { marginTop: i > 0 ? 10 : 0 }]}>
          {allButtons[i]}
          {allButtons[i + 1] ? allButtons[i + 1] : <View style={{ flex: 1 }} />}
        </View>
      );
    }

    return <View style={{ gap: 10 }}>{rows}</View>;
  };

  const handleCombinedFeaturesToggle = async (val: boolean) => {
    try {
      setCombinedFeatures(val);
      await AsyncStorage.setItem('passbook_combined_features', val ? 'true' : 'false');
      loadProfileData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfessionChange = (prof: string) => {
    setEditProfession(prof);
    setEditCategories(DEFAULT_CATEGORIES_FOR_PROFESSION[prof] || []);
  };

  const handleToggleVisualizations = async (val: boolean) => {
    try {
      setShowVisualizations(val);
      await AsyncStorage.setItem('passbook_show_visualizations', val ? 'true' : 'false');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }

    const userProfile = {
      name: editName.trim(),
      profession: editProfession,
      monthlyIncome: Number(editIncome) || 0,
      savingsGoal: Number(editSavings) || 0,
      gstRegistered: editGstRegistered,
      gstNumber: editGstRegistered ? editGstNumber.trim() : '',
      categories: editCategories,
    };

    try {
      await AsyncStorage.setItem('passbook_user_profile', JSON.stringify(userProfile));
      
      // Sync customized categories with custom_categories for transaction drop-downs/chips
      const customCats = editCategories.map(c => ({
        name: c,
        icon: 'tag',
        color: '#71717a'
      }));
      await AsyncStorage.setItem('custom_categories', JSON.stringify(customCats));

      setEditModalOpen(false);
      loadProfileData();
    } catch (err) {
      console.error('Failed to save user profile:', err);
      Alert.alert('Error', 'Failed to save profile.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* HEADER SECTION */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={styles.headerSub}>Consolidated ledger profile • v{appVersion}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>PORTFOLIO CENTER</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Combined Mode Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 9, color: colors.subText, fontWeight: '700' }}>👑</Text>
              <Switch
                value={combinedFeatures}
                onValueChange={handleCombinedFeaturesToggle}
                trackColor={{ false: '#71717a', true: '#2fb09b' }}
                thumbColor={combinedFeatures ? '#ffffff' : '#f4f4f5'}
              />
            </View>

            {/* Theme Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 9, color: colors.subText, fontWeight: '700' }}>🌙</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#71717a', true: '#6366f1' }}
                thumbColor={isDark ? '#ffffff' : '#f4f4f5'}
              />
            </View>

            {/* Admin Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 9, color: colors.subText, fontWeight: '700' }}>🔓</Text>
              <Switch
                value={isAdmin}
                onValueChange={handleAdminToggle}
                trackColor={{ false: '#71717a', true: '#ef4444' }}
                thumbColor={isAdmin ? '#ffffff' : '#f4f4f5'}
              />
            </View>
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
                Net Worth = Cash + Investments {isAdmin ? '+ Platform Ledgers ' : ''}- Expense
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
                  <Text style={[styles.metricAmt, summary.metrics.gamblingProfit >= 0 ? styles.greenText : styles.roseText]}>
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

            {/* QUICK SHORTCUTS */}
            <View style={[styles.exporterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.exporterLabel}>Quick Shortcuts Actions</Text>
              {renderShortcuts()}
            </View>

            {/* PREFERENCES CARD */}
            <View style={[styles.exporterCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
              <Text style={styles.exporterLabel}>Preferences & View Settings</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Show Dashboard Charts</Text>
                  <Text style={{ fontSize: 10, color: colors.subText }}>Display visual reports on the main screen</Text>
                </View>
                <Switch
                  value={showVisualizations}
                  onValueChange={handleToggleVisualizations}
                  trackColor={{ false: '#71717a', true: '#6366f1' }}
                  thumbColor={showVisualizations ? '#ffffff' : '#f4f4f5'}
                />
              </View>
            </View>

          </ScrollView>
        )}

        {/* EDIT PROFILE MODAL */}
        <Modal
          visible={editModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '85%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Edit Profile Details</Text>
                <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                  <Text style={{ fontSize: 16, color: colors.subText }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, marginBottom: 4, textTransform: 'uppercase' }}>Full Name</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Your Name"
                      placeholderTextColor={colors.subText}
                    />
                  </View>

                  <View style={{ zIndex: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, marginBottom: 4, textTransform: 'uppercase' }}>Profession</Text>
                    <TouchableOpacity
                      onPress={() => setProfessionDropdownOpen(!professionDropdownOpen)}
                      style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    >
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{editProfession}</Text>
                      <Text style={{ color: colors.subText, fontSize: 10 }}>▼</Text>
                    </TouchableOpacity>

                    {professionDropdownOpen && (
                      <View style={{ position: 'absolute', top: 56, left: 0, right: 0, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, zIndex: 100, elevation: 5 }}>
                        {['Salaried', 'Farmer', 'Business', 'Student', 'Housewife', 'Freelancer'].map(prof => (
                          <TouchableOpacity
                            key={prof}
                            onPress={() => {
                              handleProfessionChange(prof);
                              setProfessionDropdownOpen(false);
                            }}
                            style={{ padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                          >
                            <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{prof}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, marginBottom: 6, textTransform: 'uppercase' }}>Personalized Categories</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(DEFAULT_CATEGORIES_FOR_PROFESSION[editProfession] || []).map(cat => {
                        const isChecked = editCategories.includes(cat);
                        return (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => {
                              if (isChecked) {
                                setEditCategories(editCategories.filter(c => c !== cat));
                              } else {
                                setEditCategories([...editCategories, cat]);
                              }
                            }}
                            style={{
                              backgroundColor: isChecked ? '#6366f1' : colors.background,
                              borderColor: isChecked ? '#6366f1' : colors.border,
                              borderWidth: 1,
                              borderRadius: 12,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ color: isChecked ? '#ffffff' : colors.text, fontSize: 10, fontWeight: '700' }}>
                              {cat} {isChecked ? '✓' : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, marginBottom: 4, textTransform: 'uppercase' }}>Monthly Income (₹)</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={editIncome}
                      onChangeText={setEditIncome}
                      keyboardType="numeric"
                      placeholder="e.g. 50000"
                      placeholderTextColor={colors.subText}
                    />
                  </View>

                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, marginBottom: 4, textTransform: 'uppercase' }}>Savings Target (₹)</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={editSavings}
                      onChangeText={setEditSavings}
                      keyboardType="numeric"
                      placeholder="e.g. 15000"
                      placeholderTextColor={colors.subText}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, textTransform: 'uppercase' }}>GST Registered User</Text>
                    <Switch
                      value={editGstRegistered}
                      onValueChange={setEditGstRegistered}
                      trackColor={{ false: '#71717a', true: '#2fb09b' }}
                      thumbColor={editGstRegistered ? '#ffffff' : '#f4f4f5'}
                    />
                  </View>

                  {editGstRegistered && (
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.subText, marginBottom: 4, textTransform: 'uppercase' }}>GSTIN Number</Text>
                      <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={editGstNumber}
                        onChangeText={setEditGstNumber}
                        placeholder="GSTIN/UIN number"
                        placeholderTextColor={colors.subText}
                        autoCapitalize="characters"
                      />
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setEditModalOpen(false)}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.subText, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#6366f1' }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Save Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Profile" />

      </View>

      {/* ADMIN LOGIN MODAL */}
      <Modal
        visible={adminModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setAdminModalVisible(false);
          setPasswordInput('');
          setModalError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ADMIN ACCESS GATEWAY</Text>
            <Text style={[styles.modalSub, { color: colors.subText }]}>
              Enter the master credentials password to decrypt database records.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground
                }
              ]}
              secureTextEntry
              value={passwordInput}
              onChangeText={text => {
                setPasswordInput(text);
                setModalError('');
              }}
              placeholder="Master Password..."
              placeholderTextColor={colors.subText}
              onSubmitEditing={handleAdminSubmit}
            />

            {modalError ? <Text style={styles.modalErrorText}>{modalError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setAdminModalVisible(false);
                  setPasswordInput('');
                  setModalError('');
                }}
                style={[styles.modalBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.subText, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdminSubmit}
                style={[styles.modalBtn, { backgroundColor: colors.text, borderColor: colors.text }]}
              >
                <Text style={{ color: colors.background, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* COMBINED PERSONALIZATION SETTINGS MODAL */}
      <Modal
        visible={combinedSettingsModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCombinedSettingsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>👑 Personalization Center</Text>
              <TouchableOpacity onPress={() => setCombinedSettingsModalOpen(false)}>
                <Text style={{ fontSize: 16, color: colors.subText }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.subText, marginBottom: 16 }]}>
              Enable all combined personalization features to access the tools, categories, and charts of all professions simultaneously.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ gap: 16 }}>
                
                {/* Mode Toggle Box */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '900' }}>Combined Mode</Text>
                    <Text style={{ color: colors.subText, fontSize: 9, marginTop: 2 }}>Unlock GST Portal, Tax Center, and switcher tabs globally.</Text>
                  </View>
                  <Switch
                    value={combinedFeatures}
                    onValueChange={handleCombinedFeaturesToggle}
                    trackColor={{ false: '#71717a', true: '#2fb09b' }}
                    thumbColor={combinedFeatures ? '#ffffff' : '#f4f4f5'}
                  />
                </View>

                {/* Features List Breakdown */}
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Included Integrations</Text>
                
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, padding: 10, borderRadius: 12 }}>
                    <Text style={{ fontSize: 16 }}>🌾</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: 'bold' }}>Farmer Category</Text>
                      <Text style={{ color: colors.subText, fontSize: 8.5 }}>6-Month crop sales cycle charts and tax-free exemptions logging.</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, padding: 10, borderRadius: 12 }}>
                    <Text style={{ fontSize: 16 }}>🧾</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: 'bold' }}>Business & GST Portal</Text>
                      <Text style={{ color: colors.subText, fontSize: 8.5 }}>Outward sales vs Inward purchase invoice logging & ITC claims.</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, padding: 10, borderRadius: 12 }}>
                    <Text style={{ fontSize: 16 }}>💻</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: 'bold' }}>Freelancer Mode</Text>
                      <Text style={{ color: colors.subText, fontSize: 8.5 }}>Sec 44ADA presumptive write-offs and client project logs.</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, padding: 10, borderRadius: 12 }}>
                    <Text style={{ fontSize: 16 }}>💵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: 'bold' }}>Salaried Tax Planner</Text>
                      <Text style={{ color: colors.subText, fontSize: 8.5 }}>Union Budget 2025 slabs, 80C/80D deductions checklist.</Text>
                    </View>
                  </View>
                </View>

              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setCombinedSettingsModalOpen(false)}
              style={{
                backgroundColor: colors.text,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 16
              }}
            >
              <Text style={{ color: colors.background, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Done & Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    paddingTop: Platform.OS === 'android' ? 48 : 36,
    paddingBottom: 12,
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
    paddingBottom: 130,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 14,
    marginBottom: 16,
    color: '#71717a',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalErrorText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#f43f5e',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

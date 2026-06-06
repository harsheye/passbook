import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { fetchTransactionsApi, Transaction, getBaseUrl, setBaseUrl, checkHealthApi } from '../api/api';
import {
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  SettingsIcon,
  CheckIcon,
  ShieldIcon,
  HomeIcon,
  SparklesIcon
} from '../components/SvgIcons';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();

  // States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(''); // '', 'Expense', 'Income', 'Transfer'
  
  // Dropdown states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Settings states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  // Summaries
  const [summary, setSummary] = useState({
    netWorth: 0,
    income: 0,
    expense: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTransactionsApi(search, type);
      setTransactions(data);

      // Compute statistics locally based on all transactions returned
      let totalIncome = 0;
      let totalExpense = 0;
      
      data.forEach(t => {
        const amt = t.amount;
        const tType = (t.transactionType || 'Expense').toLowerCase();
        
        if (tType === 'income') {
          totalIncome += amt;
        } else if (tType === 'expense' || tType === 'gambling') {
          totalExpense += Math.abs(amt);
        }
      });

      setSummary({
        netWorth: totalIncome - totalExpense,
        income: totalIncome,
        expense: totalExpense
      });
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload when search or type filter changes
  useEffect(() => {
    loadData();
  }, [search, type]);

  // Reload when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Open settings
  const handleOpenSettings = async () => {
    const currentUrl = await getBaseUrl();
    setServerUrlInput(currentUrl);
    setSettingsOpen(true);
  };

  // Test server connectivity
  const handleSaveSettings = async () => {
    if (!serverUrlInput.trim()) return;
    setTestingConnection(true);
    try {
      await setBaseUrl(serverUrlInput.trim());
      await checkHealthApi();
      Alert.alert('Success', 'Connected to Passbook backend successfully.');
      setSettingsOpen(false);
      loadData();
    } catch (err) {
      Alert.alert('Connection Error', 'Failed to reach backend server at the specified URL. Please make sure port and IP are correct.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleHubPress = async () => {
    navigation.navigate('Hub');
  };

  // Group transactions by Date string for rendering
  const getGroupedData = () => {
    const groups: { [key: string]: Transaction[] } = {};
    
    // Sort transactions by date descending
    const sorted = [...transactions].sort((a, b) => {
      return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
    });

    sorted.forEach(t => {
      const dateKey = t.transactionDate ? t.transactionDate.split('T')[0] : 'no-date';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });

    const listData: ({ type: 'header'; date: string } | { type: 'item'; data: Transaction })[] = [];
    Object.keys(groups).forEach(dateKey => {
      listData.push({ type: 'header', date: dateKey });
      groups[dateKey].forEach(txn => {
        listData.push({ type: 'item', data: txn });
      });
    });

    return listData;
  };

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === 'no-date') return 'No Date';
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <View style={styles.container}>
        
        {/* TOP BAR BRANDING HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandSub}>Smart Finance passbook</Text>
            <Text style={styles.brandTitle}>PASSBOOK</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleHubPress}
              style={[styles.headerBtn, { marginRight: 8 }]}
            >
              <ShieldIcon color="#a78bfa" size={16} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleOpenSettings}
              style={styles.headerBtn}
            >
              <SettingsIcon color="#94a3b8" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* METRICS SUMMARY CARDS */}
        <View style={styles.summaryCard}>
          <Text style={styles.netWorthLabel}>CONSOLIDATED NET WORTH</Text>
          <Text style={styles.netWorthVal}>₹{summary.netWorth.toLocaleString('en-IN')}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summarySubLabel}>TOTAL INFLOWS</Text>
              <Text style={[styles.summaryAmt, styles.incomeColor]}>₹{summary.income.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summarySubLabel}>TOTAL OUTFLOWS</Text>
              <Text style={[styles.summaryAmt, styles.expenseColor]}>₹{summary.expense.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* SEARCH BAR ROW WITH INTEGRATED FILTER DROPDOWN */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <SearchIcon color="#71717a" size={14} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search statements..."
              placeholderTextColor="#71717a"
              value={search}
              onChangeText={setSearch}
            />
            
            {/* INLINE TYPE SELECTOR DROPDOWN */}
            <TouchableOpacity
              onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
              style={styles.filterBtn}
            >
              <Text style={styles.filterBtnText}>
                {type === '' ? 'All' : type === 'Expense' ? 'Exp' : type === 'Income' ? 'Inc' : 'Txf'}
              </Text>
              <ChevronDownIcon color="#a1a1aa" size={10} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DROPDOWN SELECT DIALOG */}
        {typeDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {[
              { label: 'All Transactions', value: '' },
              { label: 'Expenses Only', value: 'Expense' },
              { label: 'Incomes Only', value: 'Income' },
              { label: 'Transfers Only', value: 'Transfer' }
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setType(opt.value);
                  setTypeDropdownOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <Text style={[styles.dropdownText, type === opt.value && styles.dropdownTextActive]}>
                  {opt.label}
                </Text>
                {type === opt.value && <CheckIcon color="#10b981" size={12} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* LEDGER TIMELINE LIST */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2fb09b" />
            <Text style={styles.loadingText}>Fetching statement ledger...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transaction history matched.</Text>
          </View>
        ) : (
          <FlatList
            data={getGroupedData()}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>{formatDateHeader(item.date)}</Text>
                    <View style={styles.dateHeaderLine} />
                  </View>
                );
              }

              const txn = item.data;
              const isExpense = txn.amount < 0;
              const tType = (txn.transactionType || 'Expense').toUpperCase();
              
              // Colors configuration matching desk theme
              let tileBg = '#1c1917';
              let tileBorder = '#27272a';
              let amtColor = '#ef4444';

              if (tType === 'INCOME') {
                tileBg = 'rgba(16,185,129,0.03)';
                tileBorder = 'rgba(16,185,129,0.1)';
                amtColor = '#10b981';
              } else if (tType === 'TRANSFER') {
                tileBg = '#18181b';
                tileBorder = '#27272a';
                amtColor = '#e2e8f0';
              } else {
                tileBg = 'rgba(239,68,68,0.03)';
                tileBorder = 'rgba(239,68,68,0.1)';
              }

              const catName = typeof txn.category === 'object' ? txn.category.name : txn.category;

              return (
                <View style={[styles.tile, { backgroundColor: tileBg, borderColor: tileBorder }]}>
                  <View style={styles.tileLeft}>
                    <View style={styles.tileMeta}>
                      <Text style={styles.tileTime}>{formatTimeStr(txn.transactionDate)}</Text>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{catName || 'Miscellaneous'}</Text>
                      </View>
                      {txn.merchantName ? (
                        <Text style={styles.merchantText}>@{txn.merchantName}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.tileTitle}>{txn.description}</Text>
                  </View>

                  <Text style={[styles.tileAmt, { color: amtColor }]}>
                    {isExpense ? '-' : '+'}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* FLOATING ACTION BUTTON (FAB) */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddTransaction')}
          style={styles.fab}
          activeOpacity={0.8}
        >
          <PlusIcon color="#000" size={20} />
        </TouchableOpacity>

        {/* SETTINGS DIALOG MODAL */}
        <Modal
          visible={settingsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>SERVER URL CONFIG</Text>
              
              <Text style={styles.modalSub}>
                Enter the IP address of your host machine running the Passbook backend server.
              </Text>

              <TextInput
                style={styles.modalInput}
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                placeholder="http://10.0.2.2:5000"
                placeholderTextColor="#71717a"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setSettingsOpen(false)}
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  disabled={testingConnection}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveSettings}
                  style={[styles.modalBtn, styles.modalBtnSave]}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.modalBtnTextSave}>Connect</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* CUSTOM BOTTOM NAVIGATION BAR */}
        <View style={styles.bottomTabBar}>
          {/* Dashboard Tab */}
          <TouchableOpacity
            onPress={() => {}}
            style={styles.tabBtn}
          >
            <HomeIcon color="#ffffff" size={18} />
            <Text style={[styles.tabText, { color: '#ffffff' }]}>Home</Text>
          </TouchableOpacity>

          {/* AI Chat Tab (Highlight) */}
          <View style={styles.centerTabWrapper}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Chat')}
              style={styles.centerTabBtn}
            >
              <SparklesIcon color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>

          {/* Hub Tab */}
          <TouchableOpacity
            onPress={handleHubPress}
            style={styles.tabBtn}
          >
            <ShieldIcon color="#a78bfa" size={18} />
            <Text style={styles.tabText}>Hub</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summarySubLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#a1a1aa',
    letterSpacing: 1,
  },
  summaryAmt: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryDivider: {
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
  searchRow: {
    marginTop: 16,
    flexDirection: 'row',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    height: '100%',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 26,
  },
  filterBtnText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#e2e8f0',
    marginRight: 4,
    textTransform: 'uppercase',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 144,
    right: 22,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 4,
    width: 130,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  dropdownTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    paddingBottom: 150,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  dateHeaderText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#2fb09b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 8,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  tileLeft: {
    flex: 1,
    paddingRight: 8,
  },
  tileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tileTime: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#71717a',
    marginRight: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  tagText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#a1a1aa',
    textTransform: 'uppercase',
  },
  merchantText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f4f4f5',
    marginTop: 4,
  },
  tileAmt: {
    fontSize: 12,
    fontWeight: '900',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#a1a1aa',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717a',
    lineHeight: 14,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  modalBtnSave: {
    backgroundColor: '#ffffff',
  },
  modalBtnTextCancel: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '800',
  },
  modalBtnTextSave: {
    color: '#09090b',
    fontSize: 10,
    fontWeight: '900',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#09090b',
    borderTopWidth: 1,
    borderTopColor: '#1f4246',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 99,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  centerTabWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  centerTabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { fetchTransactionsApi, Transaction, api } from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import {
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  CheckIcon
} from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();

  // States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(''); // '', 'Expense', 'Income', 'Transfer'
  
  // Dropdown state
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const loadData = async () => {
    if (transactions.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchTransactionsApi(search, type);
      setTransactions(data);
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

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this statement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/transactions/${id}`);
              Alert.alert('Deleted', 'Transaction deleted successfully.');
              loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete transaction.');
            }
          }
        }
      ]
    );
  };

  const handleTilePress = (txn: Transaction) => {
    Alert.alert(
      'Transaction Actions',
      `Manage "${txn.description || 'Transaction'}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit Details',
          onPress: () => {
            navigation.navigate('AddTransaction', { transaction: txn });
          }
        },
        {
          text: 'Delete Entry',
          style: 'destructive',
          onPress: () => handleDelete(txn.id)
        }
      ]
    );
  };

  const getGroupedData = () => {
    const grouped: { [key: string]: Transaction[] } = {};
    transactions.forEach(t => {
      let dateStr = 'no-date';
      if (t.transactionDate) {
        dateStr = t.transactionDate.split('T')[0];
      }
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(t);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const listData: any[] = [];
    sortedDates.forEach(date => {
      listData.push({ type: 'header', date });
      grouped[date].forEach(txn => {
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* TOP BAR BRANDING HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.brandSub, { color: colors.subText }]}>Chronological statement log</Text>
            <Text style={[styles.brandTitle, { color: colors.text }]}>TRANSACTIONS</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction')}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <PlusIcon color={colors.text} size={16} />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR ROW WITH INTEGRATED FILTER DROPDOWN */}
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SearchIcon color={colors.subText} size={14} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search statements..."
              placeholderTextColor={colors.subText}
              value={search}
              onChangeText={setSearch}
            />
            
            {/* INLINE TYPE SELECTOR DROPDOWN */}
            <TouchableOpacity
              onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
              style={[styles.filterBtn, { backgroundColor: colors.inputBackground }]}
            >
              <Text style={[styles.filterBtnText, { color: colors.text }]}>
                {type === '' ? 'All' : type === 'Expense' ? 'Exp' : type === 'Income' ? 'Inc' : 'Txf'}
              </Text>
              <ChevronDownIcon color={colors.subText} size={10} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DROPDOWN SELECT DIALOG */}
        {typeDropdownOpen && (
          <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                <Text style={[styles.dropdownText, { color: colors.subText }, type === opt.value && { color: colors.text }]}>
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
            <Text style={[styles.loadingText, { color: colors.subText }]}>Fetching statement ledger...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.subText }]}>No transaction history matched.</Text>
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
                    <View style={[styles.dateHeaderLine, { backgroundColor: colors.border }]} />
                  </View>
                );
              }

              const txn = item.data;
              const isExpense = txn.amount < 0;
              const tType = (txn.transactionType || 'Expense').toUpperCase();
              
              // Colors configuration matching desk theme
              let tileBg = colors.card;
              let tileBorder = colors.border;
              let amtColor = '#ef4444';

              if (tType === 'INCOME') {
                tileBg = isDark ? 'rgba(16,185,129,0.03)' : 'rgba(16,185,129,0.07)';
                tileBorder = 'rgba(16,185,129,0.15)';
                amtColor = '#10b981';
              } else if (tType === 'TRANSFER') {
                tileBg = colors.card;
                tileBorder = colors.border;
                amtColor = colors.text;
              } else {
                tileBg = isDark ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.07)';
                tileBorder = 'rgba(239,68,68,0.15)';
              }

              const catName = typeof txn.category === 'object' ? txn.category.name : txn.category;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleTilePress(txn)}
                  style={[styles.tile, { backgroundColor: tileBg, borderColor: tileBorder }]}
                >
                  <View style={styles.tileLeft}>
                    <View style={styles.tileMeta}>
                      <Text style={[styles.tileTime, { color: colors.subText }]}>{formatTimeStr(txn.transactionDate)}</Text>
                      <View style={[styles.tagBadge, { backgroundColor: colors.inputBackground }]}>
                        <Text style={[styles.tagText, { color: colors.subText }]}>{catName || 'Miscellaneous'}</Text>
                      </View>
                      {txn.merchantName ? (
                        <Text style={styles.merchantText}>@{txn.merchantName}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.tileTitle, { color: colors.text }]}>{txn.description}</Text>
                  </View>

                  <Text style={[styles.tileAmt, { color: amtColor }]}>
                    {isExpense ? '-' : '+'}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Transactions" />

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
  searchRow: {
    marginTop: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    marginBottom: 10,
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
    top: 114,
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
    paddingHorizontal: 16,
    paddingBottom: 40,
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
});

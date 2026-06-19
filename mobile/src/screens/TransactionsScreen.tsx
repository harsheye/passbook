import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { fetchTransactionsApi, Transaction, api } from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import {
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  CheckIcon,
  CalendarIcon,
  FilterIcon
} from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';
import { useTab } from '../context/TabContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

const FILTER_PAYMENT_METHODS = ['All', 'UPI', 'Card', 'Cash', 'Net Banking'];

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();
  const { transactionTick } = useTab();

  // States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States (Applied)
  const [search, setSearch] = useState('');
  const [type, setType] = useState(''); // '', 'Expense', 'Income', 'Transfer'
  const [selectedCategory, setSelectedCategory] = useState(''); // '' means all
  const [paymentMethod, setPaymentMethod] = useState(''); // '' means all
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Filter Modal States
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempType, setTempType] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPaymentMethod, setTempPaymentMethod] = useState('');
  const [tempMinAmount, setTempMinAmount] = useState('');
  const [tempMaxAmount, setTempMaxAmount] = useState('');
  const [modalCategoryDropdownOpen, setModalCategoryDropdownOpen] = useState(false);
  const [modalPmDropdownOpen, setModalPmDropdownOpen] = useState(false);
  
  // Dropdown state
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Month / Year selection
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Reset selected day on month change
  useEffect(() => {
    setSelectedDay(null);
  }, [selectedMonth, selectedYear]);

  const getThreeMonths = () => {
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
    const currDate = new Date(selectedYear, selectedMonth, 1);
    const nextDate = new Date(selectedYear, selectedMonth + 1, 1);
    
    return [
      { name: MONTH_NAMES[prevDate.getMonth()], month: prevDate.getMonth(), year: prevDate.getFullYear(), isSelected: false },
      { name: MONTH_NAMES[currDate.getMonth()], month: currDate.getMonth(), year: currDate.getFullYear(), isSelected: true },
      { name: MONTH_NAMES[nextDate.getMonth()], month: nextDate.getMonth(), year: nextDate.getFullYear(), isSelected: false }
    ];
  };

  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e: any) => {
    touchStartX = e.nativeEvent.pageX;
    touchStartY = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const touchEndY = e.nativeEvent.pageY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        // Swipe Right -> Go to Previous Month
        const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
        if (prevDate.getFullYear() < 2026) {
          Alert.alert('Boundary Reached', 'Cannot navigate before January 2026.');
          return;
        }
        setSelectedMonth(prevDate.getMonth());
        setSelectedYear(prevDate.getFullYear());
      } else {
        // Swipe Left -> Go to Next Month
        const nextDate = new Date(selectedYear, selectedMonth + 1, 1);
        setSelectedMonth(nextDate.getMonth());
        setSelectedYear(nextDate.getFullYear());
      }
    }
  };

  const loadData = async () => {
    if (transactions.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchTransactionsApi({
        search,
        type,
        category: selectedCategory,
        paymentMethod,
        minAmount,
        maxAmount
      });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload when filters change
  useEffect(() => {
    loadData();
  }, [search, type, selectedCategory, paymentMethod, minAmount, maxAmount]);

  const openFilterModal = () => {
    setTempSearch(search);
    setTempType(type);
    setTempCategory(selectedCategory);
    setTempPaymentMethod(paymentMethod);
    setTempMinAmount(minAmount);
    setTempMaxAmount(maxAmount);
    setModalCategoryDropdownOpen(false);
    setModalPmDropdownOpen(false);
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    setSearch(tempSearch);
    setType(tempType);
    setSelectedCategory(tempCategory);
    setPaymentMethod(tempPaymentMethod);
    setMinAmount(tempMinAmount);
    setMaxAmount(tempMaxAmount);
    setFilterModalOpen(false);
  };

  const resetFilters = () => {
    setTempSearch('');
    setTempType('');
    setTempCategory('');
    setTempPaymentMethod('');
    setTempMinAmount('');
    setTempMaxAmount('');
  };

  // Reload when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Also reload when external transaction tick increments (AI save, schedule approve, webhook)
  useEffect(() => {
    if (transactionTick !== undefined) {
      loadData();
    }
  }, [transactionTick]);

  const handleTilePress = (txn: Transaction) => {
    // Navigate directly to AddTransaction (edit mode)
    navigation.navigate('AddTransaction', { transaction: txn });
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const txDate = t.transactionDate || (t as any).date;
      if (!txDate) return false;
      const d = new Date(txDate);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  };

  const getGroupedData = (txns: Transaction[]) => {
    const grouped: { [key: string]: Transaction[] } = {};
    txns.forEach(t => {
      let dateStr = 'no-date';
      const txDate = t.transactionDate || (t as any).date;
      if (txDate) {
        dateStr = txDate.split('T')[0];
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

  // Calendar parameters
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOffset = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDayOffset = getFirstDayOffset(selectedMonth, selectedYear);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(i);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  // Group cells into weeks
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const getDayDetails = (dayNum: number) => {
    const dayDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayTxns = transactions.filter(t => {
      const txDate = t.transactionDate || (t as any).date;
      if (!txDate) return false;
      return txDate.startsWith(dayDateStr);
    });
    const net = dayTxns.reduce((sum, t) => sum + t.amount, 0);
    return {
      net,
      txns: dayTxns
    };
  };

  const formatCompactAmount = (amt: number) => {
    if (amt === 0) return '';
    const absAmt = Math.abs(amt);
    let str = '';
    if (absAmt >= 1000) {
      str = (absAmt / 1000).toFixed(0) + 'k';
    } else {
      str = absAmt.toFixed(0);
    }
    return (amt < 0 ? '-' : '+') + '₹' + str;
  };

  const filtered = getFilteredTransactions();

  const totalIncome = filtered
    .filter(t => (t.transactionType || '').toUpperCase() === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filtered
    .filter(t => (t.transactionType || '').toUpperCase() === 'EXPENSE' || (t.transactionType || '').toUpperCase() === 'GAMBLING')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netMonth = totalIncome - totalExpense;

  const displayTxns = selectedDay !== null
    ? filtered.filter(t => {
        const dayDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const txDate = t.transactionDate || (t as any).date;
        return txDate && txDate.startsWith(dayDateStr);
      })
    : filtered;

  // Render Item for transaction FlatList
  const renderTxnItem = ({ item }: { item: any }) => {
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
    const emoji = CATEGORY_ICONS[catName || ''] || '💰';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleTilePress(txn)}
        style={[styles.tile, { backgroundColor: tileBg, borderColor: tileBorder, flexDirection: 'row', alignItems: 'center' }]}
      >
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
        </View>
        <View style={[styles.tileLeft, { flex: 1 }]}>
          <View style={styles.tileMeta}>
            <Text style={[styles.tileTime, { color: colors.subText }]}>{formatTimeStr(txn.transactionDate || (txn as any).date)}</Text>
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
  };

  const renderCalendarHeader = () => {
    return (
      <View style={{ marginBottom: 16 }}>
        {/* MONTHLY SUMMARY CARD */}
        <View style={[styles.calendarSummaryRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.subText }]}>INFLOWS</Text>
            <Text style={[styles.summaryVal, styles.incomeColor]}>₹{totalIncome.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.subText }]}>OUTFLOWS</Text>
            <Text style={[styles.summaryVal, styles.expenseColor]}>₹{totalExpense.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.subText }]}>NET SAVINGS</Text>
            <Text style={[styles.summaryVal, { color: netMonth >= 0 ? '#10b981' : '#ef4444' }]}>
              {netMonth >= 0 ? '+' : ''}₹{netMonth.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* WEEKDAYS HEADER */}
        <View style={styles.weekHeader}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <Text key={day} style={[styles.weekText, { color: colors.subText }]}>{day}</Text>
          ))}
        </View>

        {/* CALENDAR GRID */}
        <View style={[styles.calendarGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {rows.map((row, rIdx) => (
            <View key={rIdx} style={styles.gridRow}>
              {row.map((dayNum, cIdx) => {
                if (dayNum === null) {
                  return <View key={cIdx} style={styles.cellEmpty} />;
                }

                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === selectedMonth &&
                  new Date().getFullYear() === selectedYear;

                const isSelected = selectedDay === dayNum;
                const { net } = getDayDetails(dayNum);

                let amtColor = '#71717a';
                if (net > 0) amtColor = '#10b981';
                else if (net < 0) amtColor = '#ef4444';

                return (
                  <TouchableOpacity
                    key={cIdx}
                    onPress={() => setSelectedDay(dayNum)}
                    style={[
                      styles.cellTouch,
                      {
                        backgroundColor: isSelected ? '#6366f1' : isToday ? colors.inputBackground : 'transparent',
                        borderColor: isToday ? '#6366f1' : 'transparent',
                        borderWidth: isToday ? 1 : 0
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellDayText,
                        { color: isSelected ? '#ffffff' : colors.text }
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {net !== 0 && (
                      <Text
                        style={[
                          styles.cellAmtText,
                          { color: isSelected ? '#ffffff' : amtColor }
                        ]}
                        numberOfLines={1}
                      >
                        {formatCompactAmount(net)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* SELECTED DAY DETAIL HEADER */}
        {selectedDay !== null && (
          <View style={styles.selectedDayHeader}>
            <Text style={[styles.selectedDayTitle, { color: colors.text }]}>
              Statements for {MONTH_NAMES[selectedMonth]} {selectedDay}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.clearSelectBtn}>
              <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Show All Month</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* TOP BAR BRANDING HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>TRANSACTIONS</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Filter Button */}
            <TouchableOpacity
              onPress={openFilterModal}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: (search || type || selectedCategory || paymentMethod || minAmount || maxAmount) ? '#6366f1' : colors.card,
                  borderColor: (search || type || selectedCategory || paymentMethod || minAmount || maxAmount) ? '#6366f1' : colors.border
                }
              ]}
            >
              <FilterIcon color={(search || type || selectedCategory || paymentMethod || minAmount || maxAmount) ? '#ffffff' : colors.text} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: viewMode === 'calendar' ? '#6366f1' : colors.card,
                  borderColor: viewMode === 'calendar' ? '#6366f1' : colors.border
                }
              ]}
            >
              <CalendarIcon color={viewMode === 'calendar' ? '#ffffff' : colors.text} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3-MONTH COLUMN SELECTOR */}
        <View style={[styles.monthSelectorContainer, { borderBottomColor: colors.border }]}>
          <View style={styles.threeMonthRow}>
            {getThreeMonths().map((m, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  if (m.year < 2026) {
                    Alert.alert('Boundary Reached', 'Cannot navigate before January 2026.');
                    return;
                  }
                  setSelectedMonth(m.month);
                  setSelectedYear(m.year);
                }}
                style={[
                  styles.threeMonthItem,
                  m.isSelected && { borderBottomColor: '#6366f1', borderBottomWidth: 2 }
                ]}
              >
                <Text
                  style={[
                    styles.threeMonthText,
                    { color: colors.text },
                    m.isSelected ? styles.monthTextSelected : styles.monthTextUnselected
                  ]}
                >
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CONTENT WITH SWIPE GESTURE WRAPPER */}
        <View 
          onTouchStart={handleTouchStart} 
          onTouchEnd={handleTouchEnd} 
          style={{ flex: 1 }}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2fb09b" />
              <Text style={[styles.loadingText, { color: colors.subText }]}>Fetching statement ledger...</Text>
            </View>
          ) : viewMode === 'list' ? (
            <FlatList
              data={getGroupedData(filtered)}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={renderTxnItem}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 42, marginBottom: 12 }}>🔭🐷</Text>
                  <Text style={[styles.emptyText, { color: colors.subText }]}>
                    No statements logged for {MONTH_NAMES[selectedMonth]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddTransaction')}
                    style={[styles.addBtnEmpty, { backgroundColor: '#6366f1', borderColor: colors.border }]}
                  >
                    <Text style={styles.addBtnEmptyText}>+ Log Statement</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <FlatList
              data={getGroupedData(displayTxns)}
              keyExtractor={(item, index) => index.toString()}
              ListHeaderComponent={renderCalendarHeader}
              contentContainerStyle={styles.listContainer}
              renderItem={renderTxnItem}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.subText }]}>
                    {selectedDay !== null
                      ? `No statements logged for ${MONTH_NAMES[selectedMonth]} ${selectedDay}`
                      : `No statements logged for ${MONTH_NAMES[selectedMonth]}`}
                  </Text>
                </View>
              )}
            />
          )}
        </View>

        {/* FILTER MODAL */}
        <Modal
          visible={filterModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setFilterModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border, borderWidth: 1 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>FILTER TRANSACTIONS</Text>
                <TouchableOpacity
                  onPress={() => setFilterModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={[styles.modalCloseText, { color: colors.subText }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={{ gap: 16 }}>
                  
                  {/* Search query */}
                  <View>
                    <Text style={styles.formLabel}>Search Description / Merchant</Text>
                    <View style={[styles.modalInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <SearchIcon color={colors.subText} size={14} />
                      <TextInput
                        style={[styles.modalTextInput, { color: colors.text }]}
                        placeholder="e.g. Dominos, Starbucks"
                        placeholderTextColor={colors.subText}
                        value={tempSearch}
                        onChangeText={setTempSearch}
                      />
                    </View>
                  </View>

                  {/* Transaction Type */}
                  <View>
                    <Text style={styles.formLabel}>Transaction Type</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      {['All', 'Income', 'Expense', 'Transfer'].map(t => {
                        const label = t === 'All' ? '' : t;
                        const isSelected = tempType === label;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => setTempType(label)}
                            style={[
                              styles.typeFilterBtn,
                              {
                                backgroundColor: isSelected ? '#6366f1' : colors.inputBackground,
                                borderColor: isSelected ? '#6366f1' : colors.border
                              }
                            ]}
                          >
                            <Text style={[styles.typeFilterText, { color: isSelected ? '#ffffff' : colors.text }]}>{t}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Category Dropdown */}
                  <View style={{ zIndex: 120 }}>
                    <Text style={styles.formLabel}>Category</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setModalCategoryDropdownOpen(!modalCategoryDropdownOpen);
                        setModalPmDropdownOpen(false);
                      }}
                      style={[styles.modalDropdown, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    >
                      <Text style={[styles.modalDropdownText, { color: colors.text }]}>
                        {tempCategory || 'All Categories'}
                      </Text>
                      <ChevronDownIcon color={colors.subText} size={12} />
                    </TouchableOpacity>
                    {modalCategoryDropdownOpen && (
                      <View style={[styles.modalMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                          {['All', ...Object.keys(CATEGORY_ICONS)].map(c => {
                            const label = c === 'All' ? '' : c;
                            return (
                              <TouchableOpacity
                                key={c}
                                onPress={() => {
                                  setTempCategory(label);
                                  setModalCategoryDropdownOpen(false);
                                }}
                                style={[styles.modalMenuItem, { borderBottomColor: colors.border }]}
                              >
                                <Text style={[styles.modalMenuText, { color: colors.text }]}>{c}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Payment Method Dropdown */}
                  <View style={{ zIndex: 110 }}>
                    <Text style={styles.formLabel}>Payment Method</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setModalPmDropdownOpen(!modalPmDropdownOpen);
                        setModalCategoryDropdownOpen(false);
                      }}
                      style={[styles.modalDropdown, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    >
                      <Text style={[styles.modalDropdownText, { color: colors.text }]}>
                        {tempPaymentMethod || 'All Payment Methods'}
                      </Text>
                      <ChevronDownIcon color={colors.subText} size={12} />
                    </TouchableOpacity>
                    {modalPmDropdownOpen && (
                      <View style={[styles.modalMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                          {FILTER_PAYMENT_METHODS.map(pm => {
                            const label = pm === 'All' ? '' : pm;
                            return (
                              <TouchableOpacity
                                key={pm}
                                onPress={() => {
                                  setTempPaymentMethod(label);
                                  setModalPmDropdownOpen(false);
                                }}
                                style={[styles.modalMenuItem, { borderBottomColor: colors.border }]}
                              >
                                <Text style={[styles.modalMenuText, { color: colors.text }]}>{pm}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Amount Range */}
                  <View>
                    <Text style={styles.formLabel}>Amount Range (₹)</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[styles.rangeInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                          placeholder="Min"
                          placeholderTextColor={colors.subText}
                          keyboardType="numeric"
                          value={tempMinAmount}
                          onChangeText={setTempMinAmount}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[styles.rangeInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                          placeholder="Max"
                          placeholderTextColor={colors.subText}
                          keyboardType="numeric"
                          value={tempMaxAmount}
                          onChangeText={setTempMaxAmount}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={resetFilters}
                      style={[styles.actionBtn, { borderColor: colors.border, borderWidth: 1 }]}
                    >
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={applyFilters}
                      style={[styles.actionBtn, { backgroundColor: '#6366f1' }]}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Apply Filters</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

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
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    marginTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    height: '100%',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 26,
  },
  filterBtnText: {
    fontSize: 8,
    fontWeight: '900',
    marginRight: 4,
    textTransform: 'uppercase',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 114,
    right: 22,
    borderWidth: 1,
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
    fontSize: 10,
    fontWeight: '700',
  },
  monthSelectorContainer: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: 10,
  },
  threeMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  threeMonthItem: {
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  threeMonthText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  monthTextSelected: {
    fontWeight: '900',
    opacity: 1,
  },
  monthTextUnselected: {
    fontWeight: '600',
    opacity: 0.4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
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
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 8,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
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
    marginRight: 6,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  tagText: {
    fontSize: 7.5,
    fontWeight: '800',
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
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  addBtnEmpty: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  addBtnEmptyText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  calendarSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '900',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
    marginBottom: 4,
  },
  weekText: {
    fontSize: 8,
    fontWeight: '900',
    width: '13.5%',
    textAlign: 'center',
  },
  calendarGrid: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  cellEmpty: {
    width: '13.5%',
    aspectRatio: 1,
  },
  cellTouch: {
    width: '13.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellDayText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cellAmtText: {
    fontSize: 6.5,
    fontWeight: '900',
    marginTop: 1,
  },
  incomeColor: {
    color: '#10b981',
  },
  expenseColor: {
    color: '#f43f5e',
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  selectedDayTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  clearSelectBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  formLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    color: '#94a3b8',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 42,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    height: '100%',
  },
  typeFilterBtn: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  typeFilterText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 2,
  },
  modalDropdownText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalMenu: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
  },
  modalMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalMenuText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rangeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


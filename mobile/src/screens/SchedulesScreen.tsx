import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
  PanResponder,
  Animated
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  fetchSchedulesApi,
  createScheduleApi,
  updateScheduleApi,
  deleteScheduleApi,
  approveOccurrenceApi,
  skipOccurrenceApi,
  RecurringTransaction,
  api
} from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { useTab } from '../context/TabContext';
import {
  SearchIcon,
  PlusIcon,
  ChevronDownIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  FilterIcon
} from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const SCHEDULE_CATEGORIES = [
  'Subscriptions',
  'Rent',
  'Utilities/Bills',
  'Debt/Loan',
  'Bills/Utilities',
  'Salary',
  'Pocket Money',
  'Other Inflow'
];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'];

const getSubscriptionEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('netflix')) return '🍿';
  if (n.includes('spotify') || n.includes('music') || n.includes('youtube')) return '🎵';
  if (n.includes('amazon') || n.includes('prime')) return '📦';
  if (n.includes('apple')) return '🍎';
  if (n.includes('gym')) return '💪';
  if (n.includes('rent')) return '🏠';
  if (n.includes('mobile') || n.includes('recharge') || n.includes('jio') || n.includes('airtel')) return '📱';
  return '💳';
};

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

export const SchedulesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();
  const { height: screenHeight } = Dimensions.get('window');
  const { triggerOpenSchedule } = useTab();

  // Swipe states
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const touchEndY = e.nativeEvent.pageY;
    const dx = touchEndX - touchStartX.current;
    const dy = touchEndY - touchStartY.current;

    if (touchStartY.current < screenHeight * 0.5) {
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) {
          setStatusFilter('ACTIVE');
        } else {
          setStatusFilter('COMPLETED');
        }
      }
    }
  };

  // States
  const [schedules, setSchedules] = useState<RecurringTransaction[]>([]);
  const [completedLogs, setCompletedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  // Filter States (Applied)
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(''); // 'EXPENSE' or 'INCOME'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Filter Modal States
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState('');
  const [tempFilterType, setTempFilterType] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPaymentMethod, setTempPaymentMethod] = useState('');
  const [tempMinAmount, setTempMinAmount] = useState('');
  const [tempMaxAmount, setTempMaxAmount] = useState('');
  const [modalCategoryDropdownOpen, setModalCategoryDropdownOpen] = useState(false);
  const [modalPmDropdownOpen, setModalPmDropdownOpen] = useState(false);

  // Custom Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Shadcn-style Alert Dialog States
  const [alertDialogVisible, setAlertDialogVisible] = useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState('');
  const [alertDialogDescription, setAlertDialogDescription] = useState('');
  const [alertDialogActionLabel, setAlertDialogActionLabel] = useState('');
  const [alertDialogActionColor, setAlertDialogActionColor] = useState('#6366f1');
  const [onAlertDialogConfirm, setOnAlertDialogConfirm] = useState<() => void>(() => {});

  // Modal Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // PanResponders and Animated Values for bottom sheets swipe-down to close
  const addSheetPanY = useRef(new Animated.Value(0)).current;
  const filterSheetPanY = useRef(new Animated.Value(0)).current;

  const addSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          addSheetPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          setModalOpen(false);
          resetForm();
          addSheetPanY.setValue(0);
        } else {
          Animated.spring(addSheetPanY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const filterSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          filterSheetPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          setFilterModalOpen(false);
          filterSheetPanY.setValue(0);
        } else {
          Animated.spring(filterSheetPanY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (triggerOpenSchedule > 0) {
      resetForm();
      addSheetPanY.setValue(0);
      setModalOpen(true);
    }
  }, [triggerOpenSchedule]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [category, setCategory] = useState('Subscriptions');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [account, setAccount] = useState('SBI');
  const [pm, setPm] = useState('UPI');
  const [notes, setNotes] = useState('');

  // Daily options states
  const [dailyOption, setDailyOption] = useState<'EVERY_DAY' | 'SPECIFIC_DAYS'>('EVERY_DAY');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  // Custom modals states
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Form dropdowns states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [freqDropdownOpen, setFreqDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [pmDropdownOpen, setPmDropdownOpen] = useState(false);

  // Expanded schedule panel states
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);


  const showCustomAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertModalVisible(true);
  };

  const loadData = async () => {
    if (schedules.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchSchedulesApi();
      setSchedules(data);

      const txs = await api.get('/api/transactions');
      const filteredTxs = (txs.data || []).filter((t: any) =>
        (t.description && t.description.toLowerCase().includes('(recurring)')) ||
        (t.note && t.note.toLowerCase().includes('[schedule id:'))
      );
      setCompletedLogs(filteredTxs);
    } catch (err) {
      console.error('Failed to load schedules/transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleSubmit = async () => {
    if (!description.trim() || !amount.trim() || !startDate) {
      showCustomAlert('Validation Error', 'Please fill in description, amount, and start date.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showCustomAlert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }

    setSubmitting(true);
    const payloadTags = (frequency === 'DAILY' && dailyOption === 'SPECIFIC_DAYS')
      ? selectedWeekdays.join(', ')
      : '';

    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      type,
      category,
      frequency,
      startDate,
      endDate: endDate || null,
      account,
      paymentMethod: pm,
      notes: notes.trim(),
      tags: payloadTags
    };

    try {
      if (editingSchedule) {
        await updateScheduleApi(editingSchedule.id, payload);
      } else {
        await createScheduleApi(payload);
      }
      setModalOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      showCustomAlert('Error', 'Failed to save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s: RecurringTransaction) => {
    setEditingSchedule(s);
    setDescription(s.description);
    setAmount(String(s.amount));
    setType(s.type as any);
    setCategory(s.category);
    setFrequency(s.frequency);
    setStartDate(s.startDate.split('T')[0]);
    setEndDate(s.endDate ? s.endDate.split('T')[0] : '');
    setAccount(s.account);
    setPm(s.paymentMethod);
    setNotes(s.notes || '');

    if (s.frequency === 'DAILY' && s.tags && s.tags.trim() !== '') {
      setDailyOption('SPECIFIC_DAYS');
      setSelectedWeekdays(s.tags.split(',').map(str => str.trim()));
    } else {
      setDailyOption('EVERY_DAY');
      setSelectedWeekdays([]);
    }

    addSheetPanY.setValue(0);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setAlertDialogTitle('Cancel Schedule');
    setAlertDialogDescription('Are you sure you want to cancel this recurring schedule? This action cannot be undone.');
    setAlertDialogActionLabel('Cancel Schedule');
    setAlertDialogActionColor('#f43f5e');
    setOnAlertDialogConfirm(() => async () => {
      try {
        await deleteScheduleApi(id);
        loadData();
      } catch (err) {
        showCustomAlert('Error', 'Failed to cancel schedule.');
      }
    });
    setAlertDialogVisible(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveOccurrenceApi(id);
      loadData();
    } catch (err) {
      showCustomAlert('Error', 'Failed to approve occurrence.');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await skipOccurrenceApi(id);
      loadData();
    } catch (err) {
      showCustomAlert('Error', 'Failed to skip occurrence.');
    }
  };

  const confirmSkip = (id: string) => {
    setAlertDialogTitle('Skip Occurrence');
    setAlertDialogDescription('Are you sure you want to skip this payment occurrence? This action cannot be undone.');
    setAlertDialogActionLabel('Skip');
    setAlertDialogActionColor('#6366f1');
    setOnAlertDialogConfirm(() => () => handleSkip(id));
    setAlertDialogVisible(true);
  };

  const confirmApprove = (id: string) => {
    setAlertDialogTitle('Approve Payment');
    setAlertDialogDescription('Are you sure you want to mark this recurring payment as Paid? This will log a new transaction.');
    setAlertDialogActionLabel('Approve');
    setAlertDialogActionColor('#10b981');
    setOnAlertDialogConfirm(() => () => handleApprove(id));
    setAlertDialogVisible(true);
  };

  const handlePressCard = (id: string) => {
    if (expandedScheduleId === id) {
      setExpandedScheduleId(null);
    } else {
      setExpandedScheduleId(id);
    }
  };

  const resetForm = () => {
    setEditingSchedule(null);
    setDescription('');
    setAmount('');
    setType('EXPENSE');
    setCategory('Subscriptions');
    setFrequency('MONTHLY');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setAccount('SBI');
    setPm('UPI');
    setNotes('');
    setDailyOption('EVERY_DAY');
    setSelectedWeekdays([]);
    setTypeDropdownOpen(false);
    setFreqDropdownOpen(false);
    setCatDropdownOpen(false);
    setPmDropdownOpen(false);
  };

  const toggleWeekday = (day: string) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const openFilterModal = () => {
    setTempSearch(search);
    setTempFilterType(filterType);
    setTempCategory(selectedCategory);
    setTempPaymentMethod(paymentMethod);
    setTempMinAmount(minAmount);
    setTempMaxAmount(maxAmount);
    setModalCategoryDropdownOpen(false);
    setModalPmDropdownOpen(false);
    filterSheetPanY.setValue(0);
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    setSearch(tempSearch);
    setFilterType(tempFilterType);
    setSelectedCategory(tempCategory);
    setPaymentMethod(tempPaymentMethod);
    setMinAmount(tempMinAmount);
    setMaxAmount(tempMaxAmount);
    setFilterModalOpen(false);
  };

  const resetFilters = () => {
    setTempSearch('');
    setTempFilterType('');
    setTempCategory('');
    setTempPaymentMethod('');
    setTempMinAmount('');
    setTempMaxAmount('');
  };

  const activeRules = schedules.filter(s => {
    const sStatus = s.status || 'ACTIVE';
    if (sStatus === 'COMPLETED') return false;

    const sCat = typeof s.category === 'object' ? (s.category as any).name : s.category;
    const matchesSearch = !search ||
                          s.description.toLowerCase().includes(search.toLowerCase()) ||
                          (sCat || '').toLowerCase().includes(search.toLowerCase()) ||
                          (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterType) {
      if (s.type.toUpperCase() !== filterType.toUpperCase()) return false;
    }
    if (selectedCategory) {
      if ((sCat || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }
    if (paymentMethod) {
      if (s.paymentMethod.toLowerCase() !== paymentMethod.toLowerCase()) return false;
    }
    if (minAmount) {
      if (s.amount < parseFloat(minAmount)) return false;
    }
    if (maxAmount) {
      if (s.amount > parseFloat(maxAmount)) return false;
    }
    return true;
  });

  // Sort active rules: overdue first, then ascending by nextRunDate
  activeRules.sort((a, b) => {
    const aEffective = getEffectiveNextRunDate(a);
    const bEffective = getEffectiveNextRunDate(b);
    const aDue = aEffective <= new Date();
    const bDue = bEffective <= new Date();

    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    // Ascending sort by nextRunDate
    return new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime();
  });

  const txLogs: RecurringTransaction[] = completedLogs.map(t => {
    const catName = typeof t.category === 'object' ? t.category.name : t.category;
    return {
      id: t.id,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.amount < 0 ? 'EXPENSE' : 'INCOME',
      category: catName || 'Subscriptions',
      frequency: 'ONE-TIME LOG',
      nextRunDate: t.transactionDate,
      notes: t.note || '',
      status: 'COMPLETED',
      isApprovedTx: true,
      paymentMethod: t.paymentMethod || 'UPI',
      account: t.account || 'SBI',
      startDate: t.transactionDate || new Date().toISOString()
    } as RecurringTransaction;
  });

  const cancelledRules = schedules.filter(s => {
    return s.status === 'COMPLETED';
  });

  const mergedCompletedList = cancelledRules.filter(s => {
    const sCat = typeof s.category === 'object' ? (s.category as any).name : s.category;
    const matchesSearch = !search ||
                          s.description.toLowerCase().includes(search.toLowerCase()) ||
                          (sCat || '').toLowerCase().includes(search.toLowerCase()) ||
                          (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterType) {
      if (s.type.toUpperCase() !== filterType.toUpperCase()) return false;
    }
    if (selectedCategory) {
      if ((sCat || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }
    if (paymentMethod) {
      if (s.paymentMethod.toLowerCase() !== paymentMethod.toLowerCase()) return false;
    }
    if (minAmount) {
      if (s.amount < parseFloat(minAmount)) return false;
    }
    if (maxAmount) {
      if (s.amount > parseFloat(maxAmount)) return false;
    }
    return true;
  });

  mergedCompletedList.sort((a, b) => new Date(b.nextRunDate).getTime() - new Date(a.nextRunDate).getTime());

  const filteredSchedules = statusFilter === 'ACTIVE' ? activeRules : mergedCompletedList;

  const renderExpandedPanel = (item: RecurringTransaction) => {
    const history = completedLogs.filter(t => 
      (t.note && t.note.includes(item.id)) ||
      (t.description && t.description.toLowerCase().includes(item.description.toLowerCase()))
    );

    return (
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: '900', color: colors.text, textTransform: 'uppercase' }}>
          Payment History
        </Text>

        {history.length === 0 ? (
          <Text style={{ fontSize: 9, fontStyle: 'italic', color: colors.subText }}>
            No past payments recorded for this schedule.
          </Text>
        ) : (
          <View style={{ marginTop: 4 }}>
            <View style={{ gap: 12 }}>
              {history.map((t, idx) => {
                const payDate = new Date(t.transactionDate || (t as any).date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                const isOverduePaid = t.note && t.note.includes('[Overdue]');
                const statusColor = isOverduePaid ? '#ef4444' : '#10b981';
                const isFirst = idx === 0;
                const isLast = idx === history.length - 1;
                const isOnly = history.length === 1;

                return (
                  <View
                    key={t.id || idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      position: 'relative'
                    }}
                  >
                    {/* Symmetrical Left Timeline Column */}
                    <View style={{ width: 24, position: 'relative' }}>
                      {!isOnly && (
                        <View style={{
                          position: 'absolute',
                          left: 11,
                          top: isFirst ? 22 : 0,
                          bottom: isLast ? undefined : 0,
                          height: isLast ? 22 : undefined,
                          width: 2,
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(99, 102, 241, 0.15)'
                        }} />
                      )}

                      {/* Timeline Dot (Double Ring) */}
                      <View style={{
                        position: 'absolute',
                        left: 4,
                        top: 14,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: isOverduePaid ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: statusColor,
                        }} />
                      </View>
                    </View>

                    {/* Card container */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isDark ? '#27272a' : '#f8fafc',
                        borderRadius: 14,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: colors.border
                      }}
                    >
                      <View style={{ gap: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.text }}>
                          {payDate}
                        </Text>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: colors.subText, textTransform: 'uppercase' }}>
                          💳 {t.paymentMethod || 'Direct Debit'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '900', color: item.type === 'EXPENSE' ? '#f43f5e' : '#10b981' }}>
                          ₹{Math.abs(t.amount).toLocaleString('en-IN')}
                        </Text>
                        <View style={{ 
                          backgroundColor: isOverduePaid ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
                          borderColor: isOverduePaid ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          borderWidth: 1,
                          paddingHorizontal: 8, 
                          paddingVertical: 2, 
                          borderRadius: 6 
                        }}>
                          <Text style={{ 
                            fontSize: 6.5, 
                            fontWeight: '900', 
                            color: statusColor, 
                            textTransform: 'uppercase' 
                          }}>
                            {isOverduePaid ? 'Overdue Paid' : 'Paid'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={{
            height: 42,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            marginTop: 12
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            View / Edit Details
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        
        {/* TOP BAR BRANDING HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>SCHEDULES</Text>
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
          </View>
        </View>

        {/* ACTIVE / COMPLETED TABS ROW */}
        <View style={[styles.statusTabsRow, { marginTop: 12 }]}>
          <TouchableOpacity
            onPress={() => setStatusFilter('ACTIVE')}
            style={[
              styles.statusTabBtn,
              statusFilter === 'ACTIVE'
                ? { backgroundColor: '#6366f1' }
                : { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.statusTabBtnText, { color: statusFilter === 'ACTIVE' ? '#ffffff' : colors.text }]}>
              Active Rules
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatusFilter('COMPLETED')}
            style={[
              styles.statusTabBtn,
              statusFilter === 'COMPLETED'
                ? { backgroundColor: '#6366f1' }
                : { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.statusTabBtnText, { color: statusFilter === 'COMPLETED' ? '#ffffff' : colors.text }]}>
              Cancelled Logs
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOG FEED */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.loadingText}>Loading schedules...</Text>
          </View>
        ) : filteredSchedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No schedules found matching filters.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSchedules}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isExpense = item.type.toUpperCase() === 'EXPENSE';
              const freqText = item.frequency.toLowerCase();
              const cycleText = freqText === 'daily' ? 'day' : freqText === 'weekly' ? 'week' : freqText === 'monthly' ? 'month' : 'year';
              const isDue = getEffectiveNextRunDate(item) <= new Date() && (item.status || 'ACTIVE') !== 'COMPLETED';
              const isCompleted = item.status === 'COMPLETED';
              const cardBorderLeftColor = isCompleted ? '#71717a' : (isExpense ? '#f43f5e' : '#10b981');
              const cardOpacity = isCompleted ? 0.7 : 1;

              const isSubscription = item.category === 'Subscriptions';
              const emoji = getSubscriptionEmoji(item.description);

              if (isSubscription) {
                return (
                  <View
                    style={[
                      styles.productTile,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: cardOpacity
                      }
                    ]}
                  >
                    <View style={[styles.productTileStripe, { backgroundColor: cardBorderLeftColor }]} />
                    
                    <TouchableOpacity
                      activeOpacity={isCompleted ? 1 : 0.7}
                      onPress={() => !isCompleted && handlePressCard(item.id)}
                      style={styles.productTileMain}
                    >
                      <View style={[styles.productLogoContainer, { backgroundColor: colors.inputBackground }]}>
                        <Text style={styles.productEmoji}>{emoji}</Text>
                      </View>
                      
                      <View style={styles.productDetails}>
                        <Text style={[styles.productTitle, { color: colors.text }]}>{item.description}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Text style={[styles.productSub, { color: colors.subText }]}>{item.frequency}</Text>
                          <View style={[styles.bullet, { backgroundColor: colors.subText }]} />
                          <Text style={[styles.productSub, { color: colors.subText }]}>
                            Next: {new Date(item.nextRunDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.productPrice, { color: isExpense ? '#f43f5e' : '#10b981' }]}>
                          {isExpense ? '-' : '+'}₹{Math.abs(item.amount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.productCycle, { color: colors.subText }]}>per {cycleText}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.productTileFooter}>
                      {!isCompleted ? (
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          style={styles.productDeleteBtn}
                        >
                          <Text style={styles.productDeleteText}>Cancel Subscription</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: '#10b981' }]}>
                          <Text style={[styles.badgeText, { color: '#ffffff', fontSize: 8 }]}>COMPLETED LOG</Text>
                        </View>
                      )}
                    </View>

                    {isDue ? (
                      <View style={[styles.pendingContainer, { borderTopColor: colors.border, marginTop: 12 }]}>
                        <View style={styles.pendingIndicator}>
                          <View style={styles.pulseDot} />
                          <Text style={[styles.pendingText, { color: colors.subText }]}>{getPendingText(item)}</Text>
                        </View>
                        <View style={styles.pendingActionRow}>
                          <TouchableOpacity
                            onPress={() => confirmSkip(item.id)}
                            style={[styles.skipBtn, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.skipBtnText, { color: colors.subText }]}>Skip</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmApprove(item.id)}
                            style={styles.approveBtn}
                          >
                            <Text style={styles.approveBtnText}>Pay & Approve</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {expandedScheduleId === item.id ? renderExpandedPanel(item) : null}
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderLeftColor: cardBorderLeftColor,
                      opacity: cardOpacity
                    }
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={isCompleted ? 1 : 0.7}
                    onPress={() => !isCompleted && handlePressCard(item.id)}
                    style={styles.cardHeader}
                  >
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.cardMeta}>
                        <Text style={[styles.cardDateText, { color: colors.subText }]}>
                          Next: {new Date(item.nextRunDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: colors.inputBackground }]}>
                          <Text style={[styles.badgeText, { color: colors.text }]}>
                            {item.frequency} {item.frequency === 'DAILY' && (item as any).tags ? `(${(item as any).tags})` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.cardCategoryText, { color: colors.subText }]}>
                          {typeof item.category === 'object' ? (item.category as any).name : item.category}
                        </Text>
                      </View>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.description}</Text>
                      {item.notes ? (
                        <Text style={[styles.cardNotes, { color: colors.subText }]} numberOfLines={1}>{item.notes}</Text>
                      ) : null}
                    </View>

                    <View style={styles.cardHeaderRight}>
                      <Text style={[styles.cardAmount, { color: isExpense ? '#f43f5e' : '#10b981' }]}>
                        {isExpense ? '-' : '+'}₹{Math.abs(item.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.cardCycle, { color: colors.subText }]}>per {cycleText}</Text>
                      
                      {!isCompleted ? (
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            onPress={() => handleDelete(item.id)}
                            style={[styles.actionBtn, styles.deleteBtn]}
                          >
                            <TrashIcon color="#f43f5e" size={12} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: '#10b981', marginTop: 8 }]}>
                          <Text style={[styles.badgeText, { color: '#ffffff', fontSize: 8 }]}>COMPLETED</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Approve / Skip occurrences pending check */}
                  {isDue ? (
                    <View style={[styles.pendingContainer, { borderTopColor: colors.border }]}>
                      <View style={styles.pendingIndicator}>
                        <View style={styles.pulseDot} />
                        <Text style={[styles.pendingText, { color: colors.subText }]}>{getPendingText(item)}</Text>
                      </View>
                      <View style={styles.pendingActionRow}>
                        <TouchableOpacity
                          onPress={() => confirmSkip(item.id)}
                          style={[styles.skipBtn, { borderColor: colors.border }]}
                        >
                          <Text style={[styles.skipBtnText, { color: colors.subText }]}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmApprove(item.id)}
                          style={styles.approveBtn}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {expandedScheduleId === item.id ? renderExpandedPanel(item) : null}
                </View>
              );
            }}
          />
        )}

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Schedules" />

        {/* SHADCN-STYLE ALERT DIALOG */}
        <Modal
          visible={alertDialogVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setAlertDialogVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(9, 9, 11, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 320,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5
            }}>
              <Text style={{
                fontSize: 15,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 8
              }}>
                {alertDialogTitle}
              </Text>
              <Text style={{
                fontSize: 11,
                color: colors.subText,
                lineHeight: 16,
                marginBottom: 20
              }}>
                {alertDialogDescription}
              </Text>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 8
              }}>
                <TouchableOpacity
                  onPress={() => setAlertDialogVisible(false)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.text
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setAlertDialogVisible(false);
                    onAlertDialogConfirm();
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: alertDialogActionColor,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#ffffff'
                  }}>
                    {alertDialogActionLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* FORM MODAL */}
        <Modal
          visible={modalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setModalOpen(false);
            resetForm();
          }}
        >
          <View style={{
            flex: 1,
            backgroundColor: isDark ? '#09090b' : '#f4f5fa',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 20
          }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{
                width: '100%',
                maxWidth: 360
              }}
            >
              {/* Card Header outside/above the card */}
              <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {editingSchedule ? 'EDIT ENTRY' : 'NEW ENTRY'}
                </Text>
              </View>

              {/* Main Card View (White background, left accent border) */}
              <Animated.View 
                style={[
                  styles.modalCard, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: colors.border,
                    borderLeftWidth: 6,
                    borderLeftColor: type === 'EXPENSE' ? '#f43f5e' : '#10b981',
                    borderRightWidth: 1,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    padding: 20,
                    borderRadius: 24,
                    maxHeight: 520
                  }
                ]}
              >
                <ScrollView
                  contentContainerStyle={{ paddingBottom: 10 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {/* Description */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.formLabel}>Description</Text>
                    <TextInput
                      style={{
                        borderBottomWidth: 1.5,
                        borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '700',
                        paddingVertical: 4,
                        paddingHorizontal: 0,
                        backgroundColor: 'transparent'
                      }}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="e.g. Netflix Subscription"
                      placeholderTextColor={colors.subText}
                    />
                  </View>

                  {/* Billing Frequency */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.formLabel}>Billing Frequency</Text>
                    <View style={[styles.segmentedRow, { backgroundColor: isDark ? '#27272a' : '#f1f5f9', borderColor: 'transparent', borderRadius: 12, padding: 3 }]}>
                      {FREQUENCIES.map(f => {
                        const isFreqDisabled = editingSchedule !== null && (f === 'DAILY' || f === 'WEEKLY');
                        const isSelected = frequency === f;
                        return (
                          <TouchableOpacity
                            key={f}
                            disabled={isFreqDisabled}
                            onPress={() => setFrequency(f)}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSelected ? '#6366f1' : 'transparent',
                              opacity: isFreqDisabled ? 0.3 : 1
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: isSelected ? '900' : '700',
                                color: isSelected ? '#ffffff' : colors.subText
                              }}
                            >
                              {f}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Weekdays selector for DAILY SPECIFIC_DAYS */}
                  {frequency === 'DAILY' && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.formLabel}>Daily Options</Text>
                      <View style={[styles.segmentedRow, { backgroundColor: isDark ? '#27272a' : '#f1f5f9', borderColor: 'transparent', borderRadius: 12, padding: 3, marginBottom: 8 }]}>
                        <TouchableOpacity
                          onPress={() => setDailyOption('EVERY_DAY')}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: dailyOption === 'EVERY_DAY' ? '#6366f1' : 'transparent'
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: dailyOption === 'EVERY_DAY' ? '900' : '700', color: dailyOption === 'EVERY_DAY' ? '#ffffff' : colors.subText }}>Every Day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setDailyOption('SPECIFIC_DAYS')}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: dailyOption === 'SPECIFIC_DAYS' ? '#6366f1' : 'transparent'
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: dailyOption === 'SPECIFIC_DAYS' ? '900' : '700', color: dailyOption === 'SPECIFIC_DAYS' ? '#ffffff' : colors.subText }}>Specific Days</Text>
                        </TouchableOpacity>
                      </View>

                      {dailyOption === 'SPECIFIC_DAYS' && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                            const isSelected = selectedWeekdays.includes(day);
                            return (
                              <TouchableOpacity
                                key={day}
                                onPress={() => toggleWeekday(day)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  borderWidth: 1,
                                  borderColor: isSelected ? '#6366f1' : colors.border,
                                  backgroundColor: isSelected ? '#6366f1' : 'transparent',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 9, fontWeight: '900', color: isSelected ? '#ffffff' : colors.subText }}>
                                  {day[0]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Start Date & Cycle Amount */}
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.formLabel}>Start Date</Text>
                      <CustomDatePicker
                        value={startDate}
                        onChange={setStartDate}
                        dark={isDark}
                        style={{
                          backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                          borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                          borderRadius: 12,
                          height: 42
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { textAlign: 'right' }]}>Cycle Amount (₹)</Text>
                      <TextInput
                        style={{
                          borderBottomWidth: 1.5,
                          borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                          color: type === 'EXPENSE' ? '#f43f5e' : '#10b981',
                          fontSize: 20,
                          fontWeight: '800',
                          paddingVertical: 0,
                          paddingHorizontal: 0,
                          textAlign: 'right',
                          height: 42,
                          backgroundColor: 'transparent'
                        }}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="199.00"
                        placeholderTextColor={colors.subText}
                      />
                    </View>
                  </View>

                  {/* End Date (Optional) */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.formLabel}>End Date (Optional)</Text>
                    <CustomDatePicker
                      value={endDate}
                      onChange={setEndDate}
                      dark={isDark}
                      style={{
                        backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                        borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                        borderRadius: 12,
                        height: 42
                      }}
                    />
                  </View>

                  {/* Dashed Border Box containing TYPE and CATEGORY */}
                  <View 
                    style={{
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: type === 'EXPENSE'
                        ? (isDark ? 'rgba(244, 63, 94, 0.4)' : 'rgba(244, 63, 94, 0.25)')
                        : (isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.25)'),
                      borderRadius: 16,
                      padding: 12,
                      flexDirection: 'row',
                      gap: 12,
                      marginBottom: 16
                    }}
                  >
                    {/* TYPE select dropdown */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Type</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const nextType = type === 'EXPENSE' ? 'INCOME' : 'EXPENSE';
                          setType(nextType);
                          if (nextType === 'INCOME') {
                            setCategory('Salary');
                          } else {
                            if (category === 'Salary') setCategory('Subscriptions');
                          }
                        }}
                        style={{
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: type === 'EXPENSE' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexDirection: 'row',
                          paddingHorizontal: 12
                        }}
                      >
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '900',
                          color: type === 'EXPENSE' ? '#f43f5e' : '#10b981',
                          textTransform: 'uppercase'
                        }}>
                          {type}
                        </Text>
                        <ChevronDownIcon color={type === 'EXPENSE' ? '#f43f5e' : '#10b981'} size={10} />
                      </TouchableOpacity>
                    </View>

                    {/* CATEGORY select dropdown */}
                    <View style={{ flex: 1.2, zIndex: 100 }}>
                      <Text style={styles.formLabel}>Category</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCatDropdownOpen(!catDropdownOpen);
                          setPmDropdownOpen(false);
                        }}
                        style={{
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                          paddingHorizontal: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                          {category}
                        </Text>
                        <ChevronDownIcon color={colors.subText} size={10} />
                      </TouchableOpacity>
                      {catDropdownOpen && (
                        <View style={{
                          marginTop: 4,
                          width: '100%',
                          backgroundColor: colors.card,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 10,
                          padding: 4
                        }}>
                          <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                            {SCHEDULE_CATEGORIES.map(c => (
                              <TouchableOpacity
                                key={c}
                                onPress={() => {
                                  setCategory(c);
                                  setCatDropdownOpen(false);
                                }}
                                style={[styles.modalMenuItem, { borderBottomColor: colors.border }]}
                              >
                                <Text style={[styles.modalMenuText, { color: colors.text }]}>{c}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Account & Payment Method */}
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Account</Text>
                      <TextInput
                        style={{
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                          borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          color: colors.text,
                          fontSize: 11,
                          fontWeight: '700'
                        }}
                        value={account}
                        onChangeText={setAccount}
                        placeholder="SBI"
                        placeholderTextColor={colors.subText}
                      />
                    </View>

                    <View style={{ flex: 1, zIndex: 90 }}>
                      <Text style={styles.formLabel}>Payment Method</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setPmDropdownOpen(!pmDropdownOpen);
                          setCatDropdownOpen(false);
                        }}
                        style={{
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                          borderColor: isDark ? '#3f3f46' : '#cbd5e1',
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                          {pm}
                        </Text>
                        <ChevronDownIcon color={colors.subText} size={10} />
                      </TouchableOpacity>
                      {pmDropdownOpen && (
                        <View style={{
                          marginTop: 4,
                          width: '100%',
                          backgroundColor: colors.card,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 10,
                          padding: 4
                        }}>
                          <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                            {PAYMENT_METHODS.map(p => (
                              <TouchableOpacity
                                key={p}
                                onPress={() => {
                                  setPm(p);
                                  setPmDropdownOpen(false);
                                }}
                                style={[styles.modalMenuItem, { borderBottomColor: colors.border }]}
                              >
                                <Text style={[styles.modalMenuText, { color: colors.text }]}>{p}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Notes Log */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.formLabel}>Notes Log</Text>
                    <TextInput
                      style={{
                        backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                        borderRadius: 16,
                        padding: 12,
                        color: colors.text,
                        fontSize: 11,
                        fontWeight: '600',
                        height: 70,
                        textAlignVertical: 'top'
                      }}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Additional details..."
                      placeholderTextColor={colors.subText}
                      multiline={true}
                      numberOfLines={3}
                    />
                  </View>
                </ScrollView>
              </Animated.View>

              {/* Actions row outside/below the card */}
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginVertical: 12 }} />
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setModalOpen(false);
                      resetForm();
                    }}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '900', color: colors.text, textTransform: 'uppercase' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: isDark ? '#ffffff' : '#0f172a',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '900', color: isDark ? '#000000' : '#ffffff', textTransform: 'uppercase' }}>Save Entry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* SUCCESS MODAL */}
        <Modal
          visible={successModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {}}
        >
          <View style={styles.popupOverlay}>
            <View style={[styles.popupCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
              <View style={styles.successCircle}>
                <Text style={{ fontSize: 24, color: '#ffffff' }}>✓</Text>
              </View>
              <Text style={[styles.popupTitle, { color: colors.text, marginTop: 16 }]}>Success</Text>
              <Text style={[styles.popupBody, { color: colors.subText, textAlign: 'center' }]}>
                {successModalMessage}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSuccessModalVisible(false);
                  loadData();
                }}
                style={styles.successBtn}
              >
                <Text style={styles.successBtnText}>Awesome</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ALERT / WARNING MODAL */}
        <Modal
          visible={alertModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setAlertModalVisible(false)}
        >
          <View style={styles.popupOverlay}>
            <View style={[styles.popupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.popupTitle, { color: '#f56565' }]}>{alertTitle}</Text>
              <Text style={[styles.popupBody, { color: colors.text, marginTop: 8 }]}>
                {alertMessage}
              </Text>
              <TouchableOpacity
                onPress={() => setAlertModalVisible(false)}
                style={[styles.successBtn, { backgroundColor: '#6366f1', marginTop: 16 }]}
              >
                <Text style={styles.successBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* FILTER MODAL */}
        <Modal
          visible={filterModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setFilterModalOpen(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <Animated.View 
              style={[
                styles.filterModalSheet, 
                { 
                  backgroundColor: colors.card, 
                  borderTopColor: colors.border, 
                  borderWidth: 1,
                  transform: [{ translateY: filterSheetPanY }]
                }
              ]}
            >
              {/* Drag Handle Bar */}
              <View {...filterSheetPanResponder.panHandlers} style={{ paddingVertical: 8, width: '100%', alignItems: 'center' }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
              </View>
              <View style={{ alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center', letterSpacing: 0.5 }}>
                  FILTER SCHEDULES
                </Text>
                <Text style={{ fontSize: 11, color: colors.subText, textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
                  Refine your recurring rules by search, type, category, or amount range.
                </Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={{ gap: 16 }}>
                  
                  {/* Search query */}
                  <View>
                    <Text style={styles.formLabel}>Search Description / Category / Notes</Text>
                    <View style={[styles.filterModalInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <SearchIcon color={colors.subText} size={14} />
                      <TextInput
                        style={[styles.filterModalTextInput, { color: colors.text }]}
                        placeholder="e.g. Netflix, Rent, Electricity"
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
                      {['All', 'Income', 'Expense'].map(t => {
                        const label = t === 'All' ? '' : t;
                        const isSelected = tempFilterType.toUpperCase() === label.toUpperCase();
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => setTempFilterType(label)}
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
                          {['All', ...SCHEDULE_CATEGORIES].map(c => {
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
                          {['All', ...PAYMENT_METHODS].map(pm => {
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

                </View>
              </ScrollView>

              {/* Actions sticky at the bottom */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                <TouchableOpacity
                  onPress={resetFilters}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: colors.text, textTransform: 'uppercase' }}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyFilters}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: '#6366f1',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase' }}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? 48 : 36,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  statusTabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  searchRow: {
    marginTop: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
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
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  filterToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  filterDropdownList: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 150,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDropdownBtnText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  cardDateText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#71717a',
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#e4e4e7',
  },
  cardCategoryText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  cardNotes: {
    fontSize: 9,
    color: '#52525b',
    fontWeight: '600',
    marginTop: 2,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardAmount: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardCycle: {
    fontSize: 7.5,
    color: '#52525b',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    borderColor: 'rgba(244,63,94,0.2)',
    backgroundColor: 'rgba(244,63,94,0.05)',
  },
  pendingContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    borderStyle: 'dashed',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  pendingText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#d97706',
    textTransform: 'uppercase',
  },
  pendingActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    width: '100%',
  },
  skipBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 340,
  },
  modalCard: {
    backgroundColor: '#18181b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 8,
    color: '#71717a',
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedBtnActiveExpense: {
    backgroundColor: '#f43f5e',
  },
  segmentedBtnActiveIncome: {
    backgroundColor: '#10b981',
  },
  segmentedBtnActiveDefault: {
    backgroundColor: '#6366f1',
  },
  segmentedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#52525b',
  },
  segmentedTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekdayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090b',
  },
  weekdayCircleActive: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717a',
  },
  weekdayTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  popupCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popupBody: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  successCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  successBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  modalInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    height: 38,
  },
  modalDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  modalDropdownText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    width: '100%',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    zIndex: 100,
  },
  modalMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalMenuText: {
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: '600',
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#27272a',
  },
  saveBtn: {
    backgroundColor: '#ffffff',
  },
  btnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statusToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
    alignItems: 'center',
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  statusToggleBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statusToggleText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  categoryScroll: {
    paddingRight: 16,
  },
  categoryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  categoryBtnText: {
    fontSize: 9,
    fontWeight: '800',
  },
  confirmModalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  confirmSub: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 20,
  },
  confirmActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f43f5e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterDropdownItemText: {
    fontSize: 11,
    fontWeight: '700',
  },
  productTile: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  productTileStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  productTileMain: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  productLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productEmoji: {
    fontSize: 18,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  productSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
  },
  productCycle: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  productTileFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  productDeleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: 'rgba(244,63,94,0.08)',
  },
  productDeleteText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#f43f5e',
    textTransform: 'uppercase',
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
  filterModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 360,
    flexShrink: 1,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterModalTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  filterModalCloseBtn: {
    padding: 4,
  },
  filterModalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 42,
  },
  filterModalTextInput: {
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
  rangeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 11.5,
    fontWeight: '700',
  },
});

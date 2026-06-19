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
  Dimensions
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
  CalendarIcon
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
  const [search, setSearch] = useState('');

  // Custom Filters States
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  // Custom Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Modal Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  useEffect(() => {
    if (triggerOpenSchedule > 0) {
      resetForm();
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
        t.description && t.description.toLowerCase().includes('(recurring)')
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

    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveOccurrenceApi(id);
      // refresh silently
      loadData();
    } catch (err) {
      showCustomAlert('Error', 'Failed to approve occurrence.');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await skipOccurrenceApi(id);
      // refresh silently
      loadData();
    } catch (err) {
      showCustomAlert('Error', 'Failed to skip occurrence.');
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

  const activeRules = schedules.filter(s => {
    const sStatus = s.status || 'ACTIVE';
    if (sStatus === 'COMPLETED') return false;

    const matchesSearch = s.description.toLowerCase().includes(search.toLowerCase()) ||
                          s.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== 'All') {
      if (s.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
    }
    return true;
  });

  const txLogs = completedLogs.map(t => {
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
      isApprovedTx: true
    };
  });

  const cancelledRules = schedules.filter(s => {
    return s.status === 'COMPLETED';
  });

  const mergedCompletedList = [...cancelledRules, ...txLogs].filter(s => {
    const matchesSearch = s.description.toLowerCase().includes(search.toLowerCase()) ||
                          s.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== 'All') {
      if (s.category.toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
    }
    return true;
  });

  mergedCompletedList.sort((a, b) => new Date(b.nextRunDate).getTime() - new Date(a.nextRunDate).getTime());

  const filteredSchedules = statusFilter === 'ACTIVE' ? activeRules : mergedCompletedList;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        
        {/* HEADER SECTION */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>SCHEDULES</Text>
        </View>

        {/* SEARCH BAR ROW */}
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
            <SearchIcon color={colors.subText} size={14} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search schedules..."
              placeholderTextColor="#71717a"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
            style={[
              styles.filterToggleBtn,
              {
                backgroundColor: filterDropdownOpen ? '#6366f1' : colors.card,
                borderColor: filterDropdownOpen ? '#6366f1' : colors.border
              }
            ]}
          >
            <Text style={[styles.filterToggleText, { color: filterDropdownOpen ? '#ffffff' : colors.text }]}>Filters</Text>
            <ChevronDownIcon color={filterDropdownOpen ? '#ffffff' : colors.subText} size={10} />
          </TouchableOpacity>
        </View>

        {/* ACTIVE / COMPLETED TABS ROW */}
        <View style={styles.statusTabsRow}>
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

        {/* FILTERS DROPDOWN BOX */}
        {filterDropdownOpen && (
          <View style={[styles.filterDropdownList, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 1000 }]}>
            {['All', ...SCHEDULE_CATEGORIES].map(cat => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setSelectedCategoryFilter(cat);
                    setFilterDropdownOpen(false);
                  }}
                  style={[
                    styles.filterDropdownItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: 'rgba(99, 102, 241, 0.15)' }
                  ]}
                >
                  <Text style={[styles.filterDropdownItemText, { color: colors.text }, isSelected && { color: '#6366f1', fontWeight: '900' }]}>
                    {cat}
                  </Text>
                  {isSelected && <Text style={{ color: '#6366f1', fontSize: 10 }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
              const cycleText = freqText === 'daily' ? 'day' : freqText === 'weekly' ? 'week' : 'month';
              const isDue = new Date(item.nextRunDate) <= new Date() && (item.status || 'ACTIVE') !== 'COMPLETED';
              const isCompleted = item.status === 'COMPLETED';
              const cardBorderLeftColor = isCompleted ? '#71717a' : (isExpense ? '#f43f5e' : '#10b981');
              const cardOpacity = isCompleted ? 0.7 : 1;

              const isSubscription = item.category === 'Subscriptions';
              const emoji = getSubscriptionEmoji(item.description);

              if (isSubscription) {
                return (
                  <TouchableOpacity
                    onPress={() => !isCompleted && handleEdit(item as any)}
                    activeOpacity={isCompleted ? 1 : 0.7}
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
                    
                    <View style={styles.productTileMain}>
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
                    </View>
                    
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
                      <View style={[styles.pendingContainer, { borderTopColor: colors.border, marginTop: 12, paddingHorizontal: 12, paddingBottom: 12 }]}>
                        <View style={styles.pendingIndicator}>
                          <View style={styles.pulseDot} />
                          <Text style={[styles.pendingText, { color: colors.subText }]}>Pending Approval</Text>
                        </View>
                        <View style={styles.pendingActionRow}>
                          <TouchableOpacity
                            onPress={() => handleSkip(item.id)}
                            style={[styles.skipBtn, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.skipBtnText, { color: colors.subText }]}>Skip</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleApprove(item.id)}
                            style={styles.approveBtn}
                          >
                            <Text style={styles.approveBtnText}>Pay & Approve</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }

              return (
                  <TouchableOpacity
                   onPress={() => !isCompleted && handleEdit(item as any)}
                   activeOpacity={isCompleted ? 1 : 0.7}
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
                  <View style={styles.cardHeader}>
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
                        <Text style={[styles.cardCategoryText, { color: colors.subText }]}>{item.category}</Text>
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
                  </View>

                  {/* Approve / Skip occurrences pending check */}
                  {isDue ? (
                    <View style={[styles.pendingContainer, { borderTopColor: colors.border }]}>
                      <View style={styles.pendingIndicator}>
                        <View style={styles.pulseDot} />
                        <Text style={[styles.pendingText, { color: colors.subText }]}>Pending Approval</Text>
                      </View>
                      <View style={styles.pendingActionRow}>
                        <TouchableOpacity
                          onPress={() => handleSkip(item.id)}
                          style={[styles.skipBtn, { borderColor: colors.border }]}
                        >
                          <Text style={[styles.skipBtnText, { color: colors.subText }]}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleApprove(item.id)}
                          style={styles.approveBtn}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Schedules" />

        {/* CUSTOM DELETE CONFIRMATION MODAL */}
        <Modal
          visible={deleteModalOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setDeleteModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.confirmModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.confirmIconContainer}>
                <TrashIcon color="#f43f5e" size={20} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>Cancel Schedule</Text>
              <Text style={[styles.confirmSub, { color: colors.subText }]}>
                Are you sure you want to cancel this recurring schedule? It will be marked as Completed and moved to your logs.
              </Text>
              <View style={styles.confirmActionRow}>
                <TouchableOpacity
                  onPress={() => setDeleteModalOpen(false)}
                  style={[styles.confirmCancelBtn, { backgroundColor: colors.inputBackground }]}
                >
                  <Text style={[styles.confirmCancelBtnText, { color: colors.text }]}>Keep Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (idToDelete) {
                      try {
                        await deleteScheduleApi(idToDelete);
                        setDeleteModalOpen(false);
                        setIdToDelete(null);
                        // refresh silently
                        loadData();
                      } catch (err) {
                        showCustomAlert('Error', 'Failed to cancel schedule.');
                      }
                    }
                  }}
                  style={styles.confirmDeleteBtn}
                >
                  <Text style={styles.confirmDeleteBtnText}>Yes, Cancel</Text>
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
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                    {editingSchedule ? 'EDIT REPETITION RULE' : 'NEW REPETITION RULE'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setModalOpen(false);
                      resetForm();
                    }}
                    style={styles.closeBtn}
                  >
                    <Text style={[styles.closeBtnText, { color: colors.subText }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  
                  {/* Type Select */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Transaction Type</Text>
                    <View style={[styles.segmentedRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <TouchableOpacity
                        onPress={() => {
                          setType('EXPENSE');
                          if (category === 'Salary') setCategory('Subscriptions');
                        }}
                        style={[
                          styles.segmentedBtn,
                          type === 'EXPENSE' && styles.segmentedBtnActiveExpense
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedText,
                            type === 'EXPENSE' ? { color: '#ffffff', fontWeight: '900' } : { color: colors.subText }
                          ]}
                        >
                          Expense
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setType('INCOME');
                          setCategory('Salary');
                        }}
                        style={[
                          styles.segmentedBtn,
                          type === 'INCOME' && styles.segmentedBtnActiveIncome
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentedText,
                            type === 'INCOME' ? { color: '#ffffff', fontWeight: '900' } : { color: colors.subText }
                          ]}
                        >
                          Income
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Frequency Select */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Billing Frequency</Text>
                    <View style={[styles.segmentedRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      {FREQUENCIES.map(f => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setFrequency(f)}
                          style={[
                            styles.segmentedBtn,
                            frequency === f && styles.segmentedBtnActiveDefault
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentedText,
                              frequency === f ? { color: '#ffffff', fontWeight: '900' } : { color: colors.subText }
                            ]}
                          >
                            {f}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Weekdays selector for DAILY SPECIFIC_DAYS */}
                  {frequency === 'DAILY' ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Daily Options</Text>
                      <View style={[styles.segmentedRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <TouchableOpacity
                          onPress={() => setDailyOption('EVERY_DAY')}
                          style={[
                            styles.segmentedBtn,
                            dailyOption === 'EVERY_DAY' && styles.segmentedBtnActiveDefault
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentedText,
                              dailyOption === 'EVERY_DAY' ? { color: '#ffffff', fontWeight: '900' } : { color: colors.subText }
                            ]}
                          >
                            Every Day
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setDailyOption('SPECIFIC_DAYS')}
                          style={[
                            styles.segmentedBtn,
                            dailyOption === 'SPECIFIC_DAYS' && styles.segmentedBtnActiveDefault
                          ]}
                        >
                          <Text
                            style={[
                              styles.segmentedText,
                              dailyOption === 'SPECIFIC_DAYS' ? { color: '#ffffff', fontWeight: '900' } : { color: colors.subText }
                            ]}
                          >
                            Specific Days
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {dailyOption === 'SPECIFIC_DAYS' ? (
                        <View style={styles.weekdayRow}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                            const isSelected = selectedWeekdays.includes(day);
                            return (
                              <TouchableOpacity
                                key={day}
                                onPress={() => toggleWeekday(day)}
                                style={[
                                  styles.weekdayCircle,
                                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                                  isSelected && styles.weekdayCircleActive
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.weekdayText,
                                    isSelected ? { color: '#ffffff', fontWeight: '900' } : { color: colors.subText }
                                  ]}
                                >
                                  {day[0]}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Description & Amount */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Description</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="e.g. Netflix Subscription"
                        placeholderTextColor={colors.subText}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Cycle Amount (₹)</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="199.00"
                        placeholderTextColor={colors.subText}
                      />
                    </View>
                  </View>

                  {/* Category select row */}
                  <View style={[styles.formGroup, { zIndex: 110 }]}>
                    <Text style={styles.formLabel}>Category</Text>
                    <TouchableOpacity
                      onPress={() => setCatDropdownOpen(!catDropdownOpen)}
                      style={[styles.modalDropdown, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    >
                      <Text style={[styles.modalDropdownText, { color: colors.text }]}>{category || 'Select Category'}</Text>
                      <ChevronDownIcon color={colors.subText} size={12} />
                    </TouchableOpacity>
                    {catDropdownOpen ? (
                      <View style={[styles.modalMenu, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 120 }]}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
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
                    ) : null}
                  </View>

                  {/* Account select row */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Account</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                        value={account}
                        onChangeText={setAccount}
                        placeholder="SBI"
                        placeholderTextColor={colors.subText}
                      />
                    </View>
                  </View>

                  {/* Start Date & End Date */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Start Date</Text>
                      <CustomDatePicker
                        value={startDate}
                        onChange={setStartDate}
                        dark={isDark}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>End Date (Opt)</Text>
                      <CustomDatePicker
                        value={endDate}
                        onChange={setEndDate}
                        dark={isDark}
                      />
                    </View>
                  </View>

                  {/* Payment Method */}
                  <View style={[styles.formGroup, pmDropdownOpen ? { zIndex: 100 } : null]}>
                    <Text style={styles.formLabel}>Payment Method</Text>
                    <TouchableOpacity
                      onPress={() => setPmDropdownOpen(!pmDropdownOpen)}
                      style={[styles.modalDropdown, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    >
                      <Text style={[styles.modalDropdownText, { color: colors.text }]}>{pm}</Text>
                      <ChevronDownIcon color={colors.subText} size={12} />
                    </TouchableOpacity>
                    {pmDropdownOpen ? (
                      <View style={[styles.modalMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
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
                    ) : null}
                  </View>

                  {/* Notes */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Notes</Text>
                    <TextInput
                      style={[styles.modalInput, styles.notesInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Enter subscription/EMI notes..."
                      placeholderTextColor={colors.subText}
                      multiline={true}
                      numberOfLines={3}
                    />
                  </View>

                </ScrollView>

                {/* Submitting Status */}
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginVertical: 10 }} />
                ) : (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setModalOpen(false);
                        resetForm();
                      }}
                      style={[styles.btn, styles.cancelBtn, { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1.5 }]}
                    >
                      <Text style={[styles.btnText, { color: '#ffffff', fontWeight: '900' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      style={[styles.btn, styles.saveBtn, { backgroundColor: '#10b981' }]}
                    >
                      <Text style={[styles.btnText, { color: '#ffffff', fontWeight: 'bold' }]}>Save Rule</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'android' ? 24 : 18,
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
    paddingBottom: 80,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d97706',
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
    textTransform: 'uppercase',
  },
  pendingActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skipBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#a1a1aa',
    textTransform: 'uppercase',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
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
    width: '100%',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    marginTop: 4,
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
});

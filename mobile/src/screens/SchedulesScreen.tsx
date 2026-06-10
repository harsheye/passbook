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
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView
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

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'];
const SCHEDULE_CATEGORIES = [
  'Subscriptions',
  'Rent',
  'Utilities/Bills',
  'Insurance',
  'Salary',
  'Loan/EMI Payments',
  'Other Income',
  'Miscellaneous'
];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'];

export const SchedulesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();

  // States
  const [schedules, setSchedules] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Form dropdowns states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [freqDropdownOpen, setFreqDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [pmDropdownOpen, setPmDropdownOpen] = useState(false);

  const loadData = async () => {
    if (schedules.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchSchedulesApi();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
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
      Alert.alert('Validation Error', 'Please fill in description, amount, and start date.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
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
        Alert.alert('Success', 'Schedule updated successfully.');
      } else {
        await createScheduleApi(payload);
        Alert.alert('Success', 'Schedule created successfully.');
      }
      setModalOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save schedule.');
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
    Alert.alert(
      'Cancel Schedule',
      'Are you sure you want to permanently cancel and delete this recurring schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduleApi(id);
              Alert.alert('Deleted', 'Schedule cancelled successfully.');
              loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel schedule.');
            }
          }
        }
      ]
    );
  };

  const handleApprove = async (id: string) => {
    try {
      await approveOccurrenceApi(id);
      Alert.alert('Approved', 'Transaction generated and logged successfully.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to approve occurrence.');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await skipOccurrenceApi(id);
      Alert.alert('Skipped', 'Occurrence skipped successfully.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to skip occurrence.');
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

  const filteredSchedules = schedules.filter(s =>
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.brandSub, { color: colors.subText }]}>Repetitive ledger rules</Text>
            <Text style={[styles.brandTitle, { color: colors.text }]}>SCHEDULES</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setModalOpen(true);
            }}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <PlusIcon color={colors.text} size={16} />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR ROW */}
        <View style={styles.searchRow}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SearchIcon color={colors.subText} size={14} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search schedules..."
              placeholderTextColor="#71717a"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* LOG FEED */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.loadingText}>Loading active schedules...</Text>
          </View>
        ) : filteredSchedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active repetition schedules found.</Text>
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
              const isDue = new Date(item.nextRunDate) <= new Date();

              return (
                 <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: isExpense ? '#f43f5e' : '#10b981' }
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
                            {item.frequency} {item.frequency === 'DAILY' && item.tags ? `(${item.tags})` : ''}
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
                      
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          onPress={() => handleEdit(item)}
                          style={[styles.actionBtn, { backgroundColor: colors.inputBackground }]}
                        >
                          <PencilIcon color={colors.subText} size={12} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          style={[styles.actionBtn, styles.deleteBtn]}
                        >
                          <TrashIcon color="#f43f5e" size={12} />
                        </TouchableOpacity>
                      </View>
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
                </View>
              );
            }}
          />
        )}

        {/* BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Schedules" />

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
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>
                    {editingSchedule ? 'EDIT REPETITION RULE' : 'NEW REPETITION RULE'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setModalOpen(false);
                      resetForm();
                    }}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
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
                    <View style={styles.segmentedRow}>
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
                            type === 'EXPENSE' && styles.segmentedTextActive
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
                            type === 'INCOME' && styles.segmentedTextActive
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
                    <View style={styles.segmentedRow}>
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
                              frequency === f && styles.segmentedTextActive
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
                      <View style={styles.segmentedRow}>
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
                              dailyOption === 'EVERY_DAY' && styles.segmentedTextActive
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
                              dailyOption === 'SPECIFIC_DAYS' && styles.segmentedTextActive
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
                                  isSelected && styles.weekdayCircleActive
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.weekdayText,
                                    isSelected && styles.weekdayTextActive
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
                        style={styles.modalInput}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="e.g. Netflix Subscription"
                        placeholderTextColor="#71717a"
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Cycle Amount (₹)</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="199.00"
                        placeholderTextColor="#71717a"
                      />
                    </View>
                  </View>

                  {/* Category & Account */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Category</Text>
                      <TouchableOpacity
                        onPress={() => setCatDropdownOpen(!catDropdownOpen)}
                        style={styles.modalDropdown}
                      >
                        <Text numberOfLines={1} style={styles.modalDropdownText}>
                          {category}
                        </Text>
                        <ChevronDownIcon color="#71717a" size={12} />
                      </TouchableOpacity>
                      {catDropdownOpen ? (
                        <View style={styles.modalMenu}>
                          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                            {SCHEDULE_CATEGORIES.map(c => (
                              <TouchableOpacity
                                key={c}
                                onPress={() => {
                                  setCategory(c);
                                  setCatDropdownOpen(false);
                                }}
                                style={styles.modalMenuItem}
                              >
                                <Text style={styles.modalMenuText}>{c}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>Account</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={account}
                        onChangeText={setAccount}
                        placeholder="SBI"
                        placeholderTextColor="#71717a"
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
                        dark={true}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>End Date (Opt)</Text>
                      <CustomDatePicker
                        value={endDate}
                        onChange={setEndDate}
                        dark={true}
                      />
                    </View>
                  </View>

                  {/* Payment Method */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Payment Method</Text>
                    <TouchableOpacity
                      onPress={() => setPmDropdownOpen(!pmDropdownOpen)}
                      style={styles.modalDropdown}
                    >
                      <Text style={styles.modalDropdownText}>{pm}</Text>
                      <ChevronDownIcon color="#71717a" size={12} />
                    </TouchableOpacity>
                    {pmDropdownOpen ? (
                      <View style={styles.modalMenu}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                          {PAYMENT_METHODS.map(p => (
                            <TouchableOpacity
                              key={p}
                              onPress={() => {
                                setPm(p);
                                setPmDropdownOpen(false);
                              }}
                              style={styles.modalMenuItem}
                            >
                              <Text style={styles.modalMenuText}>{p}</Text>
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
                      style={[styles.modalInput, styles.notesInput]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Enter subscription/EMI notes..."
                      placeholderTextColor="#71717a"
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
                      style={[styles.btn, styles.cancelBtn]}
                    >
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      style={[styles.btn, styles.saveBtn]}
                    >
                      <Text style={[styles.btnText, { color: '#000000' }]}>Save Rule</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
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
    marginBottom: 10,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
    gap: 6,
  },
  skipBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skipBtnText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#a1a1aa',
    textTransform: 'uppercase',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  approveBtnText: {
    fontSize: 8,
    fontWeight: '800',
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
    backgroundColor: 'rgba(244,63,94,0.1)',
  },
  segmentedBtnActiveIncome: {
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  segmentedBtnActiveDefault: {
    backgroundColor: '#27272a',
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
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717a',
  },
  weekdayTextActive: {
    color: '#818cf8',
    fontWeight: '900',
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
});

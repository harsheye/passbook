import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  PanResponder,
  Animated
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTransactionApi, api } from '../api/api';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { ChevronDownIcon, TrashIcon } from '../components/SvgIcons';
import { useTheme } from '../context/ThemeContext';

const EXPENSE_CATEGORIES = [
  'Beauty/Wellness',
  'Eating Out/Ordering In',
  'Entertainment',
  'Fitness/Sports',
  'Fuel',
  'Gifts',
  'Groceries',
  'Healthcare',
  'Home Improvement',
  'Loan/EMI Payments',
  'Miscellaneous',
  'Rent',
  'Shopping',
  'Subscriptions',
  'Travel',
  'Utilities/Bills'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Business Income',
  'Interest',
  'Investment Returns',
  'Bonus',
  'Refund',
  'Cashback',
  'Other Income'
];

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  'Eating Out/Ordering In': { emoji: '🍔', color: '#f97316' },
  'Eating Out': { emoji: '🍔', color: '#f97316' },
  'Shopping': { emoji: '🛍️', color: '#ec4899' },
  'Rent': { emoji: '🏠', color: '#8b5cf6' },
  'Travel': { emoji: '🚗', color: '#3b82f6' },
  'Groceries': { emoji: '🛒', color: '#eab308' },
  'Subscriptions': { emoji: '📺', color: '#ef4444' },
  'Utilities/Bills': { emoji: '⚡', color: '#64748b' },
  'Utilities': { emoji: '⚡', color: '#64748b' },
  'Entertainment': { emoji: '🎬', color: '#a855f7' },
  'Fuel': { emoji: '⛽', color: '#f59e0b' },
  'Healthcare': { emoji: '🏥', color: '#10b981' },
  'Beauty/Wellness': { emoji: '💅', color: '#db2777' },
  'Fitness/Sports': { emoji: '🏋️', color: '#06b6d4' },
  'Gifts': { emoji: '🎁', color: '#f43f5e' },
  'Home Improvement': { emoji: '🛠️', color: '#b45309' },
  'Loan/EMI Payments': { emoji: '💳', color: '#475569' },
  'Money Transfers': { emoji: '💸', color: '#10b981' },
  'Miscellaneous': { emoji: '🏷️', color: '#6b7280' },
  'Salary': { emoji: '💼', color: '#10b981' },
  'Freelancing': { emoji: '💻', color: '#14b8a6' },
  'Business Income': { emoji: '📈', color: '#059669' },
  'Interest': { emoji: '🏦', color: '#2563eb' },
  'Investment Returns': { emoji: '📊', color: '#0284c7' },
  'Bonus': { emoji: '🏆', color: '#d97706' },
  'Refund': { emoji: '🔄', color: '#4f46e5' },
  'Cashback': { emoji: '🏷️', color: '#eab308' },
  'Other Income': { emoji: '💰', color: '#10b981' },
  // Personalized Categories for all professions
  'Dining': { emoji: '🍔', color: '#f97316' },
  'Transit': { emoji: '🚇', color: '#3b82f6' },
  'Agriculture Income': { emoji: '🌾', color: '#10b981' },
  'Seeds/Fertilizers': { emoji: '🌱', color: '#eab308' },
  'Equipment': { emoji: '🚜', color: '#f59e0b' },
  'Labor/Wages': { emoji: '👥', color: '#6366f1' },
  'Mandi/Transport': { emoji: '🚚', color: '#3b82f6' },
  'Subsidies': { emoji: '💸', color: '#10b981' },
  'Personal': { emoji: '👤', color: '#6b7280' },
  'Sales Revenue': { emoji: '📈', color: '#10b981' },
  'Inventory Cost': { emoji: '📦', color: '#f59e0b' },
  'Office Rent': { emoji: '🏢', color: '#8b5cf6' },
  'Wages/Salaries': { emoji: '👥', color: '#6366f1' },
  'Marketing': { emoji: '📣', color: '#ec4899' },
  'Tax/GST': { emoji: '🧾', color: '#f43f5e' },
  'Office Supplies': { emoji: '📁', color: '#64748b' },
  'Pocket Money': { emoji: '🪙', color: '#eab308' },
  'Tuition Fees': { emoji: '🎓', color: '#8b5cf6' },
  'Books/Stationery': { emoji: '📚', color: '#b45309' },
  'Dining Out': { emoji: '🍔', color: '#f97316' },
  'Gadgets': { emoji: '💻', color: '#06b6d4' },
  'Household Budget': { emoji: '👛', color: '#ec4899' },
  'Kids Education': { emoji: '🎒', color: '#8b5cf6' },
  'Gold/Jewelry': { emoji: '👑', color: '#eab308' },
  'Emergency Savings': { emoji: '🏦', color: '#10b981' },
  'Client Payments': { emoji: '💳', color: '#10b981' },
  'Software/Tools': { emoji: '🛠️', color: '#475569' },
  'Co-working Rent': { emoji: '🏢', color: '#8b5cf6' },
  'Internet/Phone': { emoji: '🌐', color: '#06b6d4' },
  'Professional Fees': { emoji: '👨‍💼', color: '#6366f1' },
  'GST/Tax': { emoji: '🧾', color: '#f43f5e' }
};

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<any, any>>();
  const { isDark, colors } = useTheme();
  const editingTxn = route.params?.transaction;

  // Form states pre-filled if editing
  const [description, setDescription] = useState(editingTxn ? editingTxn.description : '');
  const [amount, setAmount] = useState(editingTxn ? String(Math.abs(editingTxn.amount)) : '');
  const [txnType, setTxnType] = useState<'Expense' | 'Income' | 'Transfer'>(
    editingTxn ? (editingTxn.transactionType || 'Expense') : 'Expense'
  );
  const [category, setCategory] = useState(
    editingTxn
      ? (typeof editingTxn.category === 'object' ? editingTxn.category.name : editingTxn.category)
      : 'Eating Out/Ordering In'
  );
  const [paymentMethod, setPaymentMethod] = useState(editingTxn ? editingTxn.paymentMethod : 'UPI');
  const [account, setAccount] = useState(editingTxn ? (editingTxn.accountId || editingTxn.account) : 'SBI');
  const [notes, setNotes] = useState(editingTxn ? (editingTxn.note || '') : '');
  const [merchantName, setMerchantName] = useState(editingTxn ? (editingTxn.merchantName || '') : '');
  const [location, setLocation] = useState(editingTxn ? (editingTxn.location || '') : '');
  const [date, setDate] = useState(
    editingTxn
      ? (editingTxn.transactionDate ? editingTxn.transactionDate.split('T')[0] : new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0]
  );

  // Custom categories list from AsyncStorage
  const [customCategories, setCustomCategories] = useState<{ name: string; emoji: string; color: string; type: 'Expense' | 'Income' }[]>([]);

  // Modal / Sheet visibilities
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [pmDropdownOpen, setPmDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // PanResponder for Category Sheet swipe-down close
  const catSheetPanY = useRef(new Animated.Value(0)).current;

  const catSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          catSheetPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(catSheetPanY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCategorySheetVisible(false);
            catSheetPanY.setValue(0);
          });
        } else {
          Animated.spring(catSheetPanY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
  // Custom warning modal
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Custom category form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🍔');
  const [newCatColor, setNewCatColor] = useState('#f97316');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const stored = await AsyncStorage.getItem('custom_categories');
        if (stored) {
          setCustomCategories(JSON.parse(stored) as { name: string; emoji: string; color: string; type: 'Expense' | 'Income' }[]);
        }
      } catch (e) {
        console.error('Failed to load custom categories:', e);
      }
    };
    loadCats();
  }, []);

  const showCustomAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertModalVisible(true);
  };

  const getCategoryDetails = (catName: string) => {
    if (CATEGORY_META[catName]) {
      return CATEGORY_META[catName];
    }
    const custom = customCategories.find(c => c.name === catName);
    if (custom) {
      return { emoji: custom.emoji, color: custom.color };
    }
    return { emoji: '🏷️', color: '#6b7280' };
  };

  const handleTypeSelect = (typeVal: 'Expense' | 'Income' | 'Transfer') => {
    setTxnType(typeVal);
    setTypeDropdownOpen(false);
    if (typeVal === 'Income') {
      setCategory('Salary');
    } else if (typeVal === 'Transfer') {
      setCategory('Money Transfers');
    } else {
      setCategory('Eating Out/Ordering In');
    }
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount.trim()) {
      showCustomAlert('Validation Error', 'Please fill in both a description and amount.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showCustomAlert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }

    setSubmitting(true);
    const signedAmount = txnType === 'Expense' ? -parsedAmount : parsedAmount;

    try {
      if (editingTxn) {
        await api.put(`/api/transactions/${editingTxn.id}`, {
          description: description.trim(),
          amount: signedAmount,
          type: txnType,
          category: txnType === 'Transfer' ? 'Money Transfers' : category,
          paymentMethod,
          account,
          date: new Date(date).toISOString(),
          notes: notes.trim() || undefined,
          merchantName: txnType !== 'Transfer' && merchantName.trim() ? merchantName.trim() : undefined,
          location: txnType !== 'Transfer' && location.trim() ? location.trim() : undefined,
        });
        // Updated successfully - return to previous screen
        navigation.goBack();
      } else {
        await createTransactionApi({
          description: description.trim(),
          amount: signedAmount,
          type: txnType,
          category: txnType === 'Transfer' ? 'Money Transfers' : category,
          paymentMethod,
          account,
          date,
          notes: notes.trim() || undefined,
          merchantName: txnType !== 'Transfer' && merchantName.trim() ? merchantName.trim() : undefined,
          location: txnType !== 'Transfer' && location.trim() ? location.trim() : undefined,
        });
        navigation.goBack();
      }
      // no success modal shown
    } catch (err) {
      showCustomAlert('Submission Error', 'Failed to record the transaction locally.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    setSubmitting(true);
    try {
      await api.delete(`/api/transactions/${editingTxn.id}`);
      // deletion complete — go back
      navigation.goBack();
    } catch (err) {
      showCustomAlert('Error', 'Failed to delete statement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomCategory = async () => {
    if (!newCatName.trim()) {
      showCustomAlert('Validation Error', 'Please enter a category name.');
      return;
    }

    const typeTarget: 'Income' | 'Expense' = txnType === 'Income' ? 'Income' : 'Expense';
    const newCat = {
      name: newCatName.trim(),
      emoji: newCatEmoji,
      color: newCatColor,
      type: typeTarget
    };

    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    try {
      await AsyncStorage.setItem('custom_categories', JSON.stringify(updated));
      setCategory(newCat.name);
      setNewCatName('');
      setIsCreatingCustomCategory(false);
    } catch (e) {
      showCustomAlert('Error', 'Failed to save custom category.');
    }
  };

  const getBorderColor = () => {
    if (txnType === 'Income') return '#2fb09b';
    if (txnType === 'Transfer') return '#71717a';
    return '#f56565';
  };

  const baseCategories = txnType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const filteredCustom = customCategories.filter(c => c.type === (txnType === 'Income' ? 'Income' : 'Expense'));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          
          <Text style={[styles.brandTitle, { color: colors.subText }]}>{editingTxn ? 'EDIT ENTRY' : 'NEW ENTRY'}</Text>

          {/* INPUT FORM CARD */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderLeftColor: getBorderColor(), borderBottomColor: getBorderColor() }]}>
            
            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subText }]}>Description</Text>
              <TextInput
                style={[styles.descInput, { color: colors.text, borderBottomColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder={txnType === 'Transfer' ? 'HDFC to SBI' : 'Restaurant bill...'}
                placeholderTextColor={colors.subText}
              />
            </View>

            {/* Date and Amount Row */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.subText }]}>Date</Text>
                <CustomDatePicker value={date} onChange={setDate} dark={isDark} />
              </View>

              <View style={[styles.col, { alignItems: 'flex-end' }]}>
                <Text style={[styles.label, { color: colors.subText }]}>Amount (₹)</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text, borderBottomColor: colors.border }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.subText}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Dash Box for Type and Category */}
            <View style={[styles.dashBox, { borderColor: getBorderColor() + '66' }]}>
              
              {/* Type Select */}
              <View style={styles.col}>
                <Text style={[styles.boxLabel, { color: colors.subText }]}>Type</Text>
                <TouchableOpacity
                  onPress={() => {
                    setTypeDropdownOpen(!typeDropdownOpen);
                    setPmDropdownOpen(false);
                  }}
                  style={[styles.dropdownBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                >
                  <Text style={[styles.dropdownBtnText, { color: getBorderColor() }]}>{txnType}</Text>
                  <ChevronDownIcon color={colors.subText} size={12} />
                </TouchableOpacity>

                {typeDropdownOpen && (
                  <View style={[styles.boxMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {['Expense', 'Income', 'Transfer'].map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => handleTypeSelect(t as any)}
                        style={styles.boxMenuItem}
                      >
                        <Text style={[styles.boxMenuText, { color: colors.text }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Category Select */}
              <View style={styles.col}>
                <Text style={[styles.boxLabel, { color: colors.subText }]}>Category</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCatDropdownOpen(!catDropdownOpen);
                    setPmDropdownOpen(false);
                    setTypeDropdownOpen(false);
                  }}
                  style={[styles.dropdownBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  disabled={txnType === 'Transfer'}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    {txnType !== 'Transfer' && (
                      <Text style={{ fontSize: 11 }}>{getCategoryDetails(category).emoji}</Text>
                    )}
                    <Text numberOfLines={1} style={[styles.dropdownBtnText, { color: colors.text }]}>
                      {txnType === 'Transfer' ? 'Money Transfers' : category}
                    </Text>
                  </View>
                  {txnType !== 'Transfer' && <ChevronDownIcon color={colors.subText} size={12} />}
                </TouchableOpacity>

                {catDropdownOpen && (
                  <View style={[styles.boxMenu, { left: 0, top: 46, backgroundColor: colors.card, borderColor: colors.border, maxHeight: 200, width: '100%' }]}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 188 }} showsVerticalScrollIndicator={true}>
                      {baseCategories.map(c => {
                        const details = getCategoryDetails(c);
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => {
                              setCategory(c);
                              setCatDropdownOpen(false);
                            }}
                            style={[styles.boxMenuItem, { borderBottomColor: colors.border }]}
                          >
                            <Text style={{ marginRight: 6 }}>{details.emoji}</Text>
                            <Text style={[styles.boxMenuText, { color: colors.text }]}>{c}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {filteredCustom.map(c => (
                        <TouchableOpacity
                          key={c.name}
                          onPress={() => {
                            setCategory(c.name);
                            setCatDropdownOpen(false);
                          }}
                          style={[styles.boxMenuItem, { borderBottomColor: colors.border }]}
                        >
                          <Text style={{ marginRight: 6 }}>{c.emoji}</Text>
                          <Text style={[styles.boxMenuText, { color: colors.text }]}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        onPress={() => {
                          setCatDropdownOpen(false);
                          setIsCreatingCustomCategory(true);
                          setCategorySheetVisible(true);
                        }}
                        style={[styles.boxMenuItem, { borderBottomColor: colors.border, backgroundColor: 'rgba(99, 102, 241, 0.08)' }]}
                      >
                        <Text style={{ marginRight: 6, color: '#6366f1', fontWeight: 'bold' }}>+</Text>
                        <Text style={[styles.boxMenuText, { color: '#6366f1', fontWeight: 'bold' }]}>Create Custom Category</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* Account and Method Row */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.subText }]}>Account</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  value={account}
                  onChangeText={setAccount}
                  placeholder="SBI"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.subText }]}>Payment Method</Text>
                <TouchableOpacity
                  onPress={() => {
                    setPmDropdownOpen(!pmDropdownOpen);
                    setTypeDropdownOpen(false);
                  }}
                  style={[styles.dropdownBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                >
                  <Text style={[styles.dropdownBtnText, { color: colors.text }]}>{paymentMethod}</Text>
                  <ChevronDownIcon color={colors.subText} size={12} />
                </TouchableOpacity>

                {pmDropdownOpen && (
                  <View style={[styles.boxMenu, { right: 0, top: 46, backgroundColor: colors.card, borderColor: colors.border }]}>
                    {['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'].map(method => (
                      <TouchableOpacity
                        key={method}
                        onPress={() => {
                          setPaymentMethod(method);
                          setPmDropdownOpen(false);
                        }}
                        style={styles.boxMenuItem}
                      >
                        <Text style={[styles.boxMenuText, { color: colors.text }]}>{method}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Merchant and Location (Disabled for Transfer) */}
            {txnType !== 'Transfer' && (
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.subText }]}>Merchant</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    placeholder="Swiggy"
                    placeholderTextColor={colors.subText}
                  />
                </View>

                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.subText }]}>Location</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Karimpur"
                    placeholderTextColor={colors.subText}
                  />
                </View>
              </View>
            )}

            {/* Notes Log */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.subText }]}>Notes Log</Text>
              <TextInput
                style={[styles.inputField, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details..."
                placeholderTextColor={colors.subText}
                multiline
                numberOfLines={3}
              />
            </View>

          </View>

          {/* ACTIONS FOOTER CONTROL PANEL */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.btn, styles.btnCancel, { borderColor: colors.border }]}
              disabled={submitting}
            >
              <Text style={[styles.btnTextCancel, { color: colors.subText }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.btn, styles.btnSave, { backgroundColor: colors.text, borderColor: colors.text }]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={[styles.btnTextSave, { color: colors.background }]}>Save Entry</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* BIG DELETE STATEMENT BUTTON */}
          {editingTxn && (
            <TouchableOpacity
              onPress={() => setDeleteModalVisible(true)}
              style={[styles.bigDeleteBtn, { borderColor: '#ef4444' }]}
              disabled={submitting}
            >
              <TrashIcon color="#ef4444" size={14} />
              <Text style={styles.bigDeleteBtnText}>Delete Statement</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* CATEGORY BOTTOM SHEET MODAL */}
      <Modal
        visible={categorySheetVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategorySheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalSheet, 
              { 
                backgroundColor: colors.card, 
                borderTopColor: colors.border, 
                borderWidth: 1,
                transform: [{ translateY: catSheetPanY }]
              }
            ]}
          >
            {/* Drag Handle Bar */}
            <View {...catSheetPanResponder.panHandlers} style={{ paddingVertical: 8, width: '100%', alignItems: 'center' }}>
              <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: colors.border }} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isCreatingCustomCategory ? 'CREATE CATEGORY' : 'SELECT CATEGORY'}
              </Text>
              <TouchableOpacity
                onPress={() => setCategorySheetVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={[styles.modalCloseText, { color: colors.subText }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {isCreatingCustomCategory ? (
              <View style={{ gap: 12 }}>
                <Text style={[styles.label, { color: colors.subText }]}>Category Name</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  placeholder="e.g. Coffee"
                  placeholderTextColor={colors.subText}
                  value={newCatName}
                  onChangeText={setNewCatName}
                />

                <Text style={[styles.label, { color: colors.subText }]}>Choose Emoji Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
                  {['🍔', '🛍️', '🏠', '🚗', '🛒', '📺', '⚡', '🎬', '⛽', '🏥', '💅', '🏋️', '🎁', '🛠️', '💳', '💸', '💼', '💻', '📈', '🏦', '📊', '🏆', '🔄', '🍕', '☕', '🍿', '✈️', '🎮', '💡'].map(em => (
                    <TouchableOpacity
                      key={em}
                      onPress={() => setNewCatEmoji(em)}
                      style={[
                        styles.selectorCircle,
                        { backgroundColor: colors.inputBackground },
                        newCatEmoji === em && { borderColor: '#6366f1', borderWidth: 2 }
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{em}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.label, { color: colors.subText }]}>Choose Accent Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
                  {['#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#eab308', '#ef4444', '#64748b', '#a855f7', '#f59e0b', '#10b981', '#db2777', '#06b6d4', '#f43f5e', '#b45309', '#475569', '#14b8a6', '#059669', '#2563eb', '#0284c7', '#d97706', '#4f46e5'].map(col => (
                    <TouchableOpacity
                      key={col}
                      onPress={() => setNewCatColor(col)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: col },
                        newCatColor === col && { borderColor: colors.text, borderWidth: 2 }
                      ]}
                    />
                  ))}
                </ScrollView>

                <View style={[styles.actions, { marginTop: 12 }]}>
                  <TouchableOpacity
                    onPress={() => setIsCreatingCustomCategory(false)}
                    style={[styles.btn, styles.btnCancel, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.btnTextCancel, { color: colors.subText }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateCustomCategory}
                    style={[styles.btn, styles.btnSave, { backgroundColor: '#6366f1', borderColor: '#6366f1' }]}
                  >
                    <Text style={[styles.btnTextSave, { color: '#ffffff' }]}>Save Category</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Segmented Control for modal sheet */}
                <View style={[styles.modalToggle, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => handleTypeSelect('Expense')}
                    style={[styles.modalToggleBtn, txnType === 'Expense' && styles.modalToggleBtnActive]}
                  >
                    <Text style={[styles.modalToggleText, txnType === 'Expense' && { color: '#ffffff' }]}>EXPENSES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleTypeSelect('Income')}
                    style={[styles.modalToggleBtn, txnType === 'Income' && styles.modalToggleBtnActive]}
                  >
                    <Text style={[styles.modalToggleText, txnType === 'Income' && { color: '#ffffff' }]}>INCOMES</Text>
                  </TouchableOpacity>
                </View>

                {/* Categories Grid */}
                <View style={styles.gridContainer}>
                  {baseCategories.map(cat => {
                    const details = getCategoryDetails(cat);
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          setCategorySheetVisible(false);
                        }}
                        style={[
                          styles.categoryTile,
                          isSelected && { borderColor: details.color, borderWidth: 1.5 }
                        ]}
                      >
                        <View style={[styles.tileBox, { backgroundColor: details.color }]}>
                          <Text style={styles.tileEmoji}>{details.emoji}</Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.tileLabel, { color: colors.text }]}>
                          {cat.split('/')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {filteredCustom.map(cat => {
                    const isSelected = category === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        onPress={() => {
                          setCategory(cat.name);
                          setCategorySheetVisible(false);
                        }}
                        style={[
                          styles.categoryTile,
                          isSelected && { borderColor: cat.color, borderWidth: 1.5 }
                        ]}
                      >
                        <View style={[styles.tileBox, { backgroundColor: cat.color }]}>
                          <Text style={styles.tileEmoji}>{cat.emoji}</Text>
                        </View>
                        <Text numberOfLines={1} style={[styles.tileLabel, { color: colors.text }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add "+" tile */}
                  <TouchableOpacity
                    onPress={() => setIsCreatingCustomCategory(true)}
                    style={styles.categoryTile}
                  >
                    <View style={[styles.tileBox, { backgroundColor: colors.inputBackground, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.border }]}>
                      <Text style={[styles.tileEmoji, { color: colors.text }]}>+</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.tileLabel, { color: colors.subText }]}>
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={[styles.popupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.popupTitle, { color: colors.text }]}>Delete Statement?</Text>
            <Text style={[styles.popupBody, { color: colors.subText }]}>
              Are you sure you want to permanently delete this statement? This action cannot be undone.
            </Text>
            <View style={styles.popupActions}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.popupBtn, styles.popupBtnCancel, { borderColor: colors.border }]}
              >
                <Text style={[styles.popupBtnTextCancel, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={[styles.popupBtn, styles.popupBtnDelete]}
              >
                <Text style={styles.popupBtnTextDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 12,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  brandTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    position: 'relative',
    zIndex: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  descInput: {
    borderBottomWidth: 1.5,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  col: {
    flex: 1,
    marginHorizontal: 4,
    position: 'relative',
  },
  amountInput: {
    borderBottomWidth: 1.5,
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 2,
    paddingHorizontal: 0,
    textAlign: 'right',
    width: 120,
  },
  dashBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 30,
  },
  boxLabel: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
  },
  dropdownBtnText: {
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  boxMenu: {
    position: 'absolute',
    top: 46,
    left: 0,
    width: 140,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  boxMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boxMenuText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    height: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  btnCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnSave: {
    borderWidth: 1,
  },
  btnTextCancel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  btnTextSave: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bigDeleteBtn: {
    marginTop: 20,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bigDeleteBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
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
    maxHeight: '80%',
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
  modalToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalToggleBtnActive: {
    backgroundColor: '#6366f1',
  },
  modalToggleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#71717a',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  categoryTile: {
    width: '22%',
    aspectRatio: 0.85,
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 4,
  },
  tileBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileEmoji: {
    fontSize: 20,
  },
  tileLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderColor: 'transparent',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderColor: 'transparent',
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
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  popupBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  popupBtnCancel: {
    backgroundColor: 'transparent',
  },
  popupBtnDelete: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  popupBtnTextCancel: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  popupBtnTextDelete: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
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
});

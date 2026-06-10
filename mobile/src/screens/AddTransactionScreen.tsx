import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { createTransactionApi, api } from '../api/api';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { ChevronDownIcon } from '../components/SvgIcons';
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
  'Money Transfers',
  'Rent',
  'Shopping',
  'Skill Development',
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

  // Dropdowns toggles
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [pmDropdownOpen, setPmDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

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
      Alert.alert('Validation Error', 'Please fill in description and amount.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount.');
      return;
    }

    setSubmitting(true);
    const signedAmount = txnType === 'Expense' ? -parsedAmount : parsedAmount;

    try {
      if (editingTxn) {
        // PUT update request
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
        Alert.alert('Success', 'Transaction updated successfully.');
      } else {
        // POST create request
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
        Alert.alert('Success', 'Transaction created successfully.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Submission Error', 'Failed to save transaction. Please check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBorderColor = () => {
    if (txnType === 'Income') return '#2fb09b';
    if (txnType === 'Transfer') return '#71717a';
    return '#f56565';
  };

  const categoriesList = txnType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          
          <Text style={[styles.brandTitle, { color: colors.subText }]}>{editingTxn ? 'EDIT ENTRY' : 'NEW ENTRY'}</Text>

          {/* INPUT FORM CARD WITH DYNAMIC ACCENT BORDER */}
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
                    setCategoryDropdownOpen(false);
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
                    setCategoryDropdownOpen(!categoryDropdownOpen);
                    setTypeDropdownOpen(false);
                    setPmDropdownOpen(false);
                  }}
                  style={[styles.dropdownBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  disabled={txnType === 'Transfer'}
                >
                  <Text numberOfLines={1} style={[styles.dropdownBtnText, { color: colors.text }]}>
                    {txnType === 'Transfer' ? 'Money Transfers' : category}
                  </Text>
                  {txnType !== 'Transfer' && <ChevronDownIcon color={colors.subText} size={12} />}
                </TouchableOpacity>

                {categoryDropdownOpen && (
                  <View style={[styles.boxMenu, { right: 0, backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                      {categoriesList.map(c => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => {
                            setCategory(c);
                            setCategoryDropdownOpen(false);
                          }}
                          style={styles.boxMenuItem}
                        >
                          <Text style={[styles.boxMenuText, { color: colors.text }]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
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
                  style={[styles.inputField, { color: colors.text, borderBottomColor: colors.border }]}
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
                    setCategoryDropdownOpen(false);
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
                    style={[styles.inputField, { color: colors.text, borderBottomColor: colors.border }]}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    placeholder="Swiggy"
                    placeholderTextColor={colors.subText}
                  />
                </View>

                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.subText }]}>Location</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderBottomColor: colors.border }]}
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
                style={[styles.inputField, styles.textArea, { color: colors.text, borderBottomColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details..."
                placeholderTextColor={colors.subText}
                multiline
                numberOfLines={3}
              />
            </View>

          </View>

          {/* FORM ACTIONS FOOTER CONTROL PANEL */}
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

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    color: '#a1a1aa',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: '#122325', // Deep premium card contrast matching customizer modal styling
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
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  descInput: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#27272a',
    color: '#ffffff',
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
    borderBottomColor: '#27272a',
    color: '#ffffff',
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
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
  },
  dropdownBtnText: {
    color: '#f4f4f5',
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  boxMenu: {
    position: 'absolute',
    top: 46,
    left: 0,
    width: 140,
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#27272a',
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
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    height: 36,
    paddingHorizontal: 10,
    color: '#ffffff',
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
    borderColor: '#27272a',
    backgroundColor: 'transparent',
  },
  btnSave: {
    backgroundColor: '#ffffff',
  },
  btnTextCancel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  btnTextSave: {
    color: '#09090b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});

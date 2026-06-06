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
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createTransactionApi } from '../api/api';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { ChevronDownIcon } from '../components/SvgIcons';

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

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [txnType, setTxnType] = useState<'Expense' | 'Income' | 'Transfer'>('Expense');
  const [category, setCategory] = useState('Eating Out/Ordering In');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [account, setAccount] = useState('SBI');
  const [notes, setNotes] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
    // Signed amount for DB (negative for Expense, positive for Income/Transfer)
    const signedAmount = txnType === 'Expense' ? -parsedAmount : parsedAmount;

    try {
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
      navigation.goBack();
    } catch (err) {
      Alert.alert('Submission Error', 'Failed to create transaction. Please check server connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Border colors matching web app customizer modal card
  const getBorderColor = () => {
    if (txnType === 'Income') return '#2fb09b';
    if (txnType === 'Transfer') return '#71717a';
    return '#f56565';
  };

  const categoriesList = txnType === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          
          <Text style={styles.brandTitle}>NEW ENTRY</Text>

          {/* INPUT FORM CARD WITH DYNAMIC ACCENT BORDER */}
          <View style={[styles.formCard, { borderLeftColor: getBorderColor(), borderBottomColor: getBorderColor() }]}>
            
            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.descInput}
                value={description}
                onChangeText={setDescription}
                placeholder={txnType === 'Transfer' ? 'HDFC to SBI' : 'Restaurant bill...'}
                placeholderTextColor="#a1a1aa"
              />
            </View>

            {/* Date and Amount Row */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Date</Text>
                <CustomDatePicker value={date} onChange={setDate} dark />
              </View>

              <View style={[styles.col, { alignItems: 'flex-end' }]}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Dash Box for Type and Category */}
            <View style={[styles.dashBox, { borderColor: getBorderColor() + '66' }]}>
              
              {/* Type Select */}
              <View style={styles.col}>
                <Text style={styles.boxLabel}>Type</Text>
                <TouchableOpacity
                  onPress={() => {
                    setTypeDropdownOpen(!typeDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setPmDropdownOpen(false);
                  }}
                  style={styles.dropdownBtn}
                >
                  <Text style={[styles.dropdownBtnText, { color: getBorderColor() }]}>{txnType}</Text>
                  <ChevronDownIcon color="#71717a" size={12} />
                </TouchableOpacity>

                {typeDropdownOpen && (
                  <View style={styles.boxMenu}>
                    {['Expense', 'Income', 'Transfer'].map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => handleTypeSelect(t as any)}
                        style={styles.boxMenuItem}
                      >
                        <Text style={styles.boxMenuText}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Category Select */}
              <View style={styles.col}>
                <Text style={styles.boxLabel}>Category</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCategoryDropdownOpen(!categoryDropdownOpen);
                    setTypeDropdownOpen(false);
                    setPmDropdownOpen(false);
                  }}
                  style={styles.dropdownBtn}
                  disabled={txnType === 'Transfer'}
                >
                  <Text numberOfLines={1} style={styles.dropdownBtnText}>
                    {txnType === 'Transfer' ? 'Money Transfers' : category}
                  </Text>
                  {txnType !== 'Transfer' && <ChevronDownIcon color="#71717a" size={12} />}
                </TouchableOpacity>

                {categoryDropdownOpen && (
                  <View style={[styles.boxMenu, { right: 0 }]}>
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
                          <Text style={styles.boxMenuText}>{c}</Text>
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
                <Text style={styles.label}>Account</Text>
                <TextInput
                  style={styles.inputField}
                  value={account}
                  onChangeText={setAccount}
                  placeholder="SBI"
                  placeholderTextColor="#71717a"
                />
              </View>

              <View style={styles.col}>
                <Text style={styles.label}>Payment Method</Text>
                <TouchableOpacity
                  onPress={() => {
                    setPmDropdownOpen(!pmDropdownOpen);
                    setTypeDropdownOpen(false);
                    setCategoryDropdownOpen(false);
                  }}
                  style={styles.dropdownBtn}
                >
                  <Text style={styles.dropdownBtnText}>{paymentMethod}</Text>
                  <ChevronDownIcon color="#71717a" size={12} />
                </TouchableOpacity>

                {pmDropdownOpen && (
                  <View style={[styles.boxMenu, { right: 0, top: 46 }]}>
                    {['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'].map(method => (
                      <TouchableOpacity
                        key={method}
                        onPress={() => {
                          setPaymentMethod(method);
                          setPmDropdownOpen(false);
                        }}
                        style={styles.boxMenuItem}
                      >
                        <Text style={styles.boxMenuText}>{method}</Text>
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
                  <Text style={styles.label}>Merchant</Text>
                  <TextInput
                    style={styles.inputField}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    placeholder="Swiggy"
                    placeholderTextColor="#71717a"
                  />
                </View>

                <View style={styles.col}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.inputField}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Karimpur"
                    placeholderTextColor="#71717a"
                  />
                </View>
              </View>
            )}

            {/* Notes Log */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes Log</Text>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details..."
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={3}
              />
            </View>

          </View>

          {/* FORM ACTIONS FOOTER CONTROL PANEL */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.btn, styles.btnCancel]}
              disabled={submitting}
            >
              <Text style={styles.btnTextCancel}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.btn, styles.btnSave]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.btnTextSave}>Save Entry</Text>
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
    backgroundColor: '#09090b',
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

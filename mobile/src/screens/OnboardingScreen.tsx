import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const PROFESSIONS = [
  { id: 'Salaried', name: 'Salaried Job', emoji: '💼', desc: 'Full-time or part-time salary earners' },
  { id: 'Farmer', name: 'Farmer', emoji: '🚜', desc: 'Agricultural crop & machinery ledger management' },
  { id: 'Business', name: 'Business Owner', emoji: '🏢', desc: 'Product sales, services, overhead costs & GST' },
  { id: 'Student', name: 'Student', emoji: '🎓', desc: 'Allowances, micro-investments & tuition costs' },
  { id: 'Housewife', name: 'Housewife', emoji: '🏠', desc: 'Home budgets, gold, kids education & savings' },
  { id: 'Freelancer', name: 'Freelancer', emoji: '💻', desc: 'Contract work, software subscriptions & business taxes' },
];

const DEFAULT_CATEGORIES_FOR_PROFESSION: Record<string, string[]> = {
  Salaried: ['Salary', 'Groceries', 'Rent', 'Dining', 'Transit', 'Subscriptions', 'Entertainment', 'Healthcare'],
  Farmer: ['Agriculture Income', 'Seeds/Fertilizers', 'Equipment', 'Labor/Wages', 'Mandi/Transport', 'Subsidies', 'Personal'],
  Business: ['Sales Revenue', 'Inventory Cost', 'Office Rent', 'Utilities', 'Wages/Salaries', 'Marketing', 'Tax/GST', 'Office Supplies'],
  Student: ['Pocket Money', 'Tuition Fees', 'Books/Stationery', 'Dining Out', 'Transit', 'Entertainment', 'Gadgets'],
  Housewife: ['Household Budget', 'Groceries', 'Kids Education', 'Shopping', 'Gold/Jewelry', 'Emergency Savings', 'Utilities'],
  Freelancer: ['Client Payments', 'Software/Tools', 'Co-working Rent', 'Internet/Phone', 'Travel', 'Professional Fees', 'GST/Tax'],
};

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors, isDark } = useTheme();

  // Wizard Steps: 1 = Name, 2 = Profession, 3 = Categories, 4 = GST/Targets
  const [step, setStep] = useState(1);

  // Form States
  const [name, setName] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('Salaried');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [gstRegistered, setGstRegistered] = useState('No');
  const [gstNumber, setGstNumber] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');

  // Handle Profession Click & Set Category Defaults
  const selectProfession = (profId: string) => {
    setSelectedProfession(profId);
    setSelectedCategories(DEFAULT_CATEGORIES_FOR_PROFESSION[profId] || []);
  };

  // Toggle Category Checkbox
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Complete Onboarding & Save
  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to personalize your wallet.');
      setStep(1);
      return;
    }

    const userProfile = {
      name: name.trim(),
      profession: selectedProfession,
      categories: selectedCategories,
      gstRegistered: gstRegistered === 'Yes',
      gstNumber: gstRegistered === 'Yes' ? gstNumber.trim() : '',
      monthlyIncome: Number(monthlyIncome) || 0,
      savingsGoal: Number(savingsGoal) || 0
    };

    try {
      await AsyncStorage.setItem('passbook_user_profile', JSON.stringify(userProfile));
      
      // Seed default custom categories list for Add Transaction if they custom selected any
      const customCats = selectedCategories.map(c => ({
        name: c,
        emoji: '📁',
        color: '#6366f1',
        type: c.toLowerCase().includes('income') || c.toLowerCase().includes('payment') || c.toLowerCase().includes('salary') || c === 'Pocket Money' ? 'Income' : 'Expense'
      }));
      await AsyncStorage.setItem('custom_categories', JSON.stringify(customCats));
      
      await AsyncStorage.setItem('passbook_onboarding_completed', 'true');
      navigation.replace('MainTab');
    } catch (err) {
      console.error('Failed to save user profile:', err);
    }
  };

  const getStepProgressWidth = () => {
    return `${(step / 4) * 100}%` as any;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What should we call you?</Text>
            <Text style={[styles.stepSub, { color: colors.subText }]}>Let's set up your ledger with your custom name.</Text>
            
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name..."
                placeholderTextColor={colors.subText}
                autoFocus
              />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What is your profession?</Text>
            <Text style={[styles.stepSub, { color: colors.subText }]}>We will customize the tax rules, investment trackers, and ledger categories accordingly.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.profScroll}>
              {PROFESSIONS.map(p => {
                const isSelected = selectedProfession === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => selectProfession(p.id)}
                    style={[
                      styles.profCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { borderColor: '#6366f1', borderLeftWidth: 6 }
                    ]}
                  >
                    <View style={styles.profCardHeader}>
                      <Text style={styles.profEmoji}>{p.emoji}</Text>
                      <Text style={[styles.profName, { color: colors.text }]}>{p.name}</Text>
                    </View>
                    <Text style={[styles.profDesc, { color: colors.subText }]}>{p.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Personalize your categories</Text>
            <Text style={[styles.stepSub, { color: colors.subText }]}>Select transaction tags you want active. You can toggle choices below.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catGrid}>
              {(DEFAULT_CATEGORIES_FOR_PROFESSION[selectedProfession] || []).map(cat => {
                const checked = selectedCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleCategory(cat)}
                    style={[
                      styles.catChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      checked && { backgroundColor: '#6366f1', borderColor: '#6366f1' }
                    ]}
                  >
                    <Text style={[styles.catChipText, { color: colors.text }, checked && { color: '#ffffff' }]}>
                      {checked ? '✓ ' : ''}{cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Tax & Income Details</Text>
            <Text style={[styles.stepSub, { color: colors.subText }]}>A few additional parameters to configure your personalized Tax calculations.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Income input */}
              <Text style={[styles.inputLabel, { color: colors.subText }]}>Monthly Income (₹)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 12 }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={monthlyIncome}
                  onChangeText={setMonthlyIncome}
                  placeholder="e.g. 50000"
                  placeholderTextColor={colors.subText}
                  keyboardType="numeric"
                />
              </View>

              {/* Target Savings goal */}
              <Text style={[styles.inputLabel, { color: colors.subText }]}>Monthly Savings Goal (₹)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginBottom: 12 }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={savingsGoal}
                  onChangeText={setSavingsGoal}
                  placeholder="e.g. 15000"
                  placeholderTextColor={colors.subText}
                  keyboardType="numeric"
                />
              </View>

              {/* GST parameters if Freelancer / Business */}
              {(selectedProfession === 'Business' || selectedProfession === 'Freelancer') && (
                <View>
                  <Text style={[styles.inputLabel, { color: colors.subText }]}>Are you GST Registered?</Text>
                  <View style={styles.gstToggleRow}>
                    {['Yes', 'No'].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setGstRegistered(opt)}
                        style={[
                          styles.gstToggleBtn,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          gstRegistered === opt && { backgroundColor: '#6366f1', borderColor: '#6366f1' }
                        ]}
                      >
                        <Text style={[styles.gstToggleText, { color: colors.text }, gstRegistered === opt && { color: '#ffffff' }]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {gstRegistered === 'Yes' && (
                    <View>
                      <Text style={[styles.inputLabel, { color: colors.subText, marginTop: 12 }]}>GSTIN (GST Number)</Text>
                      <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          value={gstNumber}
                          onChangeText={setGstNumber}
                          placeholder="e.g. 07AAAAA1111A1Z1"
                          placeholderTextColor={colors.subText}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.text }]}>SALT ONBOARDING</Text>
        <Text style={[styles.stepCounter, { color: colors.subText }]}>Step {step} of 4</Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.inputBackground }]}>
        <View style={[styles.progressBarFill, { width: getStepProgressWidth() }]} />
      </View>

      <View style={styles.cardContainer}>
        {renderStepContent()}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        {step > 1 ? (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={[styles.btn, styles.btnPrev, { borderColor: colors.border }]}
          >
            <Text style={[styles.btnTextPrev, { color: colors.subText }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < 4 ? (
          <TouchableOpacity
            onPress={() => {
              if (step === 1 && !name.trim()) {
                Alert.alert('Name Required', 'Please enter your name.');
                return;
              }
              // Pre-fill categories on transition from step 2
              if (step === 2 && selectedCategories.length === 0) {
                setSelectedCategories(DEFAULT_CATEGORIES_FOR_PROFESSION[selectedProfession] || []);
              }
              setStep(step + 1);
            }}
            style={[styles.btn, styles.btnNext, { backgroundColor: colors.text }]}
          >
            <Text style={[styles.btnTextNext, { color: colors.background }]}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleFinish}
            style={[styles.btn, styles.btnNext, { backgroundColor: '#10b981' }]}
          >
            <Text style={[styles.btnTextNext, { color: '#ffffff' }]}>Start Journey</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  stepCounter: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressBarBg: {
    height: 4,
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  stepSub: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  profScroll: {
    flex: 1,
  },
  profCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  profCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  profName: {
    fontSize: 13,
    fontWeight: '900',
  },
  profDesc: {
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 14,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  gstToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  gstToggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gstToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 42 : 20,
    alignItems: 'center',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrev: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnNext: {
    elevation: 2,
  },
  btnTextPrev: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  btnTextNext: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, RecurringTransaction } from './types';

export const seedDatabase = async () => {
  try {
    const initialized = await AsyncStorage.getItem('passbook_initialized_release_v2');
    if (initialized === 'true') return;

    const oldKeys = [
      'passbook_transactions',
      'passbook_schedules',
      'passbook_gambling_platforms',
      'passbook_gambling_entries',
      'passbook_admin_logged_in',
      'passbook_initialized_v3',
      'passbook_initialized_release_v1',
      'custom_categories'
    ];
    await AsyncStorage.multiRemove(oldKeys);

    const mockTransactions: Transaction[] = [
      // January 2026
      {
        id: 'tx_jan_sal',
        transactionDate: '2026-01-01T09:00:00.000Z',
        description: 'Monthly Salary Payment',
        amount: 80000,
        transactionType: 'INCOME',
        category: 'Salary',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: 'Seeded initial salary',
        favorite: false
      },
      {
        id: 'tx_jan_rent',
        transactionDate: '2026-01-05T10:00:00.000Z',
        description: 'House Rent (Recurring)',
        amount: -20000,
        transactionType: 'EXPENSE',
        category: 'Rent',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_rent] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_jan_groc',
        transactionDate: '2026-01-10T15:30:00.000Z',
        description: 'Weekly grocery run',
        amount: -4500,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Cash',
        accountId: 'Cash',
        account: 'Cash',
        note: 'Fresh market buy',
        favorite: false
      },
      {
        id: 'tx_jan_dining',
        transactionDate: '2026-01-15T21:00:00.000Z',
        description: 'Dinner with friends',
        amount: -2400,
        transactionType: 'EXPENSE',
        category: 'Eating Out/Ordering In',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: 'Weekend dinner',
        favorite: false
      },
      {
        id: 'tx_jan_elec',
        transactionDate: '2026-01-15T10:00:00.000Z',
        description: 'Electricity & Water Bill (Recurring)',
        amount: -2800,
        transactionType: 'EXPENSE',
        category: 'Utilities',
        paymentMethod: 'UPI',
        accountId: 'SBI',
        account: 'SBI',
        note: '[Schedule ID: sc_elec] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_jan_groc2',
        transactionDate: '2026-01-22T12:00:00.000Z',
        description: 'Supermarket supplies',
        amount: -3200,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        note: 'Monthly provisions',
        favorite: false
      },
      {
        id: 'tx_jan_sub',
        transactionDate: '2026-01-25T08:00:00.000Z',
        description: 'Netflix Subscription (Recurring)',
        amount: -649,
        transactionType: 'EXPENSE',
        category: 'Subscriptions',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_netflix] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_jan_shop',
        transactionDate: '2026-01-18T16:00:00.000Z',
        description: 'Winter Jacket',
        amount: -8500,
        transactionType: 'EXPENSE',
        category: 'Shopping',
        paymentMethod: 'Card',
        accountId: 'SBI',
        account: 'SBI',
        note: 'Mall purchase',
        favorite: false
      },

      // February 2026
      {
        id: 'tx_feb_sal',
        transactionDate: '2026-02-01T09:00:00.000Z',
        description: 'Monthly Salary Payment',
        amount: 80000,
        transactionType: 'INCOME',
        category: 'Salary',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_feb_rent',
        transactionDate: '2026-02-05T10:00:00.000Z',
        description: 'House Rent (Recurring)',
        amount: -20000,
        transactionType: 'EXPENSE',
        category: 'Rent',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_rent] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_feb_groc',
        transactionDate: '2026-02-08T14:00:00.000Z',
        description: 'Organic vegetables',
        amount: -5100,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Cash',
        accountId: 'Cash',
        account: 'Cash',
        favorite: false
      },
      {
        id: 'tx_feb_dining',
        transactionDate: '2026-02-14T20:30:00.000Z',
        description: 'Valentine Dinner',
        amount: -4500,
        transactionType: 'EXPENSE',
        category: 'Eating Out/Ordering In',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_feb_elec',
        transactionDate: '2026-02-15T10:00:00.000Z',
        description: 'Electricity & Water Bill (Recurring)',
        amount: -3100,
        transactionType: 'EXPENSE',
        category: 'Utilities',
        paymentMethod: 'UPI',
        accountId: 'SBI',
        account: 'SBI',
        note: '[Schedule ID: sc_elec] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_feb_groc2',
        transactionDate: '2026-02-20T11:00:00.000Z',
        description: 'Weekly staples',
        amount: -2800,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_feb_sub',
        transactionDate: '2026-02-25T08:00:00.000Z',
        description: 'Netflix Subscription (Recurring)',
        amount: -649,
        transactionType: 'EXPENSE',
        category: 'Subscriptions',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_netflix] Approved recurring transaction',
        favorite: false
      },

      // March 2026
      {
        id: 'tx_mar_sal',
        transactionDate: '2026-03-01T09:00:00.000Z',
        description: 'Monthly Salary Payment',
        amount: 85000,
        transactionType: 'INCOME',
        category: 'Salary',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_mar_rent',
        transactionDate: '2026-03-05T10:00:00.000Z',
        description: 'House Rent (Recurring)',
        amount: -20000,
        transactionType: 'EXPENSE',
        category: 'Rent',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_rent] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_mar_shop',
        transactionDate: '2026-03-10T17:00:00.000Z',
        description: 'New Running Shoes',
        amount: -6200,
        transactionType: 'EXPENSE',
        category: 'Shopping',
        paymentMethod: 'Card',
        accountId: 'SBI',
        account: 'SBI',
        favorite: false
      },
      {
        id: 'tx_mar_groc',
        transactionDate: '2026-03-12T14:30:00.000Z',
        description: 'Spices and kitchen essentials',
        amount: -4800,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Cash',
        accountId: 'Cash',
        account: 'Cash',
        favorite: false
      },
      {
        id: 'tx_mar_elec',
        transactionDate: '2026-03-15T10:00:00.000Z',
        description: 'Electricity & Water Bill (Recurring)',
        amount: -2950,
        transactionType: 'EXPENSE',
        category: 'Utilities',
        paymentMethod: 'UPI',
        accountId: 'SBI',
        account: 'SBI',
        note: '[Schedule ID: sc_elec] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_mar_dining',
        transactionDate: '2026-03-18T20:00:00.000Z',
        description: 'Weekend Lunch with Family',
        amount: -3100,
        transactionType: 'EXPENSE',
        category: 'Eating Out/Ordering In',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_mar_groc2',
        transactionDate: '2026-03-25T11:00:00.000Z',
        description: 'Monthly pantry restock',
        amount: -3500,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_mar_sub',
        transactionDate: '2026-03-25T08:00:00.000Z',
        description: 'Netflix Subscription (Recurring)',
        amount: -649,
        transactionType: 'EXPENSE',
        category: 'Subscriptions',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_netflix] Approved recurring transaction',
        favorite: false
      },

      // April 2026
      {
        id: 'tx_apr_sal',
        transactionDate: '2026-04-01T09:00:00.000Z',
        description: 'Monthly Salary Payment',
        amount: 85000,
        transactionType: 'INCOME',
        category: 'Salary',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_apr_rent',
        transactionDate: '2026-04-05T10:00:00.000Z',
        description: 'House Rent (Recurring)',
        amount: -20000,
        transactionType: 'EXPENSE',
        category: 'Rent',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_rent] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_apr_groc',
        transactionDate: '2026-04-11T13:00:00.000Z',
        description: 'Fresh veggies and milk',
        amount: -4200,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Cash',
        accountId: 'Cash',
        account: 'Cash',
        favorite: false
      },
      {
        id: 'tx_apr_elec',
        transactionDate: '2026-04-15T10:00:00.000Z',
        description: 'Electricity & Water Bill (Recurring)',
        amount: -3400,
        transactionType: 'EXPENSE',
        category: 'Utilities',
        paymentMethod: 'UPI',
        accountId: 'SBI',
        account: 'SBI',
        note: '[Schedule ID: sc_elec] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_apr_dining',
        transactionDate: '2026-04-18T19:30:00.000Z',
        description: 'Pizza night',
        amount: -2800,
        transactionType: 'EXPENSE',
        category: 'Eating Out/Ordering In',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_apr_groc2',
        transactionDate: '2026-04-24T12:00:00.000Z',
        description: 'Mid-month supply run',
        amount: -3100,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_apr_sub',
        transactionDate: '2026-04-25T08:00:00.000Z',
        description: 'Netflix Subscription (Recurring)',
        amount: -649,
        transactionType: 'EXPENSE',
        category: 'Subscriptions',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_netflix] Approved recurring transaction',
        favorite: false
      },

      // May 2026
      {
        id: 'tx_may_sal',
        transactionDate: '2026-05-01T09:00:00.000Z',
        description: 'Monthly Salary Payment',
        amount: 85000,
        transactionType: 'INCOME',
        category: 'Salary',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_may_rent',
        transactionDate: '2026-05-05T10:00:00.000Z',
        description: 'House Rent (Recurring)',
        amount: -20000,
        transactionType: 'EXPENSE',
        category: 'Rent',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_rent] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_may_groc',
        transactionDate: '2026-05-10T14:00:00.000Z',
        description: 'Bulk store purchase',
        amount: -5500,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Cash',
        accountId: 'Cash',
        account: 'Cash',
        favorite: false
      },
      {
        id: 'tx_may_dining',
        transactionDate: '2026-05-15T21:00:00.000Z',
        description: 'Team Dinner',
        amount: -3500,
        transactionType: 'EXPENSE',
        category: 'Eating Out/Ordering In',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_may_elec',
        transactionDate: '2026-05-15T10:00:00.000Z',
        description: 'Electricity & Water Bill (Recurring)',
        amount: -4200,
        transactionType: 'EXPENSE',
        category: 'Utilities',
        paymentMethod: 'UPI',
        accountId: 'SBI',
        account: 'SBI',
        note: '[Schedule ID: sc_elec] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_may_shop',
        transactionDate: '2026-05-20T15:00:00.000Z',
        description: 'Smartphone Upgrade',
        amount: -14500,
        transactionType: 'EXPENSE',
        category: 'Shopping',
        paymentMethod: 'Card',
        accountId: 'SBI',
        account: 'SBI',
        favorite: false
      },
      {
        id: 'tx_may_groc2',
        transactionDate: '2026-05-22T11:00:00.000Z',
        description: 'Dairy and fruits',
        amount: -3600,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_may_sub',
        transactionDate: '2026-05-25T08:00:00.000Z',
        description: 'Netflix Subscription (Recurring)',
        amount: -649,
        transactionType: 'EXPENSE',
        category: 'Subscriptions',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_netflix] Approved recurring transaction',
        favorite: false
      },

      // June 2026
      {
        id: 'tx_jun_sal',
        transactionDate: '2026-06-01T09:00:00.000Z',
        description: 'Monthly Salary Payment',
        amount: 85000,
        transactionType: 'INCOME',
        category: 'Salary',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_jun_rent',
        transactionDate: '2026-06-05T10:00:00.000Z',
        description: 'House Rent (Recurring)',
        amount: -20000,
        transactionType: 'EXPENSE',
        category: 'Rent',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        note: '[Schedule ID: sc_rent] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_jun_groc',
        transactionDate: '2026-06-12T15:00:00.000Z',
        description: 'Weekly veggies and snacks',
        amount: -4900,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Cash',
        accountId: 'Cash',
        account: 'Cash',
        favorite: false
      },
      {
        id: 'tx_jun_dining',
        transactionDate: '2026-06-14T13:00:00.000Z',
        description: 'Sunday Brunch Buffet',
        amount: -2700,
        transactionType: 'EXPENSE',
        category: 'Eating Out/Ordering In',
        paymentMethod: 'UPI',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      },
      {
        id: 'tx_jun_elec',
        transactionDate: '2026-06-15T10:00:00.000Z',
        description: 'Electricity & Water Bill (Recurring)',
        amount: -3800,
        transactionType: 'EXPENSE',
        category: 'Utilities',
        paymentMethod: 'UPI',
        accountId: 'SBI',
        account: 'SBI',
        note: '[Schedule ID: sc_elec] Approved recurring transaction',
        favorite: false
      },
      {
        id: 'tx_jun_groc2',
        transactionDate: '2026-06-20T11:00:00.000Z',
        description: 'Healthy snacks run',
        amount: -3300,
        transactionType: 'EXPENSE',
        category: 'Groceries',
        paymentMethod: 'Card',
        accountId: 'HDFC',
        account: 'HDFC',
        favorite: false
      }
    ];

    const initialSchedules: RecurringTransaction[] = [
      {
        id: 'sc_rent',
        description: 'House Rent',
        amount: 20000,
        type: 'EXPENSE',
        category: 'Rent',
        subcategory: 'Housing',
        paymentMethod: 'UPI',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: '2026-01-05T00:00:00.000Z',
        nextRunDate: '2026-07-05T00:00:00.000Z',
        lastRunDate: '2026-06-05T00:00:00.000Z',
        notes: 'Monthly apartment rent payment',
        status: 'ACTIVE'
      },
      {
        id: 'sc_netflix',
        description: 'Netflix Subscription',
        amount: 649,
        type: 'EXPENSE',
        category: 'Subscriptions',
        subcategory: 'Entertainment',
        paymentMethod: 'Card',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: '2026-01-25T00:00:00.000Z',
        nextRunDate: '2026-06-25T00:00:00.000Z',
        lastRunDate: '2026-05-25T00:00:00.000Z',
        notes: 'Netflix Premium 4K plan',
        status: 'ACTIVE'
      },
      {
        id: 'sc_elec',
        description: 'Electricity & Water Bill',
        amount: 3500,
        type: 'EXPENSE',
        category: 'Utilities',
        subcategory: 'Electricity',
        paymentMethod: 'UPI',
        account: 'SBI',
        frequency: 'MONTHLY',
        startDate: '2026-01-15T00:00:00.000Z',
        nextRunDate: '2026-07-15T00:00:00.000Z',
        lastRunDate: '2026-06-15T00:00:00.000Z',
        notes: 'Monthly utility bill payment',
        status: 'ACTIVE'
      }
    ];

    await AsyncStorage.setItem('passbook_transactions', JSON.stringify(mockTransactions));
    await AsyncStorage.setItem('passbook_schedules', JSON.stringify(initialSchedules));
    await AsyncStorage.setItem('passbook_gambling_platforms', JSON.stringify([]));
    await AsyncStorage.setItem('passbook_gambling_entries', JSON.stringify([]));
    await AsyncStorage.setItem('passbook_initialized_release_v2', 'true');
    await AsyncStorage.setItem('passbook_admin_logged_in', 'false');

  } catch (err) {
    console.error('Failed to seed local database:', err);
  }
};

// Auto seed on load
seedDatabase();

export const getStoredTransactions = async (): Promise<Transaction[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_transactions');
  return data ? JSON.parse(data) : [];
};

export const setStoredTransactions = async (txs: Transaction[]) => {
  await AsyncStorage.setItem('passbook_transactions', JSON.stringify(txs));
};

export const getStoredSchedules = async (): Promise<RecurringTransaction[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_schedules');
  return data ? JSON.parse(data) : [];
};

export const setStoredSchedules = async (scheds: RecurringTransaction[]) => {
  await AsyncStorage.setItem('passbook_schedules', JSON.stringify(scheds));
};

export const getStoredGamblingPlatforms = async (): Promise<any[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_gambling_platforms');
  return data ? JSON.parse(data) : [];
};

export const getStoredGamblingEntries = async (): Promise<any[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_gambling_entries');
  return data ? JSON.parse(data) : [];
};

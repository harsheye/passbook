import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, RecurringTransaction } from './types';

export const seedDatabase = async () => {
  try {
    const initialized = await AsyncStorage.getItem('passbook_initialized_release_v1');
    if (initialized === 'true') return;

    const oldKeys = [
      'passbook_transactions',
      'passbook_schedules',
      'passbook_gambling_platforms',
      'passbook_gambling_entries',
      'passbook_admin_logged_in',
      'passbook_initialized_v3',
      'custom_categories'
    ];
    await AsyncStorage.multiRemove(oldKeys);

    await AsyncStorage.setItem('passbook_transactions', JSON.stringify([]));
    await AsyncStorage.setItem('passbook_schedules', JSON.stringify([]));
    await AsyncStorage.setItem('passbook_gambling_platforms', JSON.stringify([]));
    await AsyncStorage.setItem('passbook_gambling_entries', JSON.stringify([]));
    await AsyncStorage.setItem('passbook_initialized_release_v1', 'true');
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

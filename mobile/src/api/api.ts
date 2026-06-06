import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default loopback IP for Android emulator to access the host machine's Express server
const DEFAULT_BASE_URL = 'http://10.0.2.2:5000';
const STORAGE_KEY = 'passbook_server_url';

export const getBaseUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
    return savedUrl || DEFAULT_BASE_URL;
  } catch {
    return DEFAULT_BASE_URL;
  }
};

export const setBaseUrl = async (url: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, url);
    api.defaults.baseURL = url;
  } catch (err) {
    console.error('Failed to save server URL:', err);
  }
};

// Create Axios Instance
export const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer local-mode-dummy-token',
  },
});

// Interceptor to load base URL dynamically before every request
api.interceptors.request.use(async (config) => {
  const url = await getBaseUrl();
  config.baseURL = url;
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface Transaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  transactionType: string;
  category: string | { name: string; icon: string; color: string };
  paymentMethod: string;
  accountId: string;
  account?: string;
  note?: string;
  tags?: string;
  merchantName?: string;
  location?: string;
  favorite?: boolean;
}

export interface GamblingSummary {
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalBonuses: number;
    totalBets: number;
    totalWins: number;
    totalLosses: number;
    currentBalance: number;
    netProfit: number;
    roi: number;
  };
}

export const fetchTransactionsApi = async (search: string, type: string): Promise<Transaction[]> => {
  const res = await api.get('/api/transactions', {
    params: { search, type },
  });
  return res.data;
};

export const createTransactionApi = async (data: {
  description: string;
  amount: number;
  type: string;
  category: string;
  paymentMethod: string;
  account: string;
  date: string;
  notes?: string;
  merchantName?: string;
  location?: string;
}): Promise<any> => {
  const res = await api.post('/api/transactions', data);
  return res.data;
};

export const fetchGamblingAnalyticsApi = async (): Promise<GamblingSummary> => {
  const res = await api.get('/api/gambling/analytics');
  return res.data;
};

export const checkHealthApi = async (): Promise<any> => {
  const res = await api.get('/health');
  return res.data;
};

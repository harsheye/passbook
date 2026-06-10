import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'passbook_server_url';

const DEFAULT_URLS = [
  'http://10.0.2.2:5000',
  'http://172.25.81.72:5000',
  'http://localhost:5000',
  'http://192.168.1.17:5000'
];

let activeBaseUrl = 'http://10.0.2.2:5000'; // Default fallback

export const getBaseUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
    return savedUrl || activeBaseUrl;
  } catch {
    return activeBaseUrl;
  }
};

export const setBaseUrl = async (url: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, url);
    activeBaseUrl = url;
    api.defaults.baseURL = url;
  } catch (err) {
    console.error('Failed to save server URL:', err);
  }
};

export const autodetectBaseUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
      try {
        const res = await fetch(`${savedUrl}/health`, { method: 'GET' });
        if (res.ok) {
          activeBaseUrl = savedUrl;
          api.defaults.baseURL = savedUrl;
          return savedUrl;
        }
      } catch {}
    }
  } catch {}

  const probe = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1500);

      fetch(`${url}/health`, { signal: controller.signal })
        .then(res => {
          clearTimeout(id);
          if (res.ok) resolve(url);
          else reject();
        })
        .catch(() => {
          clearTimeout(id);
          reject();
        });
    });
  };

  const probeAll = async (urls: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      let resolved = false;
      let rejectCount = 0;
      urls.forEach(url => {
        probe(url)
          .then(resUrl => {
            if (!resolved) {
              resolved = true;
              resolve(resUrl);
            }
          })
          .catch(() => {
            rejectCount++;
            if (rejectCount === urls.length) {
              reject();
            }
          });
      });
    });
  };

  try {
    const winner = await probeAll(DEFAULT_URLS);
    activeBaseUrl = winner;
    api.defaults.baseURL = winner;
    return winner;
  } catch {
    return activeBaseUrl;
  }
};

// Create Axios Instance
export const api = axios.create({
  baseURL: 'http://10.0.2.2:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to load base URL and Authorization token dynamically before every request
api.interceptors.request.use(async (config) => {
  const url = await getBaseUrl();
  config.baseURL = url;

  const token = await AsyncStorage.getItem('passbook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to cache GET results and handle offline failures for mobile
api.interceptors.response.use(
  async (response) => {
    if (response.config.method?.toLowerCase() === 'get') {
      const cacheKey = `mobile_cache_${response.config.url}_${JSON.stringify(response.config.params || {})}`;
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
      } catch (e) {
        console.warn('Failed to save response to mobile cache:', e);
      }
    }
    return response;
  },
  async (error) => {
    const { config, message } = error;
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || message?.toLowerCase().includes('network error');

    if (isNetworkError && config) {
      if (config.method?.toLowerCase() === 'get') {
        const cacheKey = `mobile_cache_${config.url}_${JSON.stringify(config.params || {})}`;
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const data = JSON.parse(cached);
            console.warn(`[Mobile Offline Mode] Serving cached data for GET ${config.url}`);
            return Promise.resolve({
              data,
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
              request: {},
            } as any);
          }
        } catch (e) {
          console.error('Failed to parse cached mobile data:', e);
        }
      }
    }
    return Promise.reject(error);
  }
);

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

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  paymentMethod: string;
  account: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  notes?: string;
  tags?: string;
}

export const fetchSchedulesApi = async (): Promise<RecurringTransaction[]> => {
  const res = await api.get('/api/recurring');
  return res.data;
};

export const createScheduleApi = async (data: any): Promise<any> => {
  const res = await api.post('/api/recurring', data);
  return res.data;
};

export const updateScheduleApi = async (id: string, data: any): Promise<any> => {
  const res = await api.put(`/api/recurring/${id}`, data);
  return res.data;
};

export const deleteScheduleApi = async (id: string): Promise<any> => {
  const res = await api.delete(`/api/recurring/${id}`);
  return res.data;
};

export const approveOccurrenceApi = async (id: string): Promise<any> => {
  const res = await api.post(`/api/recurring/${id}/approve`);
  return res.data;
};

export const skipOccurrenceApi = async (id: string): Promise<any> => {
  const res = await api.post(`/api/recurring/${id}/skip`);
  return res.data;
};


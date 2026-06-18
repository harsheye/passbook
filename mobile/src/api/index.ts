import { api } from './client';
import { Transaction, GamblingSummary, RecurringTransaction } from './types';

export const getBaseUrl = async (): Promise<string> => {
  return 'http://localhost:5000';
};

export const setBaseUrl = async (url: string): Promise<void> => {};

export const autodetectBaseUrl = async (): Promise<string> => {
  return 'http://localhost:5000';
};

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

export { api } from './client';
export type { Transaction, GamblingSummary, RecurringTransaction } from './types';

export default api;

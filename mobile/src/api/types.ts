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
  plTimeline: any[];
  platformMetrics: any[];
  activityDistribution: any[];
  insights: string[];
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  subcategory?: string;
  paymentMethod: string;
  account: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  notes?: string;
  tags?: string;
  status?: 'ACTIVE' | 'COMPLETED';
}

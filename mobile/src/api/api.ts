import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ----------------------------------------------------
// DATABASE INITIALIZATION / SEEDING
// ----------------------------------------------------
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

// ----------------------------------------------------
// LOCAL GETTERS / SETTERS HELPERS
// ----------------------------------------------------
const getStoredTransactions = async (): Promise<Transaction[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_transactions');
  return data ? JSON.parse(data) : [];
};

const setStoredTransactions = async (txs: Transaction[]) => {
  await AsyncStorage.setItem('passbook_transactions', JSON.stringify(txs));
};

const getStoredSchedules = async (): Promise<RecurringTransaction[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_schedules');
  return data ? JSON.parse(data) : [];
};

const setStoredSchedules = async (scheds: RecurringTransaction[]) => {
  await AsyncStorage.setItem('passbook_schedules', JSON.stringify(scheds));
};

const getStoredGamblingPlatforms = async (): Promise<any[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_gambling_platforms');
  return data ? JSON.parse(data) : [];
};

const getStoredGamblingEntries = async (): Promise<any[]> => {
  await seedDatabase();
  const data = await AsyncStorage.getItem('passbook_gambling_entries');
  return data ? JSON.parse(data) : [];
};

// ----------------------------------------------------
// MOCK CONTROLLER ROUTING LOGIC
// ----------------------------------------------------
const getPathAndParams = (url: string) => {
  const [path, queryString] = url.split('?');
  const params: Record<string, string> = {};
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      params[key] = decodeURIComponent(val || '');
    });
  }
  return { path, params };
};

const getIdFromUrl = (url: string, prefix: string): string => {
  return url.replace(prefix, '').split('/')[0];
};

// ----------------------------------------------------
// LOCAL NLP HEURISTIC PARSERS (FALLBACK)
// ----------------------------------------------------
const parseLocalTransactionHeuristic = (text: string): any => {
  const cleanText = text.trim();
  const amountRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
  const amountMatch = cleanText.match(amountRegex);
  let amount = 0;
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  const incomeKeywords = ['receive', 'credited', 'got', 'earned', 'salary', 'won', 'refund', 'cashback', 'income'];
  const isIncome = incomeKeywords.some(word => cleanText.toLowerCase().includes(word));
  const type = isIncome ? 'INCOME' : 'EXPENSE';

  let date = new Date().toISOString().split('T')[0];
  const lowerText = cleanText.toLowerCase();
  if (lowerText.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  } else if (lowerText.includes('day before yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    date = d.toISOString().split('T')[0];
  }

  let paymentMethod = 'UPI';
  let account = 'SBI';
  if (lowerText.includes('cash')) {
    paymentMethod = 'Cash';
    account = 'Cash Wallet';
  } else if (lowerText.includes('card') || lowerText.includes('credit')) {
    paymentMethod = 'Credit Card';
    account = 'HDFC';
  }

  const foundKeywords: string[] = [];
  const itemKeywords = ['milk', 'paneer', 'egg', 'carrot', 'bread', 'butter', 'cheese', 'chicken', 'chips', 'kurkure', 'pizza', 'burger', 'coffee', 'tea'];
  itemKeywords.forEach(kw => {
    if (cleanText.toLowerCase().includes(kw)) {
      foundKeywords.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  });

  let category = 'Miscellaneous';
  let description = isIncome ? 'Income Source' : 'Expense Item';

  if (foundKeywords.length > 0) {
    category = foundKeywords[0];
    description = foundKeywords.join(' & ');
  } else {
    let fallbackDesc = cleanText.replace(amountRegex, '').replace(/yesterday|today/i, '').replace(/\s+/g, ' ').trim();
    if (fallbackDesc.length > 2) description = fallbackDesc;
  }

  return {
    amount: isIncome ? amount : -amount,
    type,
    description,
    category: category,
    subcategory: 'General',
    date,
    paymentMethod,
    account,
    notes: `AI Parsed (Heuristic): "${cleanText}"`,
    items: [{ name: description, price: Math.abs(amount) }]
  };
};

// ----------------------------------------------------
// CUSTOM AXIOS CLIENT REPLACEMENT
// ----------------------------------------------------
export const api = {
  defaults: {
    baseURL: '',
    headers: {
      common: {} as Record<string, string>
    }
  },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} }
  },

  get: async (url: string, config?: any): Promise<any> => {
    const { path, params: urlParams } = getPathAndParams(url);
    const params = { ...urlParams, ...(config?.params || {}) };

    if (path.startsWith('/health')) {
      return { data: { status: 'ok' } };
    }

    if (path.startsWith('/api/transactions')) {
      const txs = await getStoredTransactions();
      const isAdmin = await AsyncStorage.getItem('passbook_admin_logged_in') === 'true';

      let filtered = txs.filter(t => {
        const typeUpper = (t.transactionType || '').toUpperCase();
        const catName = typeof t.category === 'object' ? t.category.name : t.category;
        const catUpper = (catName || '').toUpperCase();

        if (!isAdmin) {
          if (typeUpper === 'GAMBLING' || catUpper === 'GAMBLING' || catUpper.includes('GAMBLING') || catUpper.includes('BET')) {
            return false;
          }
        }
        return true;
      });

      if (params.type) {
        const filterType = params.type.toUpperCase();
        filtered = filtered.filter(t => (t.transactionType || '').toUpperCase() === filterType);
      }

      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(t =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.merchantName || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q) ||
          (typeof t.category === 'object' ? t.category.name : t.category || '').toLowerCase().includes(q)
        );
      }

      filtered.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      return { data: filtered };
    }

    if (path.startsWith('/api/recurring')) {
      const schedules = await getStoredSchedules();
      return { data: schedules };
    }

    if (path.startsWith('/api/dashboard/summary')) {
      const txs = await getStoredTransactions();
      const isAdmin = await AsyncStorage.getItem('passbook_admin_logged_in') === 'true';

      const filtered = txs.filter(t => {
        const typeUpper = (t.transactionType || '').toUpperCase();
        const catName = typeof t.category === 'object' ? t.category.name : t.category;
        const catUpper = (catName || '').toUpperCase();

        if (!isAdmin) {
          if (typeUpper === 'GAMBLING' || catUpper === 'GAMBLING' || catUpper.includes('GAMBLING') || catUpper.includes('BET')) {
            return false;
          }
        }
        return true;
      });

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      const currentTxns = filtered.filter(t => {
        const d = new Date(t.transactionDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevTxns = filtered.filter(t => {
        const d = new Date(t.transactionDate);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });

      let totalIncome = 0;
      let totalExpenses = 0;
      const categorySpent: Record<string, number> = {};
      const categoryIncome: Record<string, number> = {};

      currentTxns.forEach(t => {
        const amt = t.amount;
        const type = (t.transactionType || '').toUpperCase();
        const catName = typeof t.category === 'object' ? t.category.name : t.category;

        if (type === 'INCOME') {
          totalIncome += amt;
          categoryIncome[catName] = (categoryIncome[catName] || 0) + amt;
        } else if (type === 'EXPENSE' || type === 'GAMBLING') {
          const absAmt = Math.abs(amt);
          totalExpenses += absAmt;
          categorySpent[catName] = (categorySpent[catName] || 0) + absAmt;
        }
      });

      const netSavings = totalIncome - totalExpenses;
      const daysPassed = today.getDate();
      const avgDailySpending = daysPassed > 0 ? totalExpenses / daysPassed : 0;

      let highestCategory = 'None';
      let highestCategoryAmt = 0;
      Object.keys(categorySpent).forEach(cat => {
        if (categorySpent[cat] > highestCategoryAmt) {
          highestCategoryAmt = categorySpent[cat];
          highestCategory = cat;
        }
      });

      let prevExpenses = 0;
      prevTxns.forEach(t => {
        const type = (t.transactionType || '').toUpperCase();
        if (type === 'EXPENSE' || type === 'GAMBLING') {
          prevExpenses += Math.abs(t.amount);
        }
      });

      const expenseGrowthPct = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

      const chartMonthly: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const tMonth = targetDate.getMonth();
        const tYear = targetDate.getFullYear();

        const mTxns = filtered.filter(t => {
          const d = new Date(t.transactionDate);
          return d.getMonth() === tMonth && d.getFullYear() === tYear;
        });

        let inc = 0;
        let exp = 0;
        mTxns.forEach(t => {
          const type = (t.transactionType || '').toUpperCase();
          if (type === 'INCOME') inc += t.amount;
          else if (type === 'EXPENSE' || type === 'GAMBLING') exp += Math.abs(t.amount);
        });

        chartMonthly.push({
          month: targetDate.toLocaleString('default', { month: 'short' }),
          Income: inc,
          Expenses: exp,
          Savings: inc - exp
        });
      }

      const chartCategory = Object.keys(categorySpent).map(cat => ({
        name: cat,
        value: categorySpent[cat]
      }));

      const chartCategoryIncome = Object.keys(categoryIncome).map(cat => ({
        name: cat,
        value: categoryIncome[cat]
      }));

      const chartDaily: any[] = [];
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        let spendVal = 0;
        currentTxns.forEach(t => {
          const type = (t.transactionType || '').toUpperCase();
          const d = new Date(t.transactionDate);
          if ((type === 'EXPENSE' || type === 'GAMBLING') && d.getDate() === day) {
            spendVal += Math.abs(t.amount);
          }
        });
        chartDaily.push({
          day,
          Spending: spendVal
        });
      }

      const insights: string[] = [];
      if (highestCategory !== 'None') {
        insights.push(`Your highest spending category this month is **${highestCategory}** (₹${highestCategoryAmt.toLocaleString('en-IN')}).`);
      }
      if (expenseGrowthPct > 0) {
        insights.push(`Your spending has increased by **${expenseGrowthPct.toFixed(0)}%** compared to last month.`);
      } else if (expenseGrowthPct < 0) {
        insights.push(`Great job! Your spending is down **${Math.abs(expenseGrowthPct).toFixed(0)}%** compared to last month.`);
      } else {
        insights.push('Add transactions or setup budgets to generate personalized financial insights.');
      }

      return {
        data: {
          summary: {
            totalIncome,
            totalExpenses,
            netSavings,
            avgDailySpending,
            highestCategory,
            highestCategoryAmt,
            expenseGrowthPct
          },
          insights,
          charts: {
            monthly: chartMonthly,
            category: chartCategory,
            categoryIncome: chartCategoryIncome,
            daily: chartDaily
          }
        }
      };
    }

    if (path.startsWith('/api/dashboard/admin-summary')) {
      const txs = await getStoredTransactions();
      const isAdmin = await AsyncStorage.getItem('passbook_admin_logged_in') === 'true';

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalInvestments = 0;

      txs.forEach(t => {
        const type = (t.transactionType || '').toUpperCase();
        const catName = typeof t.category === 'object' ? t.category.name : t.category;
        const catLower = (catName || '').toLowerCase();

        if (type === 'INCOME') {
          totalIncome += t.amount;
        } else if (type === 'EXPENSE' || type === 'GAMBLING') {
          const absAmt = Math.abs(t.amount);
          if (catLower === 'investment' || catLower === 'investment returns' || catLower.includes('invest')) {
            totalInvestments += absAmt;
          } else {
            totalExpenses += absAmt;
          }
        }
      });

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalBonuses = 0;
      let currentPlatformBalance = 0;
      let gamblingProfit = 0;

      if (isAdmin) {
        const gamblingEntries = await getStoredGamblingEntries();
        const gamblingPlatforms = await getStoredGamblingPlatforms();

        gamblingEntries.forEach(e => {
          const type = e.transactionType.toUpperCase();
          if (type === 'DEPOSIT') totalDeposits += e.amount;
          else if (type === 'WITHDRAWAL') totalWithdrawals += e.amount;
          else if (type === 'BONUS') totalBonuses += e.amount;
        });

        gamblingPlatforms.forEach(p => {
          if (p.status === 'ACTIVE') {
            currentPlatformBalance += p.balance;
          }
        });

        gamblingProfit = (totalWithdrawals + currentPlatformBalance + totalBonuses) - totalDeposits;
      }

      const netWorth = totalIncome + totalInvestments + gamblingProfit - totalExpenses;

      const assetBalances: any[] = [
        { name: 'Liquid Cash / Banks', value: Math.max(0, totalIncome - totalExpenses - totalInvestments - totalDeposits + totalWithdrawals) },
        { name: 'Investments Portfolio', value: totalInvestments }
      ];

      if (isAdmin) {
        assetBalances.push({ name: 'Gambling Platform Ledgers', value: currentPlatformBalance });
      }

      return {
        data: {
          metrics: {
            personalIncome: totalIncome,
            personalExpenses: totalExpenses,
            investments: totalInvestments,
            gamblingProfit,
            netWorth
          },
          assetBalances,
          gamblingMeta: isAdmin ? {
            currentBalance: currentPlatformBalance,
            deposits: totalDeposits,
            withdrawals: totalWithdrawals
          } : null
        }
      };
    }

    if (path.startsWith('/api/gambling/analytics')) {
      const isAdmin = await AsyncStorage.getItem('passbook_admin_logged_in') === 'true';

      if (!isAdmin) {
        return {
          data: {
            summary: {
              totalDeposits: 0,
              totalWithdrawals: 0,
              totalBonuses: 0,
              totalBets: 0,
              totalWins: 0,
              totalLosses: 0,
              currentBalance: 0,
              netProfit: 0,
              roi: 0
            },
            plTimeline: [],
            platformMetrics: [],
            activityDistribution: [],
            insights: ['Not logged in as Administrator.']
          }
        };
      }

      const entries = await getStoredGamblingEntries();
      const platforms = await getStoredGamblingPlatforms();

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalBonuses = 0;
      let totalBets = 0;
      let totalWins = 0;
      let totalLosses = 0;
      let currentBalance = 0;

      entries.forEach(e => {
        const type = e.transactionType.toUpperCase();
        if (type === 'DEPOSIT') totalDeposits += e.amount;
        else if (type === 'WITHDRAWAL') totalWithdrawals += e.amount;
        else if (type === 'BONUS') totalBonuses += e.amount;
        else if (type === 'BET_PLACED') totalBets += e.amount;
        else if (type === 'BET_WON') totalWins += 1;
        else if (type === 'BET_LOST') totalLosses += 1;
      });

      platforms.forEach(p => {
        if (p.status === 'ACTIVE') currentBalance += p.balance;
      });

      const netProfit = (totalWithdrawals + currentBalance + totalBonuses) - totalDeposits;
      const roi = totalDeposits > 0 ? (netProfit / totalDeposits) * 100 : 0.0;

      const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let runningPL = 0;
      const plTimeline = sortedEntries.map(e => {
        const type = e.transactionType.toUpperCase();
        let change = 0;
        if (type === 'BET_WON' || type === 'BONUS' || type === 'CASHBACK') change = e.amount;
        else if (type === 'BET_LOST') change = -e.amount;
        runningPL += change;
        return {
          date: new Date(e.date).toISOString().split('T')[0],
          profit: runningPL,
          amount: e.amount,
          type: e.transactionType
        };
      });

      const platformWiseMetrics = platforms.map(p => {
        let pDep = 0, pWith = 0, pWin = 0, pLos = 0, pBon = 0;
        entries.forEach(e => {
          if (e.platformId === p.id || e.platform === p.name) {
            const type = e.transactionType.toUpperCase();
            if (type === 'DEPOSIT') pDep += e.amount;
            else if (type === 'WITHDRAWAL') pWith += e.amount;
            else if (type === 'BET_WON') pWin += 1;
            else if (type === 'BET_LOST') pLos += 1;
            else if (type === 'BONUS') pBon += e.amount;
          }
        });

        const pNet = (pWith + p.balance + pBon) - pDep;
        const pRoi = pDep > 0 ? (pNet / pDep) * 100 : 0.0;

        return {
          name: p.name,
          balance: p.balance,
          deposits: pDep,
          withdrawals: pWith,
          wins: pWin,
          losses: pLos,
          netProfit: pNet,
          roi: pRoi
        };
      });

      const categoryDistribution: Record<string, number> = {};
      entries.forEach(e => {
        const type = e.transactionType.toUpperCase();
        if (type === 'BET_WON' || type === 'BET_LOST' || type === 'BET_PLACED') {
          categoryDistribution[e.category] = (categoryDistribution[e.category] || 0) + e.amount;
        }
      });
      const pieData = Object.keys(categoryDistribution).map(cat => ({
        name: cat,
        value: categoryDistribution[cat]
      }));

      const insights: string[] = [];
      if (platformWiseMetrics.length > 0) {
        const sortedProfits = [...platformWiseMetrics].sort((a, b) => b.netProfit - a.netProfit);
        const topPlatform = sortedProfits[0];
        if (topPlatform && topPlatform.netProfit > 0) {
          insights.push(`Most profitable platform: **${topPlatform.name}** generating ₹${topPlatform.netProfit.toLocaleString('en-IN')} profit.`);
        }
        insights.push(`ROI is currently sitting at **${roi.toFixed(1)}%** across all platforms.`);
      } else {
        insights.push('Not enough transaction history to formulate betting insights.');
      }

      return {
        data: {
          summary: {
            totalDeposits,
            totalWithdrawals,
            totalBonuses,
            totalBets,
            totalWins,
            totalLosses,
            currentBalance,
            netProfit,
            roi
          },
          plTimeline,
          platformMetrics: platformWiseMetrics,
          activityDistribution: pieData,
          insights
        }
      };
    }

    throw new Error(`Offline mock URL not matched: GET ${url}`);
  },

  post: async (url: string, data?: any, config?: any): Promise<any> => {
    const { path } = getPathAndParams(url);

    if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')) {
      const mockUser = {
        id: 'user_offline',
        name: 'Local User',
        email: 'local@example.com',
        role: 'USER'
      };
      await AsyncStorage.setItem('passbook_token', 'offline_token');
      await AsyncStorage.setItem('passbook_user', JSON.stringify(mockUser));
      return {
        data: {
          token: 'offline_token',
          user: mockUser
        }
      };
    }

    if (path.startsWith('/api/transactions/ai')) {
      const queryText = data.text;
      const apiKey = 'AQ.Ab8RN6KzSN1RtfEDD48fCFvHtphJF_5n6B7EEb74Y_8Nf3RtSA';

      const systemInstructions = `You are an AI financial transactions parser. Analyze the user's natural language input and output a strict JSON object.
The JSON structure MUST be:
{
  "transactions": [
    {
      "amount": number (positive amount),
      "type": "EXPENSE" or "INCOME",
      "description": string (appropriate general description like "Grocery", "Eating Out", "Movies", "Clothes", "Fruit" if multiple items, or the item name if it is a single item like "Milk" or "Kurkure"),
      "category": string (e.g. "Milk" or "Kurkure" if it is a single item, or a general category like "Grocery", "Eating Out", "Movies", "Clothes", "Fruit" if multiple items are entered),
      "subcategory": string,
      "date": "YYYY-MM-DD",
      "paymentMethod": string,
      "account": string,
      "items": [
        { "name": string, "price": number }
      ]
    }
  ]
}
CRITICAL INSTRUCTIONS:
1. If the input contains items from DIFFERENT categories (e.g. groceries AND movies, or food AND clothing), create SEPARATE entries in the "transactions" array for each category, splitting the total amount accordingly.
2. If only a SINGLE item is added (e.g. "milk" or "kurkure"), set BOTH the "description" and the "category" of that transaction to that specific item name (capitalized, e.g. "Milk" or "Kurkure").
3. If MULTIPLE items of the same category are added, set the "category" and "description" to an appropriate general term (e.g. "Grocery", "Eating Out", "Movies", "Clothes", "Fruit"), NOT the individual item names.
4. In the "items" array, list each item separately with its name and price. If individual prices are not explicitly stated, distribute the total amount realistically so that the sum of item prices equals the transaction amount.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: `${systemInstructions}\n\nParse this sentence: "${queryText}". Current date is ${new Date().toISOString().split('T')[0]}` }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            const textContent = result.candidates[0].content.parts[0].text;
            const content = JSON.parse(textContent.trim());
            return { data: content };
          }
        }
        throw new Error('Gemini API Response error or empty');
      } catch (error) {
        console.warn('[Gemini direct fetch failed, falling back to local NLP heuristics]:', error);
        const fallback = parseLocalTransactionHeuristic(queryText);
        return {
          data: {
            transactions: fallback.transactions || [fallback]
          }
        };
      }
    }

    if (path.startsWith('/api/transactions')) {
      const txs = await getStoredTransactions();
      const categoryObj = typeof data.category === 'object' ? data.category : { name: data.category, icon: 'tag', color: '#71717a' };
      const newTx: Transaction = {
        id: 'tx_' + Date.now(),
        transactionDate: data.date || new Date().toISOString(),
        amount: Number(data.amount),
        transactionType: data.type || 'Expense',
        category: categoryObj,
        paymentMethod: data.paymentMethod || 'UPI',
        accountId: data.account || 'SBI',
        account: data.account || 'SBI',
        description: data.description || 'New Transaction',
        note: data.notes || '',
        merchantName: data.merchantName || '',
        location: data.location || '',
        favorite: !!data.favorite
      };
      txs.push(newTx);
      await setStoredTransactions(txs);
      return { data: newTx };
    }

    if (path.startsWith('/api/recurring')) {
      if (path.endsWith('/approve')) {
        const schedules = await getStoredSchedules();
        const id = getIdFromUrl(path, '/api/recurring/');
        const idx = schedules.findIndex(s => s.id === id);
        if (idx !== -1) {
          const sched = schedules[idx];

          const txs = await getStoredTransactions();
          const numAmount = Math.abs(Number(sched.amount));
          const signedAmt = sched.type === 'EXPENSE' ? -numAmount : numAmount;
          const newTx: Transaction = {
            id: 'tx_' + Date.now(),
            transactionDate: new Date().toISOString(),
            amount: signedAmt,
            transactionType: sched.type === 'INCOME' ? 'Income' : 'Expense',
            category: { name: sched.category, icon: 'tag', color: '#71717a' },
            paymentMethod: sched.paymentMethod,
            accountId: sched.account,
            account: sched.account,
            description: `${sched.description} (Recurring)`,
            note: sched.notes || 'Approved recurring transaction',
            favorite: false
          };
          txs.push(newTx);
          await setStoredTransactions(txs);

          sched.lastRunDate = sched.nextRunDate;
          const nextDate = new Date(sched.nextRunDate || new Date());
          if (sched.frequency === 'DAILY') {
            nextDate.setDate(nextDate.getDate() + 1);
          } else if (sched.frequency === 'WEEKLY') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
          sched.nextRunDate = nextDate.toISOString();

          await setStoredSchedules(schedules);
          return { data: { success: true } };
        }
        throw new Error('Schedule not found for approval');
      }

      if (path.endsWith('/skip')) {
        const schedules = await getStoredSchedules();
        const id = getIdFromUrl(path, '/api/recurring/');
        const idx = schedules.findIndex(s => s.id === id);
        if (idx !== -1) {
          const sched = schedules[idx];

          const nextDate = new Date(sched.nextRunDate || new Date());
          if (sched.frequency === 'DAILY') {
            nextDate.setDate(nextDate.getDate() + 1);
          } else if (sched.frequency === 'WEEKLY') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
          sched.nextRunDate = nextDate.toISOString();

          await setStoredSchedules(schedules);
          return { data: { success: true } };
        }
        throw new Error('Schedule not found for skip');
      }

      const schedules = await getStoredSchedules();
      const newSchedule: RecurringTransaction = {
        id: 'sc_' + Date.now(),
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        subcategory: data.subcategory || '',
        paymentMethod: data.paymentMethod,
        account: data.account,
        frequency: data.frequency,
        startDate: data.startDate || new Date().toISOString(),
        nextRunDate: data.nextRunDate || data.startDate || new Date().toISOString(),
        notes: data.notes || '',
        tags: data.tags || '',
        status: 'ACTIVE'
      };
      schedules.push(newSchedule);
      await setStoredSchedules(schedules);
      return { data: newSchedule };
    }

    throw new Error(`Offline mock URL not matched: POST ${url}`);
  },

  put: async (url: string, data?: any, config?: any): Promise<any> => {
    const { path } = getPathAndParams(url);

    if (path.startsWith('/api/transactions')) {
      const txs = await getStoredTransactions();
      const id = getIdFromUrl(path, '/api/transactions/');
      const idx = txs.findIndex(t => t.id === id);
      if (idx !== -1) {
        const categoryObj = typeof data.category === 'object' ? data.category : { name: data.category };
        txs[idx] = {
          ...txs[idx],
          transactionDate: data.date || data.transactionDate || txs[idx].transactionDate,
          amount: data.amount !== undefined ? Number(data.amount) : txs[idx].amount,
          transactionType: data.type || data.transactionType || txs[idx].transactionType,
          category: categoryObj,
          paymentMethod: data.paymentMethod || txs[idx].paymentMethod,
          accountId: data.account || data.accountId || txs[idx].accountId,
          account: data.account || txs[idx].account,
          description: data.description || txs[idx].description,
          note: data.notes || data.note || txs[idx].note,
          merchantName: data.merchantName !== undefined ? data.merchantName : txs[idx].merchantName,
          location: data.location !== undefined ? data.location : txs[idx].location,
          favorite: data.favorite !== undefined ? !!data.favorite : txs[idx].favorite
        };
        await setStoredTransactions(txs);
        return { data: txs[idx] };
      }
      throw new Error('Transaction not found');
    }

    if (path.startsWith('/api/recurring')) {
      const schedules = await getStoredSchedules();
      const id = getIdFromUrl(path, '/api/recurring/');
      const idx = schedules.findIndex(s => s.id === id);
      if (idx !== -1) {
        schedules[idx] = {
          ...schedules[idx],
          description: data.description || schedules[idx].description,
          amount: data.amount !== undefined ? Number(data.amount) : schedules[idx].amount,
          type: data.type || schedules[idx].type,
          category: data.category || schedules[idx].category,
          subcategory: data.subcategory !== undefined ? data.subcategory : schedules[idx].subcategory,
          paymentMethod: data.paymentMethod || schedules[idx].paymentMethod,
          account: data.account || schedules[idx].account,
          frequency: data.frequency || schedules[idx].frequency,
          startDate: data.startDate || schedules[idx].startDate,
          nextRunDate: data.nextRunDate || schedules[idx].nextRunDate,
          notes: data.notes !== undefined ? data.notes : schedules[idx].notes,
          tags: data.tags !== undefined ? data.tags : schedules[idx].tags
        };
        await setStoredSchedules(schedules);
        return { data: schedules[idx] };
      }
      throw new Error('Schedule not found');
    }

    throw new Error(`Offline mock URL not matched: PUT ${url}`);
  },

  delete: async (url: string, config?: any): Promise<any> => {
    const { path } = getPathAndParams(url);

    if (path.startsWith('/api/transactions')) {
      const txs = await getStoredTransactions();
      const id = getIdFromUrl(path, '/api/transactions/');
      const filtered = txs.filter(t => t.id !== id);
      await setStoredTransactions(filtered);
      return { data: { success: true } };
    }

    if (path.startsWith('/api/recurring')) {
      const schedules = await getStoredSchedules();
      const id = getIdFromUrl(path, '/api/recurring/');
      const updated = schedules.map(s => {
        if (s.id === id) {
          return { ...s, status: 'COMPLETED' as const };
        }
        return s;
      });
      await setStoredSchedules(updated);
      return { data: { success: true } };
    }

    throw new Error(`Offline mock URL not matched: DELETE ${url}`);
  }
};

// ----------------------------------------------------
// EXPORTED API WRAPPERS
// ----------------------------------------------------
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

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const getAutoSubcategory = (categoryName: string, description: string = ''): string => {
  const cat = categoryName.toLowerCase();
  const desc = description.toLowerCase();

  if (cat.includes('utility') || cat.includes('bill')) {
    if (desc.includes('electric') || desc.includes('power') || desc.includes('bescom') || desc.includes('light')) return 'Electricity';
    if (desc.includes('water') || desc.includes('sewer') || desc.includes('bwssb')) return 'Water';
    if (desc.includes('gas') || desc.includes('cylinder') || desc.includes('indane') || desc.includes('hp')) return 'Gas';
    if (desc.includes('internet') || desc.includes('wifi') || desc.includes('broadband') || desc.includes('recharge') || desc.includes('jio') || desc.includes('airtel') || desc.includes('phone') || desc.includes('mobile')) return 'Internet/Phone';
    return 'Other Bills';
  }

  if (cat.includes('grocer')) {
    if (desc.includes('milk') || desc.includes('dairy') || desc.includes('curd') || desc.includes('paneer')) return 'Milk & Dairy';
    if (desc.includes('veg') || desc.includes('fruit') || desc.includes('sabzi') || desc.includes('tomato') || desc.includes('onion')) return 'Fruits & Veggies';
    if (desc.includes('meat') || desc.includes('chicken') || desc.includes('fish') || desc.includes('egg')) return 'Meat & Eggs';
    if (desc.includes('dmart') || desc.includes('blinkit') || desc.includes('instamart') || desc.includes('zepto') || desc.includes('market') || desc.includes('grocery')) return 'Household Essentials';
    return 'Other Groceries';
  }

  if (cat.includes('eat') || cat.includes('order') || cat.includes('dine') || cat.includes('restaurant')) {
    if (desc.includes('zomato') || desc.includes('swiggy')) return 'Food Delivery';
    if (desc.includes('pizza') || desc.includes('burger') || desc.includes('mcdonald') || desc.includes('kfc') || desc.includes('cafe') || desc.includes('restaurant')) return 'Dining Out';
    return 'Dining';
  }

  if (cat.includes('sub')) {
    if (desc.includes('netflix') || desc.includes('prime') || desc.includes('hotstar') || desc.includes('youtube')) return 'Video Subscriptions';
    if (desc.includes('spotify') || desc.includes('music') || desc.includes('apple')) return 'Audio Subscriptions';
    return 'Other Subscriptions';
  }

  if (cat.includes('travel') || cat.includes('fuel')) {
    if (desc.includes('uber') || desc.includes('ola') || desc.includes('auto') || desc.includes('cab') || desc.includes('taxi')) return 'Ride Hailing';
    if (desc.includes('metro') || desc.includes('train') || desc.includes('bus') || desc.includes('flight') || desc.includes('ticket')) return 'Public Transport';
    if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel')) return 'Fuel';
    return 'Other Travel';
  }

  if (cat.includes('rent')) {
    return 'House Rent';
  }

  if (cat.includes('gambling')) {
    return 'Sports Betting/Casino';
  }

  return categoryName + ' General';
};

export class DashboardController {
  
  /**
   * Generates metrics and charts for standard Expense/Income tracking
   */
  public static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const today = new Date();
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

      // 1. Fetch transactions for current month & previous month, joining relational Category
      const currentTxns = await prisma.transaction.findMany({
        where: {
          userId,
          transactionDate: { gte: startOfMonth, lte: endOfMonth }
        },
        include: {
          category: true
        }
      });

      const prevTxns = await prisma.transaction.findMany({
        where: {
          userId,
          transactionDate: { gte: startOfPrevMonth, lte: endOfPrevMonth }
        },
        include: {
          category: true
        }
      });

      // Calculate totals for current month
      let totalIncome = 0;
      let totalExpenses = 0;
      const categorySpent: Record<string, number> = {};
      const categoryIncome: Record<string, number> = {};
      const categorySubcategorySpent: Record<string, Record<string, number>> = {};
      const categorySubcategoryIncome: Record<string, Record<string, number>> = {};

      currentTxns.forEach(t => {
        const amt = t.amount;
        const type = t.transactionType.toUpperCase();
        const catName = t.category.name;
        const subcatName = getAutoSubcategory(catName, t.description || '');

        if (type === 'INCOME') {
          totalIncome += amt;
          categoryIncome[catName] = (categoryIncome[catName] || 0) + amt;
          if (!categorySubcategoryIncome[catName]) categorySubcategoryIncome[catName] = {};
          categorySubcategoryIncome[catName][subcatName] = (categorySubcategoryIncome[catName][subcatName] || 0) + amt;
        } else if (type === 'EXPENSE' || type === 'GAMBLING') {
          const absAmt = Math.abs(amt);
          totalExpenses += absAmt;
          categorySpent[catName] = (categorySpent[catName] || 0) + absAmt;
          if (!categorySubcategorySpent[catName]) categorySubcategorySpent[catName] = {};
          categorySubcategorySpent[catName][subcatName] = (categorySubcategorySpent[catName][subcatName] || 0) + absAmt;
        }
      });

      // Net Savings
      const netSavings = totalIncome - totalExpenses;

      // Average Daily Spending
      const daysPassed = today.getDate();
      const avgDailySpending = daysPassed > 0 ? totalExpenses / daysPassed : 0.0;

      // Highest Expense Category
      let highestCategory = 'None';
      let highestCategoryAmt = 0;
      Object.keys(categorySpent).forEach(cat => {
        if (categorySpent[cat] > highestCategoryAmt) {
          highestCategoryAmt = categorySpent[cat];
          highestCategory = cat;
        }
      });

      // Monthly Growth comparison
      let prevExpenses = 0;
      const prevCategorySpent: Record<string, number> = {};

      prevTxns.forEach(t => {
        const type = t.transactionType.toUpperCase();
        const catName = t.category.name;

        if (type === 'EXPENSE' || type === 'GAMBLING') {
          const absAmt = Math.abs(t.amount);
          prevExpenses += absAmt;
          prevCategorySpent[catName] = (prevCategorySpent[catName] || 0) + absAmt;
        }
      });

      const expenseGrowthPct = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0.0;

      // 2. Generate Real Heuristics-based AI Quick Insights
      const insights: string[] = [];

      // Comparison for highest category
      if (highestCategory !== 'None' && categorySpent[highestCategory] > 0) {
        const prevSpent = prevCategorySpent[highestCategory] || 0;
        if (prevSpent > 0) {
          const MoMGrowth = ((categorySpent[highestCategory] - prevSpent) / prevSpent) * 100;
          if (MoMGrowth > 5) {
            insights.push(`You spent **${MoMGrowth.toFixed(0)}% more** on **${highestCategory}** this month compared to last.`);
          } else if (MoMGrowth < -5) {
            insights.push(`Great job! Your spending on **${highestCategory}** is down **${Math.abs(MoMGrowth).toFixed(0)}%** MoM.`);
          }
        }
      }

      // Weekend vs Weekday analysis
      let weekendSpend = 0;
      let weekdaySpend = 0;
      currentTxns.forEach(t => {
        const type = t.transactionType.toUpperCase();
        if (type === 'EXPENSE' || type === 'GAMBLING') {
          const day = new Date(t.transactionDate).getDay();
          if (day === 0 || day === 6) {
            weekendSpend += Math.abs(t.amount);
          } else {
            weekdaySpend += Math.abs(t.amount);
          }
        }
      });

      const totalSpentTracked = weekendSpend + weekdaySpend;
      if (totalSpentTracked > 0) {
        const weekendRatio = (weekendSpend / totalSpentTracked) * 100;
        if (weekendRatio > 40) {
          insights.push(`Most transactions occur on weekends. Weekend spending accounts for **${weekendRatio.toFixed(0)}%** of your total monthly expense.`);
        }
      }

      // Budget warnings
      const activeBudgets = await prisma.budget.findMany({
        where: { userId, month: today.getMonth() + 1, year: today.getFullYear() }
      });

      activeBudgets.forEach(b => {
        const spent = categorySpent[b.category] || 0.0;
        const ratio = spent / b.amount;
        if (ratio >= 1.0) {
          insights.push(`Budget exceeded! You have spent **₹${spent.toFixed(0)}** against your **₹${b.amount.toFixed(0)}** limit in **${b.category}**.`);
        } else if (ratio >= 0.8) {
          insights.push(`Alert: **${b.category}** budget is **${(ratio * 100).toFixed(0)}%** utilized.`);
        }
      });

      if (insights.length === 0) {
        insights.push('Add transactions or setup budgets to generate personalized financial insights.');
      }

      // 3. Setup Recharts visual outputs
      // Monthly expense aggregation (last 6 months)
      const chartMonthly: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const txs = await prisma.transaction.findMany({
          where: {
            userId,
            transactionDate: { gte: mStart, lte: mEnd }
          }
        });

        let inc = 0, exp = 0;
        txs.forEach(t => {
          const type = t.transactionType.toUpperCase();
          if (type === 'INCOME') inc += t.amount;
          else exp += Math.abs(t.amount);
        });

        const monthName = d.toLocaleString('default', { month: 'short' });
        chartMonthly.push({
          month: monthName,
          Income: inc,
          Expenses: exp,
          Savings: inc - exp
        });
      }

      // Expenses by Category format for Pie Chart
      const chartCategory = Object.keys(categorySpent).map(cat => ({
        name: cat,
        value: categorySpent[cat]
      }));

      // Income by Category format for Pie Chart
      const chartCategoryIncome = Object.keys(categoryIncome).map(cat => ({
        name: cat,
        value: categoryIncome[cat]
      }));

      // Grouped subcategories for nested Pie Chart outer ring
      const chartSubcategory: any[] = [];
      Object.keys(categorySubcategorySpent).forEach(cat => {
        const subcats = categorySubcategorySpent[cat];
        Object.keys(subcats).forEach(subcat => {
          chartSubcategory.push({
            name: subcat,
            parentCategory: cat,
            value: subcats[subcat]
          });
        });
      });

      const chartSubcategoryIncome: any[] = [];
      Object.keys(categorySubcategoryIncome).forEach(cat => {
        const subcats = categorySubcategoryIncome[cat];
        Object.keys(subcats).forEach(subcat => {
          chartSubcategoryIncome.push({
            name: subcat,
            parentCategory: cat,
            value: subcats[subcat]
          });
        });
      });

      // Combined Daily Spending Heatmap (current month days)
      const chartDaily: any[] = [];
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let spendVal = 0;
        currentTxns.forEach(t => {
          const type = t.transactionType.toUpperCase();
          const tDate = new Date(t.transactionDate).toISOString().split('T')[0];
          if ((type === 'EXPENSE' || type === 'GAMBLING') && tDate === dStr) {
            spendVal += Math.abs(t.amount);
          }
        });
        chartDaily.push({
          day,
          Spending: spendVal
        });
      }

      return res.json({
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
          subcategory: chartSubcategory,
          subcategoryIncome: chartSubcategoryIncome,
          daily: chartDaily
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Admin-Only: Unified Financial Net Worth summary combining standard and gambling systems
   */
  public static async getCombinedSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // 1. Standard Aggregations (Income, Expenses, Investments)
      const txns = await prisma.transaction.findMany({
        where: { userId },
        include: { category: true }
      });
      
      let totalIncome = 0;
      let totalExpenses = 0;
      let totalInvestments = 0;

      txns.forEach(t => {
        const type = t.transactionType.toUpperCase();
        const catName = t.category.name;

        if (type === 'INCOME') {
          totalIncome += t.amount;
        } else if (type === 'EXPENSE' || type === 'GAMBLING') {
          const absAmt = Math.abs(t.amount);
          if (catName.toLowerCase() === 'investment' || catName.toLowerCase() === 'investment returns') {
            totalInvestments += absAmt;
          } else {
            totalExpenses += absAmt;
          }
        }
      });

      // 2. Gambling Bookkeeping Aggregations (Only for admins)
      const isAdmin = req.user!.role === 'ADMIN';

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalBonuses = 0;
      let currentPlatformBalance = 0;
      let gamblingProfit = 0;

      if (isAdmin) {
        const gamblingEntries = await prisma.gamblingEntry.findMany({ where: { userId } });
        const gamblingPlatforms = await prisma.gamblingPlatform.findMany({ where: { userId } });

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

        // Net Gambling Profit = (Withdrawals + Platform Balance + Bonuses) - Deposits
        gamblingProfit = (totalWithdrawals + currentPlatformBalance + totalBonuses) - totalDeposits;
      }

      // 3. Combined Financial Net Worth formulas
      const netWorth = totalIncome + totalInvestments + gamblingProfit - totalExpenses;

      const assetBalances = [
        { name: 'Liquid Cash / Banks', value: Math.max(0, totalIncome - totalExpenses - totalInvestments - totalDeposits + totalWithdrawals) },
        { name: 'Investments Portfolio', value: totalInvestments }
      ];

      if (isAdmin) {
        assetBalances.push({ name: 'Gambling Platform Ledgers', value: currentPlatformBalance });
      }

      return res.json({
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
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

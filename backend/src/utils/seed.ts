import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EXPENSE_CATEGORIES = [
  { name: 'Beauty/Wellness', icon: 'Sparkles', color: '#ec4899' },
  { name: 'Eating Out/Ordering In', icon: 'Utensils', color: '#f97316' },
  { name: 'Entertainment', icon: 'Film', color: '#a855f7' },
  { name: 'Fitness/Sports', icon: 'Dumbbell', color: '#10b981' },
  { name: 'Fuel', icon: 'Fuel', color: '#f59e0b' },
  { name: 'Gifts', icon: 'Gift', color: '#f43f5e' },
  { name: 'Groceries', icon: 'ShoppingBag', color: '#84cc16' },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Home Improvement', icon: 'Home', color: '#06b6d4' },
  { name: 'Loan/EMI Payments', icon: 'Receipt', color: '#ef4444' },
  { name: 'Miscellaneous', icon: 'HelpCircle', color: '#6b7280' },
  { name: 'Money Transfers', icon: 'ArrowLeftRight', color: '#3b82f6' },
  { name: 'Rent', icon: 'Building', color: '#6366f1' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Skill Development', icon: 'GraduationCap', color: '#14b8a6' },
  { name: 'Subscriptions', icon: 'Tv', color: '#a855f7' },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4' },
  { name: 'Utilities/Bills', icon: 'Lightbulb', color: '#eab308' }
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981' },
  { name: 'Freelancing', icon: 'Laptop', color: '#14b8a6' },
  { name: 'Business Income', icon: 'TrendingUp', color: '#22c55e' },
  { name: 'Interest', icon: 'Percent', color: '#3b82f6' },
  { name: 'Investment Returns', icon: 'LineChart', color: '#3b82f6' },
  { name: 'Bonus', icon: 'Award', color: '#eab308' },
  { name: 'Refund', icon: 'RotateCcw', color: '#64748b' },
  { name: 'Cashback', icon: 'Tag', color: '#f59e0b' },
  { name: 'Other Income', icon: 'PlusCircle', color: '#6b7280' }
];

async function main() {
  console.log('Clearing database tables...');
  await prisma.transactionReceipt.deleteMany({});
  await prisma.gamblingEntry.deleteMany({});
  await prisma.gamblingPlatform.deleteMany({});
  await prisma.recurringTransaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Creating system categories...');
  const categoryMap: { [name: string]: string } = {};

  for (const c of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) {
    const createdCat = await prisma.category.create({
      data: {
        name: c.name,
        icon: c.icon,
        color: c.color,
        isSystem: true
      }
    });
    categoryMap[c.name] = createdCat.id;
  }
  console.log(`Successfully seeded ${Object.keys(categoryMap).length} categories.`);

  console.log('Creating users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);
  const userPasswordHash = await bcrypt.hash('user123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@tracker.com',
      passwordHash,
      name: 'Alpha Admin',
      role: 'ADMIN'
    }
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@tracker.com',
      passwordHash: userPasswordHash,
      name: 'Standard Tracker',
      role: 'USER'
    }
  });

  console.log(`Created users: Admin (${admin.email}), User (${user.email})`);

  // Target date arrays to mock previous and current month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // Helper to generate dates relative to today
  const getDateDaysAgo = (days: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  console.log('Seeding transactions with advanced schema parameters...');

  const mockTransactions = [
    {
      date: getDateDaysAgo(2),
      description: 'Weekend dinner with friends',
      amount: -1250.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Dominos',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Karimpur',
      tags: ['food', 'pizza'],
      note: 'Weekend dinner with friends',
      receipts: ['dominos_bill.jpg']
    },
    {
      date: getDateDaysAgo(5),
      description: 'Weekly grocery stocking',
      amount: -3450.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Reliance Smart',
      pm: 'Card',
      acc: 'HDFC',
      location: 'City Mall',
      tags: ['food', 'groceries'],
      note: 'Household essentials and snacks',
      receipts: ['reliance_receipt.pdf']
    },
    {
      date: getDateDaysAgo(12),
      description: 'Premium Electronics Gadget',
      amount: -95000.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'HP Hardware Store',
      pm: 'Bank Transfer',
      acc: 'HDFC',
      location: 'Tech Hub Park',
      tags: ['electronics', 'laptop'],
      note: 'New HP EliteBook office work machine',
      receipts: ['hp_invoice.pdf', 'delivery_challan.png']
    },
    {
      date: getDateDaysAgo(20),
      description: 'Monthly electricity bill',
      amount: -1800.00,
      type: 'Expense',
      category: 'Utilities/Bills',
      merchant: 'State Electricity Board',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online portal',
      tags: ['bills', 'electricity'],
      note: 'Domestic electricity power charge',
      receipts: ['electricity_bill.pdf']
    },
    {
      date: getDateDaysAgo(4),
      description: 'Fuel filling for vehicle',
      amount: -1500.00,
      type: 'Expense',
      category: 'Fuel',
      merchant: 'HP Petrol Pump',
      pm: 'Card',
      acc: 'SBI',
      location: 'National Highway 12',
      tags: ['fuel', 'car'],
      note: 'Full tank refuel',
      receipts: ['fuel_receipt.jpg']
    },
    {
      date: getDateDaysAgo(1),
      description: 'TechCorp Monthly Salary Credit',
      amount: 50000.00,
      type: 'Income',
      category: 'Salary',
      merchant: 'TechCorp Pvt Ltd',
      pm: 'Bank Transfer',
      acc: 'SBI',
      location: 'Corporate HQ',
      tags: ['salary', 'techcorp'],
      note: 'May salary distribution credit',
      receipts: []
    },
    {
      date: getDateDaysAgo(3),
      description: 'Scratch card winner',
      amount: 75.00,
      type: 'Income',
      category: 'Cashback',
      merchant: 'Google Pay',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online app',
      tags: ['bonus', 'cashback'],
      note: 'Recharge referral scratch card bonus',
      receipts: []
    }
  ];

  const testUsers = [admin, user];

  for (const u of testUsers) {
    for (const t of mockTransactions) {
      const catId = categoryMap[t.category] || categoryMap['Miscellaneous'];
      
      const createdTxn = await prisma.transaction.create({
        data: {
          userId: u.id,
          transactionDate: t.date,
          amount: t.amount,
          transactionType: t.type,
          categoryId: catId,
          merchantName: t.merchant,
          description: t.description,
          paymentMethod: t.pm,
          accountId: t.acc,
          location: t.location,
          tags: JSON.stringify(t.tags),
          note: t.note,
          receiptCount: t.receipts.length
        }
      });

      // Seed mock receipts if any
      for (const rec of t.receipts) {
        await prisma.transactionReceipt.create({
          data: {
            transactionId: createdTxn.id,
            fileName: rec,
            fileUrl: `http://localhost:5000/uploads/${rec}`,
            fileType: rec.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            extractedText: `MOCK OCR TEXT FOR ${rec}\nMerchant: ${t.merchant}\nTotal: ₹${Math.abs(t.amount)}\nDate: ${t.date.toISOString().split('T')[0]}`,
            aiSummary: `Parsed receipt successfully. Confirmed value ₹${Math.abs(t.amount)} for ${t.merchant}`
          }
        });
      }
    }

    // Previous month transactions to mock MoM comparison analytics
    for (const t of mockTransactions) {
      const catId = categoryMap[t.category] || categoryMap['Miscellaneous'];
      const prevDate = new Date(t.date);
      prevDate.setDate(prevDate.getDate() - 30);

      const createdTxn = await prisma.transaction.create({
        data: {
          userId: u.id,
          transactionDate: prevDate,
          amount: t.amount * 0.9, // Slightly lower amount for growth comparisons
          transactionType: t.type,
          categoryId: catId,
          merchantName: `${t.merchant} (Prev Month)`,
          description: `${t.description} (Prev Month)`,
          paymentMethod: t.pm,
          accountId: t.acc,
          location: t.location,
          tags: JSON.stringify(t.tags),
          note: t.note,
          receiptCount: t.receipts.length
        }
      });

      // Seed mock receipts if any
      for (const rec of t.receipts) {
        await prisma.transactionReceipt.create({
          data: {
            transactionId: createdTxn.id,
            fileName: `prev_${rec}`,
            fileUrl: `http://localhost:5000/uploads/prev_${rec}`,
            fileType: rec.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            extractedText: `MOCK HISTORICAL OCR TEXT\nTotal: ₹${Math.abs(t.amount * 0.9)}`,
            aiSummary: 'Historical receipt log parsed'
          }
        });
      }
    }

    // Seeding budgets (Current Month)
    await prisma.budget.createMany({
      data: [
        { userId: u.id, category: 'Food', amount: 8000, month: currentMonth + 1, year: currentYear },
        { userId: u.id, category: 'Shopping', amount: 6000, month: currentMonth + 1, year: currentYear },
        { userId: u.id, category: 'Transportation', amount: 3000, month: currentMonth + 1, year: currentYear }
      ]
    });

    // Seeding recurring transactions
    await prisma.recurringTransaction.create({
      data: {
        userId: u.id,
        description: 'Netflix Premium Subscription',
        amount: -649.00,
        type: 'EXPENSE',
        category: 'Entertainment',
        subcategory: 'Subscriptions',
        paymentMethod: 'Credit Card',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(15),
        nextRunDate: getDateDaysAgo(-15), // Due in 15 days
        notes: 'Monthly standard movie package subscription billing details'
      }
    });
  }

  console.log('Seeding Admin Gambling systems (Platform & Bets Ledger)...');

  const stake = await prisma.gamblingPlatform.create({
    data: {
      userId: admin.id,
      name: 'Stake',
      websiteUrl: 'https://stake.com',
      currency: 'INR',
      balance: 15000.00,
      status: 'ACTIVE'
    }
  });

  const bcgame = await prisma.gamblingPlatform.create({
    data: {
      userId: admin.id,
      name: 'BC.Game',
      websiteUrl: 'https://bc.game',
      currency: 'INR',
      balance: 4500.00,
      status: 'ACTIVE'
    }
  });

  const dream11 = await prisma.gamblingPlatform.create({
    data: {
      userId: admin.id,
      name: 'Dream11',
      websiteUrl: 'https://dream11.com',
      currency: 'INR',
      balance: 2200.00,
      status: 'ACTIVE'
    }
  });

  const gamblingLogs = [
    { platformId: stake.id, type: 'DEPOSIT', amount: 10000, cat: 'Other', daysAgo: 20, desc: 'UPI Deposit' },
    { platformId: stake.id, type: 'BET_PLACED', amount: 2000, cat: 'Casino', daysAgo: 18, desc: 'Blackjack Bet' },
    { platformId: stake.id, type: 'BET_WON', amount: 5000, cat: 'Casino', daysAgo: 18, desc: 'Blackjack Win payout' },
    { platformId: stake.id, type: 'BET_PLACED', amount: 1500, cat: 'Sports Betting', daysAgo: 12, desc: 'IPL Match Bet Placed' },
    { platformId: stake.id, type: 'BET_LOST', amount: 1500, cat: 'Sports Betting', daysAgo: 12, desc: 'IPL Match lost' },
    { platformId: stake.id, type: 'BONUS', amount: 500, cat: 'Other', daysAgo: 10, desc: 'Weekly platform coupon bonus' },
    { platformId: stake.id, type: 'WITHDRAWAL', amount: 8000, cat: 'Other', daysAgo: 5, desc: 'Withdraw to Bank HDFC' },

    { platformId: bcgame.id, type: 'DEPOSIT', amount: 5000, cat: 'Other', daysAgo: 14, desc: 'Card Deposit' },
    { platformId: bcgame.id, type: 'BET_PLACED', amount: 1000, cat: 'Slots', daysAgo: 10, desc: 'Gates of Olympus Spin' },
    { platformId: bcgame.id, type: 'BET_WON', amount: 2500, cat: 'Slots', daysAgo: 10, desc: 'Gates of Olympus payout hit' },

    { platformId: dream11.id, type: 'DEPOSIT', amount: 2000, cat: 'Other', daysAgo: 9, desc: 'Deposit UPI' },
    { platformId: dream11.id, type: 'BET_PLACED', amount: 500, cat: 'Fantasy Sports', daysAgo: 7, desc: 'IND vs PAK Mega Contest Entry' },
    { platformId: dream11.id, type: 'BET_WON', amount: 1200, cat: 'Fantasy Sports', daysAgo: 6, desc: 'Fantasy sports payout distribution' }
  ];

  for (const g of gamblingLogs) {
    const entry = await prisma.gamblingEntry.create({
      data: {
        userId: admin.id,
        platformId: g.platformId,
        transactionType: g.type,
        amount: g.amount,
        currency: 'INR',
        date: getDateDaysAgo(g.daysAgo),
        description: g.desc,
        category: g.cat,
        notes: 'Pre-seeded platform balance logs'
      }
    });

    // Unified ledger: every gambling entry also creates a transaction record!
    // Income type for won bets / withdrawals / bonuses, Expense type for bet placements / deposits
    const isIncome = ['BET_WON', 'WITHDRAWAL', 'BONUS', 'CASHBACK', 'REFUND'].includes(g.type);
    const catId = categoryMap['Entertainment'] || categoryMap['Miscellaneous'];
    await prisma.transaction.create({
      data: {
        userId: admin.id,
        transactionDate: getDateDaysAgo(g.daysAgo),
        amount: isIncome ? g.amount : -g.amount,
        transactionType: 'Gambling',
        categoryId: catId,
        merchantName: g.platformId === stake.id ? 'Stake platform' : g.platformId === bcgame.id ? 'BC.Game platform' : 'Dream11 platform',
        description: `Gambling ${g.type.replace('_', ' ')}: ${g.desc}`,
        paymentMethod: 'UPI',
        accountId: 'Wallet',
        tags: JSON.stringify(['gambling', g.platformId === stake.id ? 'stake' : 'bcgame']),
        note: `Linked Gambling platform Entry ID: ${entry.id}`
      }
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

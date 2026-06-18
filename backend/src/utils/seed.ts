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
    // --- Income ---
    {
      date: getDateDaysAgo(1),
      description: 'TechCorp Monthly Salary Credit',
      amount: 75000.00,
      type: 'Income',
      category: 'Salary',
      merchant: 'TechCorp Pvt Ltd',
      pm: 'Bank Transfer',
      acc: 'SBI',
      location: 'Corporate HQ',
      tags: ['salary', 'monthly'],
      note: 'Monthly salary distribution',
      receipts: []
    },
    {
      date: getDateDaysAgo(30),
      description: 'TechCorp Monthly Salary Credit',
      amount: 75000.00,
      type: 'Income',
      category: 'Salary',
      merchant: 'TechCorp Pvt Ltd',
      pm: 'Bank Transfer',
      acc: 'SBI',
      location: 'Corporate HQ',
      tags: ['salary', 'monthly'],
      note: 'Previous month salary distribution',
      receipts: []
    },
    {
      date: getDateDaysAgo(5),
      description: 'UI Design Freelance Milestone',
      amount: 15000.00,
      type: 'Income',
      category: 'Freelancing',
      merchant: 'Upwork Client',
      pm: 'Bank Transfer',
      acc: 'HDFC',
      location: 'Remote',
      tags: ['freelance', 'ui-design'],
      note: 'Landing page design payment',
      receipts: []
    },
    {
      date: getDateDaysAgo(25),
      description: 'Technical Writing Payout',
      amount: 8000.00,
      type: 'Income',
      category: 'Freelancing',
      merchant: 'Medium Writer Program',
      pm: 'Bank Transfer',
      acc: 'HDFC',
      location: 'Remote',
      tags: ['freelance', 'writing'],
      note: 'Monthly blog writing payment',
      receipts: []
    },
    {
      date: getDateDaysAgo(3),
      description: 'GPay Scratch Card Cashback',
      amount: 150.00,
      type: 'Income',
      category: 'Cashback',
      merchant: 'Google Pay',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online App',
      tags: ['cashback', 'rewards'],
      note: 'Scratch card reward for electricity bill payment',
      receipts: []
    },
    {
      date: getDateDaysAgo(18),
      description: 'Amazon Pay Reward',
      amount: 50.00,
      type: 'Income',
      category: 'Cashback',
      merchant: 'Amazon Pay',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online App',
      tags: ['cashback', 'rewards'],
      note: 'Cashback reward for shopping',
      receipts: []
    },
    {
      date: getDateDaysAgo(12),
      description: 'Performance Bonus Q1',
      amount: 12000.00,
      type: 'Income',
      category: 'Bonus',
      merchant: 'TechCorp Pvt Ltd',
      pm: 'Bank Transfer',
      acc: 'SBI',
      location: 'Corporate HQ',
      tags: ['bonus', 'quarterly'],
      note: 'Excellent performance bonus award',
      receipts: []
    },
    // --- Eating Out/Ordering In ---
    {
      date: getDateDaysAgo(2),
      description: 'Weekend Zomato Dinner Order',
      amount: -1250.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Zomato',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Home',
      tags: ['food', 'dinner'],
      note: 'Weekend dinner with friends',
      receipts: ['zomato_bill.jpg']
    },
    {
      date: getDateDaysAgo(4),
      description: 'Swiggy Biryani Delivery',
      amount: -680.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Swiggy',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Home',
      tags: ['food', 'biryani'],
      note: 'Lunch delivery',
      receipts: []
    },
    {
      date: getDateDaysAgo(8),
      description: 'Starbucks Coffee Meetup',
      amount: -450.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Starbucks',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Connaught Place',
      tags: ['coffee', 'beverage'],
      note: 'Afternoon coffee and cookie',
      receipts: ['starbucks_receipt.jpg']
    },
    {
      date: getDateDaysAgo(14),
      description: 'McDonalds Breakfast Meal',
      amount: -350.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'McDonalds',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Sector 62',
      tags: ['food', 'breakfast'],
      note: 'Quick breakfast wrap and coffee',
      receipts: []
    },
    {
      date: getDateDaysAgo(19),
      description: 'Dinner at Fine Dine Restaurant',
      amount: -3400.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'The Olive Bistro',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Downtown Mall',
      tags: ['food', 'finedining'],
      note: 'Anniversary dinner date',
      receipts: ['olive_bistro_receipt.pdf']
    },
    {
      date: getDateDaysAgo(26),
      description: 'Pizza Hut Office Party Contribution',
      amount: -500.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Pizza Hut',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Office',
      tags: ['food', 'pizza'],
      note: 'Colleague farewell celebration pizza',
      receipts: []
    },
    {
      date: getDateDaysAgo(33),
      description: 'Local Cafe Snacks & Tea',
      amount: -180.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Chai Point',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Metro Station',
      tags: ['snacks', 'tea'],
      note: 'Evening tea and samosa',
      receipts: []
    },
    {
      date: getDateDaysAgo(41),
      description: 'Subway Sandwich Lunch',
      amount: -290.00,
      type: 'Expense',
      category: 'Eating Out/Ordering In',
      merchant: 'Subway',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Cyber Hub',
      tags: ['food', 'lunch'],
      note: 'Custom club sandwich and diet coke',
      receipts: []
    },
    // --- Groceries ---
    {
      date: getDateDaysAgo(2),
      description: 'Zepto Milk & Eggs Delivery',
      amount: -180.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Zepto',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Home',
      tags: ['groceries', 'quick'],
      note: 'Daily dairy items replenishment',
      receipts: []
    },
    {
      date: getDateDaysAgo(6),
      description: 'Weekly Fruits & Vegetables',
      amount: -850.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Reliance Smart',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Reliance Smart Plaza',
      tags: ['groceries', 'vegetables'],
      note: 'Weekly grocery load and fresh items',
      receipts: ['groceries_receipt.jpg']
    },
    {
      date: getDateDaysAgo(9),
      description: 'Instamart Snack Stocking',
      amount: -620.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Swiggy Instamart',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Home',
      tags: ['groceries', 'snacks'],
      note: 'Chips, soft drinks, and chocolates',
      receipts: []
    },
    {
      date: getDateDaysAgo(15),
      description: 'Blinkit Cleaning Supplies',
      amount: -1200.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Blinkit',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Home',
      tags: ['groceries', 'cleaning'],
      note: 'Detergents, floor cleaner, dishwashing soap',
      receipts: []
    },
    {
      date: getDateDaysAgo(20),
      description: 'Monthly Pantry Stocking',
      amount: -4500.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'BigBasket',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Home',
      tags: ['groceries', 'monthly'],
      note: 'Rice, wheat flour, oils, spices, and pulses',
      receipts: ['bigbasket_invoice.pdf']
    },
    {
      date: getDateDaysAgo(28),
      description: 'Fresh Fruits from Local Vendor',
      amount: -340.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Local Fruit Vendor',
      pm: 'Cash',
      acc: 'Wallet',
      location: 'Market St',
      tags: ['groceries', 'fruits'],
      note: 'Mangoes, apples, and bananas',
      receipts: []
    },
    {
      date: getDateDaysAgo(35),
      description: 'Spices and Dry Fruits Purchase',
      amount: -1800.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Modern Foods Store',
      pm: 'UPI',
      acc: 'SBI',
      location: 'City Centre',
      tags: ['groceries', 'dry-fruits'],
      note: 'Almonds, cashews, raisins, and local spices',
      receipts: []
    },
    {
      date: getDateDaysAgo(43),
      description: 'Zepto Midnight Ice Cream Craving',
      amount: -420.00,
      type: 'Expense',
      category: 'Groceries',
      merchant: 'Zepto',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Home',
      tags: ['groceries', 'dessert'],
      note: 'Double chocolate tub and waffle cones',
      receipts: []
    },
    // --- Shopping ---
    {
      date: getDateDaysAgo(7),
      description: 'Zara Summer Collection Jeans',
      amount: -2990.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'Zara Store',
      pm: 'Card',
      acc: 'HDFC',
      location: 'DLF Mall of India',
      tags: ['shopping', 'clothing'],
      note: 'Slim fit denim jeans',
      receipts: ['zara_receipt.jpg']
    },
    {
      date: getDateDaysAgo(12),
      description: 'HP EliteBook Office Work Laptop',
      amount: -95000.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'HP Hardware Store',
      pm: 'Bank Transfer',
      acc: 'HDFC',
      location: 'Tech Hub Park',
      tags: ['electronics', 'laptop'],
      note: 'New HP EliteBook office work machine',
      receipts: ['hp_invoice.pdf']
    },
    {
      date: getDateDaysAgo(15),
      description: 'Nike Zoom Running Shoes',
      amount: -6500.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'Nike Store',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Ambience Mall',
      tags: ['shopping', 'shoes'],
      note: 'Aero-foam running sneakers',
      receipts: []
    },
    {
      date: getDateDaysAgo(22),
      description: 'Amazon Smart Thermos Flask',
      amount: -1499.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'Amazon',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online Portal',
      tags: ['shopping', 'gadget'],
      note: 'Insulated bottle with LED temperature display',
      receipts: ['amazon_bill.pdf']
    },
    {
      date: getDateDaysAgo(29),
      description: 'Decathlon Rain Jacket',
      amount: -1999.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'Decathlon',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Decathlon Store',
      tags: ['shopping', 'sportswear'],
      note: 'Waterproof windcheater jacket',
      receipts: []
    },
    {
      date: getDateDaysAgo(38),
      description: 'HM Round Neck T-shirts (Pack of 3)',
      amount: -1299.00,
      type: 'Expense',
      category: 'Shopping',
      merchant: 'H&M Store',
      pm: 'Card',
      acc: 'HDFC',
      location: 'City Walk Mall',
      tags: ['shopping', 'clothing'],
      note: 'Casual cotton t-shirts',
      receipts: []
    },
    // --- Utilities/Bills ---
    {
      date: getDateDaysAgo(10),
      description: 'Broadband Fiber Monthly Bill',
      amount: -943.00,
      type: 'Expense',
      category: 'Utilities/Bills',
      merchant: 'JioFiber',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online portal',
      tags: ['bills', 'wifi'],
      note: '100 Mbps broadband standard charge',
      receipts: ['jio_bill.pdf']
    },
    {
      date: getDateDaysAgo(20),
      description: 'Domestic Electricity Power Bill',
      amount: -1800.00,
      type: 'Expense',
      category: 'Utilities/Bills',
      merchant: 'State Electricity Board',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online portal',
      tags: ['bills', 'electricity'],
      note: 'Domestic electricity power charge',
      receipts: []
    },
    {
      date: getDateDaysAgo(23),
      description: 'Mobile Recharge Prepaid Plan',
      amount: -719.00,
      type: 'Expense',
      category: 'Utilities/Bills',
      merchant: 'Airtel',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Airtel App',
      tags: ['bills', 'recharge'],
      note: '84 days unlimited calling and data pack',
      receipts: []
    },
    {
      date: getDateDaysAgo(27),
      description: 'Piped Natural Gas Monthly Bill',
      amount: -620.00,
      type: 'Expense',
      category: 'Utilities/Bills',
      merchant: 'Indraprastha Gas Limited',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online portal',
      tags: ['bills', 'gas'],
      note: 'PNG cooking gas consumption bill',
      receipts: []
    },
    {
      date: getDateDaysAgo(44),
      description: 'Municipal Water Supply Tax',
      amount: -450.00,
      type: 'Expense',
      category: 'Utilities/Bills',
      merchant: 'Water Authority',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online portal',
      tags: ['bills', 'water'],
      note: 'Bimonthly domestic water tax',
      receipts: []
    },
    // --- Fuel ---
    {
      date: getDateDaysAgo(4),
      description: 'Car Fuel Refilling',
      amount: -1500.00,
      type: 'Expense',
      category: 'Fuel',
      merchant: 'HP Petrol Pump',
      pm: 'Card',
      acc: 'SBI',
      location: 'National Highway 12',
      tags: ['fuel', 'car'],
      note: 'Regular fuel refuel',
      receipts: ['fuel_receipt.jpg']
    },
    {
      date: getDateDaysAgo(15),
      description: 'CNG Cylinder Tank Fill',
      amount: -750.00,
      type: 'Expense',
      category: 'Fuel',
      merchant: 'Indian Oil CNG',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Sector 45 Station',
      tags: ['fuel', 'cng'],
      note: 'CNG top-up for taxi/car',
      receipts: []
    },
    {
      date: getDateDaysAgo(26),
      description: 'Premium Petrol Refuel',
      amount: -2000.00,
      type: 'Expense',
      category: 'Fuel',
      merchant: 'Bharat Petroleum',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Main Ring Road',
      tags: ['fuel', 'car'],
      note: 'Full tank premium petrol',
      receipts: []
    },
    {
      date: getDateDaysAgo(39),
      description: 'Car Petrol Fill-up',
      amount: -1200.00,
      type: 'Expense',
      category: 'Fuel',
      merchant: 'HP Petrol Pump',
      pm: 'Cash',
      acc: 'Wallet',
      location: 'National Highway 12',
      tags: ['fuel', 'car'],
      note: 'Partial petrol fill',
      receipts: []
    },
    // --- Travel ---
    {
      date: getDateDaysAgo(3),
      description: 'Uber Ride to Client Office',
      amount: -450.00,
      type: 'Expense',
      category: 'Travel',
      merchant: 'Uber',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Cyber City',
      tags: ['travel', 'cab'],
      note: 'Business travel to client site',
      receipts: []
    },
    {
      date: getDateDaysAgo(8),
      description: 'Metro Smart Card Auto-topup',
      amount: -500.00,
      type: 'Expense',
      category: 'Travel',
      merchant: 'Delhi Metro',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Metro Station',
      tags: ['travel', 'metro'],
      note: 'Metro card smart reload',
      receipts: []
    },
    {
      date: getDateDaysAgo(16),
      description: 'Weekend Trip Flight Ticket',
      amount: -6500.00,
      type: 'Expense',
      category: 'Travel',
      merchant: 'MakeMyTrip',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Online Booking',
      tags: ['travel', 'flight'],
      note: 'One-way flight to Goa',
      receipts: ['flight_ticket.pdf']
    },
    {
      date: getDateDaysAgo(17),
      description: 'Hotel Stay Room Booking',
      amount: -8500.00,
      type: 'Expense',
      category: 'Travel',
      merchant: 'Goibibo',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Goa Hotel',
      tags: ['travel', 'hotel'],
      note: '2 Nights standard room stay in Goa',
      receipts: []
    },
    {
      date: getDateDaysAgo(23),
      description: 'Train Ticket Reservation',
      amount: -1250.00,
      type: 'Expense',
      category: 'Travel',
      merchant: 'IRCTC Portal',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online Portal',
      tags: ['travel', 'train'],
      note: '3AC Sleeper ticket to Jaipur',
      receipts: []
    },
    {
      date: getDateDaysAgo(34),
      description: 'Ola Cab Airport Drop',
      amount: -850.00,
      type: 'Expense',
      category: 'Travel',
      merchant: 'Ola Cabs',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Terminal 3',
      tags: ['travel', 'airport'],
      note: 'Early morning taxi ride to airport',
      receipts: []
    },
    // --- Entertainment ---
    {
      date: getDateDaysAgo(5),
      description: 'Blockbuster Movie Tickets (2)',
      amount: -680.00,
      type: 'Expense',
      category: 'Entertainment',
      merchant: 'PVR Cinemas',
      pm: 'UPI',
      acc: 'SBI',
      location: 'PVR Plaza',
      tags: ['entertainment', 'movie'],
      note: 'Evening show tickets and popcorn combo',
      receipts: []
    },
    {
      date: getDateDaysAgo(11),
      description: 'Weekend Bowling with Friends',
      amount: -1200.00,
      type: 'Expense',
      category: 'Entertainment',
      merchant: 'Smaaash Bowling',
      pm: 'Card',
      acc: 'HDFC',
      location: 'City Center Mall',
      tags: ['entertainment', 'bowling'],
      note: '2 rounds of bowling and beverages',
      receipts: []
    },
    {
      date: getDateDaysAgo(24),
      description: 'Laser Tag Arena Entry',
      amount: -800.00,
      type: 'Expense',
      category: 'Entertainment',
      merchant: 'Laser Tag Zone',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Sector 18',
      tags: ['entertainment', 'laser-tag'],
      note: 'Group matches slot entry fee',
      receipts: []
    },
    {
      date: getDateDaysAgo(32),
      description: 'Comedy Club Show Entry',
      amount: -900.00,
      type: 'Expense',
      category: 'Entertainment',
      merchant: 'Canvas Comedy Club',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Comedy Arena',
      tags: ['entertainment', 'standup'],
      note: 'Weekend standup comedy show ticket',
      receipts: []
    },
    // --- Healthcare ---
    {
      date: getDateDaysAgo(7),
      description: 'MedPlus Prescription Medicines',
      amount: -850.00,
      type: 'Expense',
      category: 'Healthcare',
      merchant: 'MedPlus Pharmacy',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Sector 55 Pharmacy',
      tags: ['health', 'medicines'],
      note: 'Anti-allergy pills, syrup, and multivitamins',
      receipts: ['medplus_bill.jpg']
    },
    {
      date: getDateDaysAgo(19),
      description: 'Dentist Consultation & Cleaning',
      amount: -1500.00,
      type: 'Expense',
      category: 'Healthcare',
      merchant: 'Clove Dental Care',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Sector 62',
      tags: ['health', 'dentist'],
      note: 'Routine oral checkup and plaque scaling',
      receipts: []
    },
    {
      date: getDateDaysAgo(31),
      description: 'Routine Diagnostic Blood Test',
      amount: -2200.00,
      type: 'Expense',
      category: 'Healthcare',
      merchant: 'Lal Path Labs',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Local Lab Clinic',
      tags: ['health', 'tests'],
      note: 'Yearly standard health checkup package',
      receipts: []
    },
    // --- Beauty/Wellness ---
    {
      date: getDateDaysAgo(13),
      description: 'Salon Haircut & Beard Grooming',
      amount: -600.00,
      type: 'Expense',
      category: 'Beauty/Wellness',
      merchant: 'Geetanjali Salon',
      pm: 'UPI',
      acc: 'SBI',
      location: 'District Center',
      tags: ['grooming', 'haircut'],
      note: 'Premium haircut, wash, and beard trim style',
      receipts: []
    },
    {
      date: getDateDaysAgo(37),
      description: 'Relaxing Full Body Massage',
      amount: -2500.00,
      type: 'Expense',
      category: 'Beauty/Wellness',
      merchant: 'Tattva Spa Center',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Luxury Hotel Spa',
      tags: ['spa', 'wellness'],
      note: '60 minutes Swedish aromatherapy massage',
      receipts: []
    },
    // --- Gifts ---
    {
      date: getDateDaysAgo(11),
      description: 'Anniversary Flowers and Chocolate',
      amount: -1200.00,
      type: 'Expense',
      category: 'Gifts',
      merchant: 'Ferns N Petals',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online App',
      tags: ['gifts', 'flowers'],
      note: 'Red roses bouquet and Ferrero Rocher box',
      receipts: []
    },
    {
      date: getDateDaysAgo(42),
      description: 'Amazon Gift Card for Colleague Wedding',
      amount: -2000.00,
      type: 'Expense',
      category: 'Gifts',
      merchant: 'Amazon Gift Store',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Online Portal',
      tags: ['gifts', 'wedding'],
      note: 'E-mail gift card sent to marriage couple',
      receipts: []
    },
    // --- Skill Development ---
    {
      date: getDateDaysAgo(15),
      description: 'React Native & TypeScript Course',
      amount: -490.00,
      type: 'Expense',
      category: 'Skill Development',
      merchant: 'Udemy Online',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Online Website',
      tags: ['education', 'programming'],
      note: 'Video course for learning cross-platform apps',
      receipts: []
    },
    {
      date: getDateDaysAgo(36),
      description: 'Designing Data-Intensive Apps eBook',
      amount: -1499.00,
      type: 'Expense',
      category: 'Skill Development',
      merchant: 'O Reilly Kindle Store',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Kindle App',
      tags: ['education', 'architecture'],
      note: 'System design reference handbook purchase',
      receipts: []
    },
    // --- Fitness/Sports ---
    {
      date: getDateDaysAgo(9),
      description: 'Whey Protein Supplement Powder',
      amount: -4500.00,
      type: 'Expense',
      category: 'Fitness/Sports',
      merchant: 'HealthKart Store',
      pm: 'Card',
      acc: 'HDFC',
      location: 'Market Plaza',
      tags: ['fitness', 'gym'],
      note: '2kg double rich chocolate whey isolate',
      receipts: []
    },
    {
      date: getDateDaysAgo(28),
      description: 'Badminton Court Booking Slot',
      amount: -450.00,
      type: 'Expense',
      category: 'Fitness/Sports',
      merchant: 'Playo App',
      pm: 'UPI',
      acc: 'SBI',
      location: 'Indira Stadium Turf',
      tags: ['fitness', 'badminton'],
      note: '1 hour weekend indoor court booking fee',
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

    // Seeding budgets (Current Month)
    await prisma.budget.createMany({
      data: [
        { userId: u.id, category: 'Food', amount: 8000, month: currentMonth + 1, year: currentYear },
        { userId: u.id, category: 'Shopping', amount: 6000, month: currentMonth + 1, year: currentYear },
        { userId: u.id, category: 'Transportation', amount: 3000, month: currentMonth + 1, year: currentYear }
      ]
    });

    // Seeding recurring transactions (Subscriptions)
    const mockSubscriptions = [
      {
        description: 'Netflix Premium Subscription',
        amount: -649.00,
        type: 'EXPENSE',
        category: 'Entertainment',
        subcategory: 'Subscriptions',
        paymentMethod: 'Credit Card',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(45),
        nextRunDate: getDateDaysAgo(-15),
        notes: 'Monthly standard movie package subscription billing'
      },
      {
        description: 'Spotify Family Plan',
        amount: -179.00,
        type: 'EXPENSE',
        category: 'Entertainment',
        subcategory: 'Subscriptions',
        paymentMethod: 'UPI',
        account: 'SBI',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(15),
        nextRunDate: getDateDaysAgo(-15),
        notes: 'Monthly family music streaming pack'
      },
      {
        description: 'Golds Gym Membership',
        amount: -2500.00,
        type: 'EXPENSE',
        category: 'Fitness/Sports',
        subcategory: 'Health & Wellness',
        paymentMethod: 'Card',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(60),
        nextRunDate: getDateDaysAgo(-30),
        notes: 'Monthly premium fitness membership charges'
      },
      {
        description: 'Adobe Creative Cloud Suite',
        amount: -2399.00,
        type: 'EXPENSE',
        category: 'Skill Development',
        subcategory: 'Software License',
        paymentMethod: 'Credit Card',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(30),
        nextRunDate: getDateDaysAgo(-30),
        notes: 'Creative suite license for Photoshop, Illustrator, Premiere'
      },
      {
        description: 'Monthly Apartment Rent',
        amount: -15000.00,
        type: 'EXPENSE',
        category: 'Rent',
        subcategory: 'Housing',
        paymentMethod: 'Bank Transfer',
        account: 'SBI',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(90),
        nextRunDate: getDateDaysAgo(-10),
        notes: 'Monthly flat rent amount transfer'
      },
      {
        description: 'iCloud 200GB Storage',
        amount: -219.00,
        type: 'EXPENSE',
        category: 'Utilities/Bills',
        subcategory: 'Cloud Storage',
        paymentMethod: 'UPI',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(10),
        nextRunDate: getDateDaysAgo(-20),
        notes: 'Monthly cloud backup storage space'
      },
      {
        description: 'Monthly Freelance Retainer',
        amount: 25000.00,
        type: 'INCOME',
        category: 'Freelancing',
        subcategory: 'Consulting',
        paymentMethod: 'Bank Transfer',
        account: 'HDFC',
        frequency: 'MONTHLY',
        startDate: getDateDaysAgo(90),
        nextRunDate: getDateDaysAgo(-10),
        notes: 'Monthly backend development consulting fee'
      }
    ];

    for (const sub of mockSubscriptions) {
      await prisma.recurringTransaction.create({
        data: {
          userId: u.id,
          description: sub.description,
          amount: sub.amount,
          type: sub.type,
          category: sub.category,
          subcategory: sub.subcategory,
          paymentMethod: sub.paymentMethod,
          account: sub.account,
          frequency: sub.frequency,
          startDate: sub.startDate,
          nextRunDate: sub.nextRunDate,
          notes: sub.notes
        }
      });
    }
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
    // Stake platform logs
    { platformId: stake.id, type: 'DEPOSIT', amount: 15000, cat: 'Other', daysAgo: 25, desc: 'UPI Deposit' },
    { platformId: stake.id, type: 'BET_PLACED', amount: 3000, cat: 'Casino', daysAgo: 24, desc: 'Blackjack Bet Placed' },
    { platformId: stake.id, type: 'BET_WON', amount: 7500, cat: 'Casino', daysAgo: 24, desc: 'Blackjack Win payout' },
    { platformId: stake.id, type: 'BET_PLACED', amount: 2000, cat: 'Sports Betting', daysAgo: 22, desc: 'IPL Match Bet Placed (RCB vs CSK)' },
    { platformId: stake.id, type: 'BET_LOST', amount: 2000, cat: 'Sports Betting', daysAgo: 22, desc: 'IPL Match lost' },
    { platformId: stake.id, type: 'BONUS', amount: 1000, cat: 'Other', daysAgo: 18, desc: 'VIP Level up bonus reward' },
    { platformId: stake.id, type: 'BET_PLACED', amount: 4000, cat: 'Slots', daysAgo: 15, desc: 'Sweet Bonanza spin buy' },
    { platformId: stake.id, type: 'BET_WON', amount: 18000, cat: 'Slots', daysAgo: 15, desc: 'Sweet Bonanza mega win payout' },
    { platformId: stake.id, type: 'WITHDRAWAL', amount: 20000, cat: 'Other', daysAgo: 12, desc: 'Withdraw to Bank HDFC Account' },
    { platformId: stake.id, type: 'BET_PLACED', amount: 5000, cat: 'Casino', daysAgo: 8, desc: 'Live Roulette Bet' },
    { platformId: stake.id, type: 'BET_LOST', amount: 5000, cat: 'Casino', daysAgo: 8, desc: 'Live Roulette Loss' },

    // BC.Game platform logs
    { platformId: bcgame.id, type: 'DEPOSIT', amount: 8000, cat: 'Other', daysAgo: 20, desc: 'Card Deposit' },
    { platformId: bcgame.id, type: 'BET_PLACED', amount: 1500, cat: 'Slots', daysAgo: 17, desc: 'Gates of Olympus Spin buy' },
    { platformId: bcgame.id, type: 'BET_WON', amount: 4500, cat: 'Slots', daysAgo: 17, desc: 'Gates of Olympus payout multiplier hit' },
    { platformId: bcgame.id, type: 'BET_PLACED', amount: 2500, cat: 'Crash', daysAgo: 10, desc: 'Crash multiplier bet placed' },
    { platformId: bcgame.id, type: 'BET_LOST', amount: 2500, cat: 'Crash', daysAgo: 10, desc: 'Crashed at 1.1x' },
    { platformId: bcgame.id, type: 'WITHDRAWAL', amount: 5000, cat: 'Other', daysAgo: 5, desc: 'Withdrawal to Bank SBI Account' },

    // Dream11 platform logs
    { platformId: dream11.id, type: 'DEPOSIT', amount: 3000, cat: 'Other', daysAgo: 14, desc: 'Deposit UPI Pay' },
    { platformId: dream11.id, type: 'BET_PLACED', amount: 1000, cat: 'Fantasy Sports', daysAgo: 12, desc: 'IND vs PAK Mega Contest Entry fee' },
    { platformId: dream11.id, type: 'BET_WON', amount: 3500, cat: 'Fantasy Sports', daysAgo: 11, desc: 'Fantasy Sports rank payout distribution' }
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

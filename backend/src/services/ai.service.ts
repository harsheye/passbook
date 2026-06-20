import https from 'https';

export interface ParsedTransaction {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  description: string;
  category: string;
  subcategory: string;
  date: string; // ISO format or YYYY-MM-DD
  paymentMethod: string;
  account: string;
  notes?: string;
  tags?: string;
  items?: { name: string; price: number }[];
  transactions?: Partial<ParsedTransaction>[];
}

export interface ParsedGamblingEntry {
  platform: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'BET_PLACED' | 'BET_WON' | 'BET_LOST' | 'CASHBACK' | 'REFUND' | 'COMMISSION' | 'ADJUSTMENT';
  amount: number;
  category: string;
  date: string;
  description: string;
  notes?: string;
}

export class AIService {
  private static getGeminiKey(): string {
    return process.env.GEMINI_API_KEY || '';
  }

  /**
   * Identifies what model is running (Gemini vs Heuristics)
   */
  public static getActiveModel(): string {
    return this.getGeminiKey() ? 'Gemini 1.5 Flash' : 'Local Heuristics NLP';
  }

  /**
   * Main entry point to parse general financial transactions
   */
  public static async parseTransaction(text: string): Promise<Partial<ParsedTransaction>> {
    const key = this.getGeminiKey();
    if (key) {
      try {
        return await this.parseWithGemini(text, 'transaction', key);
      } catch (err) {
        console.error('[Gemini API Transaction Failed] Falling back to local NLP heuristics:', err);
      }
    }
    return this.parseLocalTransactionHeuristic(text);
  }

  /**
   * Main entry point to parse gambling/betting transactions
   */
  public static async parseGamblingEntry(text: string): Promise<Partial<ParsedGamblingEntry>> {
    const key = this.getGeminiKey();
    if (key) {
      try {
        return await this.parseWithGemini(text, 'gambling', key);
      } catch (err) {
        console.error('[Gemini API Gambling Failed] Falling back to local NLP heuristics:', err);
      }
    }
    return this.parseLocalGamblingHeuristic(text);
  }

  /**
   * Helper to map any parsed category to one of the standard frontend categories
   */
  public static mapToStandardCategory(categoryName: string, type: 'EXPENSE' | 'INCOME'): string {
    const name = (categoryName || '').trim();
    const nameLower = name.toLowerCase();

    if (type === 'INCOME') {
      if (nameLower.includes('salary') || nameLower.includes('paycheck') || nameLower.includes('wage')) return 'Salary';
      if (nameLower.includes('freelance') || nameLower.includes('gig')) return 'Freelancing';
      if (nameLower.includes('business') || nameLower.includes('revenue') || nameLower.includes('sales')) return 'Business Income';
      if (nameLower.includes('interest')) return 'Interest';
      if (nameLower.includes('investment') || nameLower.includes('dividend') || nameLower.includes('returns')) return 'Investment Returns';
      if (nameLower.includes('bonus') || nameLower.includes('present')) return 'Bonus';
      if (nameLower.includes('refund')) return 'Refund';
      if (nameLower.includes('cashback')) return 'Cashback';
      return 'Other Income';
    } else {
      if (nameLower.includes('beauty') || nameLower.includes('wellness') || nameLower.includes('salon') || nameLower.includes('spa') || nameLower.includes('parlor') || nameLower.includes('cosmetic')) return 'Beauty/Wellness';
      if (nameLower.includes('eat') || nameLower.includes('food') || nameLower.includes('restaurant') || nameLower.includes('dinner') || nameLower.includes('lunch') || nameLower.includes('breakfast') || nameLower.includes('cafe') || nameLower.includes('pizza') || nameLower.includes('burger') || nameLower.includes('swiggy') || nameLower.includes('zomato') || nameLower.includes('starbucks') || nameLower.includes('kfc') || nameLower.includes('mcdonald')) return 'Eating Out/Ordering In';
      if (nameLower.includes('movie') || nameLower.includes('cinema') || nameLower.includes('netflix') || nameLower.includes('spotify') || nameLower.includes('entertainment') || nameLower.includes('ticket') || nameLower.includes('show') || nameLower.includes('concert') || nameLower.includes('club') || nameLower.includes('pub') || nameLower.includes('bar') || nameLower.includes('party')) return 'Entertainment';
      if (nameLower.includes('fit') || nameLower.includes('sport') || nameLower.includes('gym') || nameLower.includes('workout') || nameLower.includes('running') || nameLower.includes('athlete')) return 'Fitness/Sports';
      if (nameLower.includes('fuel') || nameLower.includes('petrol') || nameLower.includes('diesel') || nameLower.includes('gas')) return 'Fuel';
      if (nameLower.includes('gift') || nameLower.includes('donation') || nameLower.includes('charity')) return 'Gifts';
      if (nameLower.includes('grocer') || nameLower.includes('milk') || nameLower.includes('egg') || nameLower.includes('paneer') || nameLower.includes('panner') || nameLower.includes('vegetable') || nameLower.includes('fruit') || nameLower.includes('bread') || nameLower.includes('butter') || nameLower.includes('cheese') || nameLower.includes('rice') || nameLower.includes('oil') || nameLower.includes('sugar') || nameLower.includes('salt') || nameLower.includes('supermarket') || nameLower.includes('store')) return 'Groceries';
      if (nameLower.includes('health') || nameLower.includes('doctor') || nameLower.includes('hospital') || nameLower.includes('medicine') || nameLower.includes('pharmacy') || nameLower.includes('clinic') || nameLower.includes('medical') || nameLower.includes('dentist')) return 'Healthcare';
      if (nameLower.includes('home') || nameLower.includes('furniture') || nameLower.includes('improvement') || nameLower.includes('repair') || nameLower.includes('appliance') || nameLower.includes('decor')) return 'Home Improvement';
      if (nameLower.includes('loan') || nameLower.includes('emi') || nameLower.includes('debt') || nameLower.includes('mortgage') || nameLower.includes('card payment')) return 'Loan/EMI Payments';
      if (nameLower.includes('rent') || nameLower.includes('flat') || nameLower.includes('room') || nameLower.includes('hostel') || nameLower.includes('pg') || nameLower.includes('landlord')) return 'Rent';
      if (nameLower.includes('shop') || nameLower.includes('clothing') || nameLower.includes('clothes') || nameLower.includes('shirt') || nameLower.includes('pant') || nameLower.includes('jeans') || nameLower.includes('shoes') || nameLower.includes('jacket') || nameLower.includes('dress') || nameLower.includes('amazon') || nameLower.includes('flipkart') || nameLower.includes('myntra') || nameLower.includes('mall') || nameLower.includes('electronics') || nameLower.includes('gadget') || nameLower.includes('laptop') || nameLower.includes('phone') || nameLower.includes('device')) return 'Shopping';
      if (nameLower.includes('skill') || nameLower.includes('course') || nameLower.includes('education') || nameLower.includes('tuition') || nameLower.includes('book') || nameLower.includes('school') || nameLower.includes('college') || nameLower.includes('fee') || nameLower.includes('udemy') || nameLower.includes('coursera') || nameLower.includes('learning')) return 'Skill Development';
      if (nameLower.includes('sub') || nameLower.includes('subscription') || nameLower.includes('prime') || nameLower.includes('youtube') || nameLower.includes('hotstar')) return 'Subscriptions';
      if (nameLower.includes('travel') || nameLower.includes('uber') || nameLower.includes('ola') || nameLower.includes('cab') || nameLower.includes('auto') || nameLower.includes('flight') || nameLower.includes('ticket') || nameLower.includes('train') || nameLower.includes('bus') || nameLower.includes('metro') || nameLower.includes('hotel') || nameLower.includes('holiday') || nameLower.includes('vacation')) return 'Travel';
      if (nameLower.includes('utility') || nameLower.includes('bill') || nameLower.includes('electricity') || nameLower.includes('water') || nameLower.includes('internet') || nameLower.includes('wifi') || nameLower.includes('recharge') || nameLower.includes('broadband')) return 'Utilities/Bills';
      
      return 'Miscellaneous';
    }
  }

  /**
   * Categorizes a transaction description automatically using keyword mapping
   */
  public static autoCategorize(description: string, amount: number): { category: string; subcategory: string; type: 'EXPENSE' | 'INCOME' } {
    const desc = description.toLowerCase();
    let category = 'Miscellaneous';
    let subcategory = 'General';
    let type: 'EXPENSE' | 'INCOME' = amount > 0 ? 'INCOME' : 'EXPENSE';

    const foodKeywords = ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'mcdonald', 'burger', 'pizza', 'cafe', 'swiggy', 'zomato', 'starbucks', 'grocery', 'groceries', 'kfc', 'cafe', 'bakery', 'eat'];
    const shoppingKeywords = ['shopping', 'amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'laptop', 'phone', 't-shirt', 'jacket', 'gadget', 'ikea', 'furniture', 'mall'];
    const transportationKeywords = ['uber', 'ola', 'auto', 'cab', 'petrol', 'diesel', 'fuel', 'train', 'bus', 'metro', 'flight', 'ticket', 'transport', 'taxi', 'parking'];
    const utilitiesKeywords = ['electricity', 'water', 'wifi', 'internet', 'recharge', 'gas', 'power', 'bill', 'broadband', 'phone bill', 'mobile bill', 'electricity bill'];
    const healthcareKeywords = ['doctor', 'hospital', 'medicine', 'pharma', 'pharmacy', 'dental', 'health', 'clinic', 'medical', 'physio', 'test', 'lab'];
    const entertainmentKeywords = ['movie', 'netflix', 'spotify', 'cinema', 'game', 'concert', 'play', 'club', 'pub', 'beer', 'bar', 'disney', 'prime video', 'bowling', 'party'];
    const investmentKeywords = ['mutual fund', 'stock', 'share', 'sip', 'gold', 'crypto', 'bitcoin', 'etf', 'investment', 'invest', 'demat'];
    const rentKeywords = ['rent', 'landlord', 'flat', 'room', 'hostel', 'pg'];
    const educationKeywords = ['course', 'tuition', 'book', 'school', 'college', 'fee', 'fees', 'class', 'udemy', 'coursera'];
    const insuranceKeywords = ['insurance', 'premium', 'lic', 'policy', 'medical insurance', 'car insurance', 'term insurance'];
    const salaryKeywords = ['salary', 'wage', 'paycheck', 'payroll', 'stipend', 'dividend', 'interest earned', 'credit', 'refund', 'cashback', 'bonus'];

    if (salaryKeywords.some(keyword => desc.includes(keyword)) || type === 'INCOME') {
      category = 'Salary';
      subcategory = 'General';
      type = 'INCOME';
      if (desc.includes('cashback')) {
        category = 'Miscellaneous';
        subcategory = 'Cashback';
      } else if (desc.includes('dividend') || desc.includes('interest')) {
        category = 'Investment';
        subcategory = 'Dividend';
        type = 'INCOME';
      }
      return { category, subcategory, type };
    }

    type = amount > 0 ? 'INCOME' : 'EXPENSE';

    if (foodKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Food';
      subcategory = desc.includes('grocery') || desc.includes('groceries') ? 'Groceries' : 'Restaurant';
    } else if (shoppingKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Shopping';
      if (desc.includes('laptop') || desc.includes('phone') || desc.includes('electronics') || desc.includes('gadget')) {
        subcategory = 'Electronics';
      } else if (desc.includes('clothes') || desc.includes('shoes') || desc.includes('myntra')) {
        subcategory = 'Clothing';
      } else {
        subcategory = 'General';
      }
    } else if (transportationKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Transportation';
      subcategory = desc.includes('petrol') || desc.includes('diesel') || desc.includes('fuel') ? 'Fuel' : 'Cab';
    } else if (utilitiesKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Utilities';
      if (desc.includes('recharge') || desc.includes('phone') || desc.includes('mobile')) {
        subcategory = 'Mobile Recharge';
      } else if (desc.includes('electricity')) {
        subcategory = 'Electricity';
      } else if (desc.includes('internet') || desc.includes('wifi') || desc.includes('broadband')) {
        subcategory = 'Internet';
      } else {
        subcategory = 'Bills';
      }
    } else if (healthcareKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Healthcare';
      subcategory = desc.includes('medicine') || desc.includes('pharma') ? 'Medicines' : 'Doctor Consultation';
    } else if (entertainmentKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Entertainment';
      subcategory = desc.includes('netflix') || desc.includes('spotify') || desc.includes('prime') ? 'Subscriptions' : 'Outing';
    } else if (investmentKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Investment';
      subcategory = desc.includes('crypto') || desc.includes('bitcoin') ? 'Crypto' : 'Stocks/MF';
    } else if (rentKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Rent';
      subcategory = 'House Rent';
    } else if (educationKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Education';
      subcategory = 'Courses';
    } else if (insuranceKeywords.some(keyword => desc.includes(keyword))) {
      category = 'Insurance';
      subcategory = 'Premium';
    }

    return { category, subcategory, type };
  }

  /**
   * Rule-based regex NLP heuristics fallback
   */
  private static parseLocalTransactionHeuristic(text: string): Partial<ParsedTransaction> {
    const cleanText = text.trim();
    const amountRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
    const amountMatch = cleanText.match(amountRegex);
    let amount = 0;
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    const incomeKeywords = ['receive', 'credited', 'got', 'earned', 'salary', 'won', 'refund', 'cashback', 'income'];
    const isIncome = incomeKeywords.some(word => cleanText.toLowerCase().includes(word));
    const type: 'EXPENSE' | 'INCOME' = isIncome ? 'INCOME' : 'EXPENSE';

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
    } else {
      const dateRegex = /(\d{4})[-/](\d{2})[-/](\d{2})|(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;
      const dateMatch = cleanText.match(dateRegex);
      if (dateMatch) {
        if (dateMatch[1]) {
          date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        } else if (dateMatch[4]) {
          const day = dateMatch[4].padStart(2, '0');
          const month = dateMatch[5].padStart(2, '0');
          const year = dateMatch[6];
          date = `${year}-${month}-${day}`;
        }
      }
    }

    let paymentMethod = 'UPI';
    let account = 'SBI';
    if (lowerText.includes('cash')) {
      paymentMethod = 'Cash';
      account = 'Cash Wallet';
    } else if (lowerText.includes('card') || lowerText.includes('credit')) {
      paymentMethod = 'Credit Card';
      account = 'HDFC';
    } else if (lowerText.includes('sbi') || lowerText.includes('state bank')) {
      account = 'SBI';
    } else if (lowerText.includes('hdfc')) {
      account = 'HDFC';
    }

    // Heuristics for item extraction
    const itemKeywords = [
      'milk', 'paneer', 'panner', 'egg', 'carrot', 'carret', 'cornflake', 'oats', 'bread', 'butter', 'cheese', 'chicken', 'apple', 'banana', 'fruit', 
      'potato', 'onion', 'rice', 'oil', 'sugar', 'salt', 'chips', 'kurkure', 'lays', 'pizza', 'burger', 'coffee', 'tea', 'coke', 
      'shirt', 'pant', 'jeans', 'shoes', 'clothes', 'clothing', 'jacket', 'movie', 'ticket'
    ];

    const categoryKeywords: Record<string, string[]> = {
      'Groceries': ['milk', 'egg', 'paneer', 'panner', 'carrot', 'carret', 'cornflake', 'oats', 'bread', 'butter', 'cheese', 'grocery', 'groceries', 'fruit', 'apple', 'banana', 'potato', 'onion', 'rice', 'oil', 'sugar', 'salt'],
      'Eating Out/Ordering In': ['pizza', 'burger', 'restaurant', 'swiggy', 'zomato', 'starbucks', 'kfc', 'cafe', 'coffee', 'tea', 'coke'],
      'Entertainment': ['movie', 'netflix', 'cinema', 'spotify', 'entertainment', 'ticket'],
      'Shopping': ['shirt', 'pant', 'jeans', 'shoes', 'clothes', 'clothing', 'jacket']
    };

    const foundKeywords: string[] = [];
    itemKeywords.forEach(kw => {
      if (cleanText.toLowerCase().includes(kw)) {
        let displayName = kw.charAt(0).toUpperCase() + kw.slice(1);
        if (kw === 'carret') displayName = 'Carrot';
        if (kw === 'cornflake') displayName = 'Cornflakes';
        if (kw === 'egg') displayName = 'Eggs';
        if (kw === 'panner') displayName = 'Paneer';
        foundKeywords.push(displayName);
      }
    });

    const detectedCats: string[] = [];
    Object.keys(categoryKeywords).forEach(cat => {
      const match = categoryKeywords[cat].some(kw => lowerText.includes(kw));
      if (match) {
        detectedCats.push(cat);
      }
    });

    // Check if multiple categories detected
    if (detectedCats.length > 1) {
      const splitAmount = Math.abs(amount) / detectedCats.length;
      
      const transactions = detectedCats.map(cat => {
        const itemsForCat: { name: string; price: number }[] = [];
        categoryKeywords[cat].forEach(kw => {
          if (cleanText.toLowerCase().includes(kw)) {
            let displayName = kw.charAt(0).toUpperCase() + kw.slice(1);
            if (kw === 'carret') displayName = 'Carrot';
            if (kw === 'cornflake') displayName = 'Cornflakes';
            if (kw === 'egg') displayName = 'Eggs';
            if (kw === 'panner') displayName = 'Paneer';
            itemsForCat.push({ name: displayName, price: splitAmount / 2 });
          }
        });

        if (itemsForCat.length === 0) {
          itemsForCat.push({ name: cat + ' Item', price: splitAmount });
        } else {
          const avg = Math.round((splitAmount / itemsForCat.length) * 100) / 100;
          itemsForCat.forEach((it, idx) => {
            it.price = idx === itemsForCat.length - 1
              ? Math.round((splitAmount - (avg * (itemsForCat.length - 1))) * 100) / 100
              : avg;
          });
        }

        const standardCat = this.mapToStandardCategory(cat, type);
        return {
          amount: isIncome ? splitAmount : -splitAmount,
          type,
          description: standardCat,
          category: standardCat,
          subcategory: 'General',
          date,
          paymentMethod,
          account,
          tags: `${standardCat.toLowerCase()}`,
          notes: `AI Generated split category entry from local parser: "${cleanText}"`,
          items: itemsForCat
        };
      });

      return {
        amount: isIncome ? amount : -amount,
        type,
        description: detectedCats.join(' & '),
        category: 'Miscellaneous',
        subcategory: 'General',
        date,
        paymentMethod,
        account,
        transactions
      } as any;
    }

    // Single transaction logic
    let category = 'Miscellaneous';
    let description = 'Expense Item';
    const items: { name: string; price: number }[] = [];

    if (foundKeywords.length === 1) {
      const keyword = foundKeywords[0].toLowerCase();
      let matchedCat = isIncome ? 'Other Income' : 'Miscellaneous';
      for (const [cat, words] of Object.entries(categoryKeywords)) {
        if (words.includes(keyword)) {
          matchedCat = cat;
          break;
        }
      }
      category = matchedCat;
      description = foundKeywords[0];
      items.push({ name: foundKeywords[0], price: Math.abs(amount) });
    } else if (foundKeywords.length > 1) {
      // Multiple items in same/undetermined category
      category = detectedCats[0] || (isIncome ? 'Other Income' : 'Groceries');
      description = detectedCats[0] || (isIncome ? 'Income Source' : 'Groceries');
      
      const avgPrice = Math.round((Math.abs(amount) / foundKeywords.length) * 100) / 100;
      foundKeywords.forEach((name, idx) => {
        const price = idx === foundKeywords.length - 1
          ? Math.round((Math.abs(amount) - (avgPrice * (foundKeywords.length - 1))) * 100) / 100
          : avgPrice;
        items.push({ name, price });
      });
    } else {
      // No keywords found
      let fallbackDesc = cleanText
        .replace(amountRegex, '')
        .replace(/yesterday|today|day before yesterday/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      fallbackDesc = fallbackDesc
        .replace(/^(paid|deposited|withdrew|received|sent)\s+/i, '')
        .replace(/\s+for\s+/i, ' ')
        .replace(/\s+at\s+/i, ' ')
        .replace(/\s+to\s+/i, ' ')
        .replace(/\s+from\s+/i, ' ')
        .trim();
      fallbackDesc = fallbackDesc.charAt(0).toUpperCase() + fallbackDesc.slice(1);
      
      if (!fallbackDesc || fallbackDesc.length < 2) {
        fallbackDesc = isIncome ? 'Income Source' : 'Expense Item';
      }
      description = fallbackDesc;
      items.push({ name: fallbackDesc, price: Math.abs(amount) });
      category = isIncome ? 'Other Income' : 'Miscellaneous';
    }

    const standardCategory = this.mapToStandardCategory(category, type);
    return {
      amount: isIncome ? amount : -amount,
      type,
      description,
      category: standardCategory,
      subcategory: 'General',
      date,
      paymentMethod,
      account,
      tags: `${standardCategory.toLowerCase()}`,
      notes: `AI Generated from local parser: "${cleanText}"`,
      items
    };
  }

  private static parseLocalGamblingHeuristic(text: string): Partial<ParsedGamblingEntry> {
    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();

    const amountRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
    const amountMatch = cleanText.match(amountRegex);
    let amount = 0;
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    let transactionType: ParsedGamblingEntry['transactionType'] = 'BET_PLACED';
    if (lowerText.includes('deposit') || lowerText.includes('add') || lowerText.includes('loaded')) {
      transactionType = 'DEPOSIT';
    } else if (lowerText.includes('withdraw') || lowerText.includes('redeem') || lowerText.includes('payout')) {
      transactionType = 'WITHDRAWAL';
    } else if (lowerText.includes('bonus') || lowerText.includes('promo') || lowerText.includes('freebet')) {
      transactionType = 'BONUS';
    } else if (lowerText.includes('won') || lowerText.includes('win') || lowerText.includes('hit')) {
      transactionType = 'BET_WON';
    } else if (lowerText.includes('lost') || lowerText.includes('lose') || lowerText.includes('busted')) {
      transactionType = 'BET_LOST';
    } else if (lowerText.includes('cashback')) {
      transactionType = 'CASHBACK';
    } else if (lowerText.includes('refund')) {
      transactionType = 'REFUND';
    }

    let platform = 'Stake';
    const platforms = ['stake', 'bc.game', 'bcgame', '1xbet', 'bet365', 'dream11', 'mpl', 'pokerbaazi'];
    for (const p of platforms) {
      if (lowerText.includes(p)) {
        if (p === 'bcgame') platform = 'BC.Game';
        else platform = p.charAt(0).toUpperCase() + p.slice(1);
        break;
      }
    }

    let category = 'Other';
    if (lowerText.includes('ipl') || lowerText.includes('cricket') || lowerText.includes('football') || lowerText.includes('betting') || lowerText.includes('sports')) {
      category = 'Sports Betting';
    } else if (lowerText.includes('casino') || lowerText.includes('roulette') || lowerText.includes('blackjack') || lowerText.includes('slots')) {
      category = 'Casino';
    } else if (lowerText.includes('poker')) {
      category = 'Poker';
    }

    let date = new Date().toISOString().split('T')[0];
    if (lowerText.includes('yesterday')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    }

    return {
      platform,
      transactionType,
      amount,
      category,
      date,
      description: `${transactionType.replace('_', ' ')} on ${platform}`,
      notes: `AI Generated from local gambling parser: "${cleanText}"`
    };
  }

  /**
   * Calls Google Gemini API (gemini-1.5-flash) directly via https
   */
  private static parseWithGemini(text: string, type: 'transaction' | 'gambling', apiKey: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const systemInstructions = type === 'transaction'
        ? `You are an AI financial transactions parser. Analyze the user's natural language input and output a strict JSON object.
           The JSON structure MUST be:
           {
             "transactions": [
               {
                 "amount": number (positive amount),
                 "type": "EXPENSE" or "INCOME",
                 "description": string (appropriate general description),
                 "category": string (MUST be one of the standard categories listed below),
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
           VALID CATEGORIES:
           For EXPENSE type, category MUST be one of:
           - "Beauty/Wellness"
           - "Eating Out/Ordering In"
           - "Entertainment"
           - "Fitness/Sports"
           - "Fuel"
           - "Gifts"
           - "Groceries"
           - "Healthcare"
           - "Home Improvement"
           - "Loan/EMI Payments"
           - "Miscellaneous"
           - "Rent"
           - "Shopping"
           - "Skill Development"
           - "Subscriptions"
           - "Travel"
           - "Utilities/Bills"

           For INCOME type, category MUST be one of:
           - "Salary"
           - "Freelancing"
           - "Business Income"
           - "Interest"
           - "Investment Returns"
           - "Bonus"
           - "Refund"
           - "Cashback"
           - "Other Income"

           CRITICAL INSTRUCTIONS:
           1. If the input contains items from DIFFERENT categories, create SEPARATE entries in the "transactions" array for each category, splitting the total amount accordingly.
           2. The "category" field MUST be exactly one of the standard categories listed above. Do not output custom item names or custom categories.
           3. In the "items" array, list each item separately with its name and price. If individual prices are not explicitly stated, distribute the total amount realistically so that the sum of item prices equals the transaction amount.`
        : `You are an AI gambling entry parser. Analyze the user's natural language input and output a strict JSON object.
           The JSON structure MUST be:
           {
             "platform": string (e.g. "Stake", "BC.Game", "Dream11"),
             "transactionType": "DEPOSIT", "WITHDRAWAL", "BONUS", "BET_PLACED", "BET_WON", "BET_LOST", "CASHBACK", "REFUND", "COMMISSION", "ADJUSTMENT",
             "amount": number (positive),
             "category": "Sports Betting", "Casino", "Slots", "Poker", "Fantasy Sports", "Esports", "Horse Racing", "Lottery", "Other",
             "date": "YYYY-MM-DD",
             "description": string
           }`;

      const requestPayload = JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemInstructions}\n\nParse this sentence: "${text}". Current date is ${new Date().toISOString().split('T')[0]}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestPayload)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsedRes = JSON.parse(body);
            if (parsedRes.candidates && parsedRes.candidates[0] && parsedRes.candidates[0].content) {
              const textContent = parsedRes.candidates[0].content.parts[0].text;
              const content = JSON.parse(textContent.trim());
              resolve(content);
            } else {
              reject(new Error(`Gemini response error: ${JSON.stringify(parsedRes)}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(requestPayload);
      req.end();
    });
  }

  /**
   * Parses base64 encoded receipt image bytes directly with Gemini 2.0 Flash multimodal API
   */
  public static async parseReceiptImage(base64Data: string, mimeType: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const apiKey = this.getGeminiKey();
      if (!apiKey) {
        reject(new Error('Gemini API key is not configured in .env'));
        return;
      }

      const systemInstructions = `You are an expert financial receipt parser. Analyze the uploaded receipt image and extract transaction details.
You MUST output a strict JSON object with this exact structure:
{
  "description": "Short summary of purchase",
  "amount": number (positive value representing the total price of all items),
  "type": "Expense",
  "category": "Shopping", // Must map to one of: "Beauty/Wellness", "Eating Out/Ordering In", "Entertainment", "Fitness/Sports", "Fuel", "Gifts", "Groceries", "Healthcare", "Home Improvement", "Loan/EMI Payments", "Miscellaneous", "Money Transfers", "Rent", "Shopping", "Skill Development", "Subscriptions", "Travel", "Utilities/Bills"
  "subcategory": "General" or more specific subcategory string,
  "paymentMethod": "UPI", "Card", "Cash", "Net Banking",
  "account": "SBI", "HDFC", "SBI Savings",
  "merchantName": "Name of store/vendor",
  "location": "Location or city name if visible, else empty",
  "tags": "comma, separated, tags",
  "notes": "Additional info or note",
  "items": [
    { "name": "Product name 1", "price": number },
    { "name": "Product name 2", "price": number }
  ]
}`;

      const requestPayload = JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              { text: systemInstructions }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestPayload)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsedRes = JSON.parse(body);
            if (parsedRes.candidates && parsedRes.candidates[0] && parsedRes.candidates[0].content) {
              const textContent = parsedRes.candidates[0].content.parts[0].text;
              const content = JSON.parse(textContent.trim());
              resolve(content);
            } else {
              reject(new Error(`Gemini OCR response error: ${JSON.stringify(parsedRes)}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(requestPayload);
      req.end();
    });
  }
}

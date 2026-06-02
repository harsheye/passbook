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
      'milk', 'paneer', 'egg', 'carrot', 'carret', 'cornflake', 'oats', 'bread', 'butter', 'cheese', 'chicken', 'apple', 'banana', 'fruit', 
      'potato', 'onion', 'rice', 'oil', 'sugar', 'salt', 'chips', 'kurkure', 'lays', 'pizza', 'burger', 'coffee', 'tea', 'coke', 
      'shirt', 'pant', 'jeans', 'shoes', 'clothes', 'clothing', 'jacket', 'movie', 'ticket'
    ];

    const categoryKeywords: Record<string, string[]> = {
      'Grocery': ['milk', 'egg', 'paneer', 'carrot', 'carret', 'cornflake', 'oats', 'bread', 'butter', 'cheese', 'grocery', 'groceries', 'fruit', 'apple', 'banana', 'potato', 'onion', 'rice', 'oil', 'sugar', 'salt'],
      'Eating Out': ['pizza', 'burger', 'restaurant', 'swiggy', 'zomato', 'starbucks', 'kfc', 'cafe', 'coffee', 'tea', 'coke'],
      'Movies': ['movie', 'netflix', 'cinema', 'spotify', 'entertainment', 'ticket'],
      'Clothes': ['shirt', 'pant', 'jeans', 'shoes', 'clothes', 'clothing', 'jacket']
    };

    const foundKeywords: string[] = [];
    itemKeywords.forEach(kw => {
      if (cleanText.toLowerCase().includes(kw)) {
        let displayName = kw.charAt(0).toUpperCase() + kw.slice(1);
        if (kw === 'carret') displayName = 'Carrot';
        if (kw === 'cornflake') displayName = 'Cornflakes';
        if (kw === 'egg') displayName = 'Eggs';
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

        return {
          amount: isIncome ? splitAmount : -splitAmount,
          type,
          description: cat,
          category: cat,
          subcategory: 'General',
          date,
          paymentMethod,
          account,
          tags: `${cat.toLowerCase()}`,
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
      category = foundKeywords[0];
      description = foundKeywords[0];
      items.push({ name: foundKeywords[0], price: Math.abs(amount) });
    } else if (foundKeywords.length > 1) {
      // Multiple items in same/undetermined category
      category = detectedCats[0] || 'Grocery';
      description = detectedCats[0] || 'Grocery';
      
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
    }

    return {
      amount: isIncome ? amount : -amount,
      type,
      description,
      category,
      subcategory: 'General',
      date,
      paymentMethod,
      account,
      tags: `${category.toLowerCase()}`,
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
           4. In the "items" array, list each item separately with its name and price. If individual prices are not explicitly stated, distribute the total amount realistically so that the sum of item prices equals the transaction amount.`
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
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
}

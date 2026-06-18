export const getPathAndParams = (url: string) => {
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

export const getIdFromUrl = (url: string, prefix: string): string => {
  return url.replace(prefix, '').split('/')[0];
};

// Local heuristic parser fallback
export const parseLocalTransactionHeuristic = (text: string): any => {
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

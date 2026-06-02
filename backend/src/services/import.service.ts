import * as xlsx from 'xlsx';

export interface ImportMapping {
  dateCol: string;
  descriptionCol: string;
  amountCol: string;
  debitCol?: string;
  creditCol?: string;
  categoryCol?: string;
  subcategoryCol?: string;
  paymentMethodCol?: string;
  accountCol?: string;
  notesCol?: string;
  tagsCol?: string;
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
  suggestion: any;
}

export interface ValidatedImportResult {
  headers: string[];
  detectedMapping: ImportMapping;
  rows: any[]; // Raw data
  validatedTransactions: any[]; // Processed, ready to save
  errors: ImportError[];
}

export class ImportService {
  /**
   * Parses buffer from file upload into standard JSON array of objects
   */
  public static parseFile(buffer: Buffer, fileExtension: string): any[] {
    if (fileExtension.toLowerCase() === 'json') {
      try {
        return JSON.parse(buffer.toString('utf-8'));
      } catch (err) {
        throw new Error('Invalid JSON format');
      }
    }

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  }

  /**
   * Auto-detects columns and maps them to standard fields
   */
  public static detectMapping(headers: string[]): ImportMapping {
    const mapping: ImportMapping = {
      dateCol: '',
      descriptionCol: '',
      amountCol: ''
    };

    const dateKeywords = ['date', 'txn', 'time', 'trans', 'value date', 'val date', 'created'];
    const descKeywords = ['desc', 'narr', 'part', 'memo', 'details', 'remarks', 'item', 'payee'];
    const amountKeywords = ['amount', 'amt', 'value', 'total', 'price', 'sum'];
    const debitKeywords = ['debit', 'dr', 'spent', 'withdrawal', 'out'];
    const creditKeywords = ['credit', 'cr', 'received', 'deposit', 'in'];
    const catKeywords = ['category', 'cat', 'group', 'class', 'genre'];
    const subcatKeywords = ['subcat', 'subcategory', 'sub-category', 'subgroup'];
    const payKeywords = ['pay', 'method', 'mode', 'payment', 'channel'];
    const accKeywords = ['account', 'bank', 'wallet', 'acc', 'card'];
    const notesKeywords = ['note', 'notes', 'comment', 'desc2'];
    const tagsKeywords = ['tag', 'tags', 'label', 'labels'];

    const findMatch = (keywords: string[], excludes: string[] = []): string => {
      for (const h of headers) {
        const lowerH = h.toLowerCase().trim();
        if (excludes.some(ex => lowerH.includes(ex))) continue;
        if (keywords.some(kw => lowerH.includes(kw))) {
          return h;
        }
      }
      return '';
    };

    mapping.dateCol = findMatch(dateKeywords) || headers[0] || '';
    mapping.descriptionCol = findMatch(descKeywords) || headers[1] || '';
    
    const amtCol = findMatch(amountKeywords, ['debit', 'credit', 'dr', 'cr']);
    if (amtCol) {
      mapping.amountCol = amtCol;
    } else {
      const drCol = findMatch(debitKeywords);
      const crCol = findMatch(creditKeywords);
      if (drCol || crCol) {
        if (drCol) mapping.debitCol = drCol;
        if (crCol) mapping.creditCol = crCol;
        // Default amountCol to first numeric or debit/credit column
        mapping.amountCol = drCol || crCol || '';
      } else {
        mapping.amountCol = headers[2] || '';
      }
    }

    // Optional columns mapping
    const catCol = findMatch(catKeywords);
    if (catCol) mapping.categoryCol = catCol;

    const subcatCol = findMatch(subcatKeywords);
    if (subcatCol) mapping.subcategoryCol = subcatCol;

    const payCol = findMatch(payKeywords);
    if (payCol) mapping.paymentMethodCol = payCol;

    const accCol = findMatch(accKeywords);
    if (accCol) mapping.accountCol = accCol;

    const notesCol = findMatch(notesKeywords);
    if (notesCol) mapping.notesCol = notesCol;

    const tagsCol = findMatch(tagsKeywords);
    if (tagsCol) mapping.tagsCol = tagsCol;

    return mapping;
  }

  /**
   * Validates and cleans raw imported rows using a custom mapping
   */
  public static validateAndMap(rows: any[], mapping: ImportMapping, existingTxnKeys: Set<string>): { validatedTransactions: any[]; errors: ImportError[] } {
    const validatedTransactions: any[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      let dateVal = row[mapping.dateCol];
      let descVal = row[mapping.descriptionCol] || '';
      let amountVal = 0.0;
      let hasAmountError = false;

      // Extract Amount (support debit/credit splitting or single column)
      if (mapping.debitCol || mapping.creditCol) {
        let debit = 0.0;
        let credit = 0.0;
        
        if (mapping.debitCol && row[mapping.debitCol] !== undefined && row[mapping.debitCol] !== '') {
          const val = parseFloat(String(row[mapping.debitCol]).replace(/[^\d.-]/g, ''));
          if (!isNaN(val)) debit = Math.abs(val);
        }
        if (mapping.creditCol && row[mapping.creditCol] !== undefined && row[mapping.creditCol] !== '') {
          const val = parseFloat(String(row[mapping.creditCol]).replace(/[^\d.-]/g, ''));
          if (!isNaN(val)) credit = Math.abs(val);
        }

        if (credit > 0 && debit > 0) {
          // Both are loaded, net them out
          amountVal = credit - debit;
        } else if (credit > 0) {
          amountVal = credit; // Income
        } else if (debit > 0) {
          amountVal = -debit; // Expense
        } else {
          // Zero or missing
          amountVal = 0.0;
        }
      } else {
        const rawAmt = row[mapping.amountCol];
        if (rawAmt === undefined || rawAmt === '') {
          errors.push({
            row: rowNum,
            field: 'amount',
            value: rawAmt,
            message: 'Amount field is empty',
            suggestion: -100.0
          });
          hasAmountError = true;
        } else {
          // Remove currency symbols, commas
          const cleanedAmt = String(rawAmt).replace(/[^\d.-]/g, '');
          const val = parseFloat(cleanedAmt);
          if (isNaN(val)) {
            errors.push({
              row: rowNum,
              field: 'amount',
              value: rawAmt,
              message: 'Invalid numeric value for amount',
              suggestion: -100.0
            });
            hasAmountError = true;
          } else {
            amountVal = val;
          }
        }
      }

      // Extract and Validate Date
      let parsedDate = new Date();
      let hasDateError = false;

      if (!dateVal || dateVal === '') {
        errors.push({
          row: rowNum,
          field: 'date',
          value: dateVal,
          message: 'Date is missing',
          suggestion: new Date().toISOString().split('T')[0]
        });
        hasDateError = true;
      } else {
        // Handle Excel Date Numbers (number of days since 1900-01-01)
        if (typeof dateVal === 'number') {
          parsedDate = new Date((dateVal - 25569) * 86400 * 1000);
        } else {
          // Standard date parse
          const dateStr = String(dateVal).trim();
          parsedDate = new Date(dateStr);
          
          // Fallback parsing for DD/MM/YYYY
          if (isNaN(parsedDate.getTime())) {
            const parts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
            if (parts) {
              const day = parseInt(parts[1], 10);
              const month = parseInt(parts[2], 10) - 1; // 0-indexed
              const year = parseInt(parts[3], 10);
              parsedDate = new Date(year, month, day);
            }
          }
        }

        if (isNaN(parsedDate.getTime())) {
          errors.push({
            row: rowNum,
            field: 'date',
            value: dateVal,
            message: 'Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY',
            suggestion: new Date().toISOString().split('T')[0]
          });
          hasDateError = true;
        }
      }

      // Check Description
      if (!descVal || String(descVal).trim() === '') {
        descVal = amountVal >= 0 ? 'Imported Income' : 'Imported Expense';
      }

      // Detect duplicates inside the database based on exact composite keys (date + description + amount)
      const txnKey = `${parsedDate.toISOString().split('T')[0]}_${String(descVal).trim().toLowerCase()}_${amountVal.toFixed(2)}`;
      let isDuplicate = false;
      if (existingTxnKeys.has(txnKey)) {
        errors.push({
          row: rowNum,
          field: 'duplicate',
          value: descVal,
          message: 'Possible duplicate transaction already exists in database',
          suggestion: 'Skip importing this record'
        });
        isDuplicate = true;
      }

      // Push to validated if no critical parsing errors
      if (!hasDateError && !hasAmountError && !isDuplicate) {
        const categoryVal = mapping.categoryCol ? row[mapping.categoryCol] : '';
        const subcategoryVal = mapping.subcategoryCol ? row[mapping.subcategoryCol] : '';
        const paymentMethodVal = mapping.paymentMethodCol ? row[mapping.paymentMethodCol] : 'Imported';
        const accountVal = mapping.accountCol ? row[mapping.accountCol] : 'Imported Wallet';
        const notesVal = mapping.notesCol ? row[mapping.notesCol] : '';
        const tagsVal = mapping.tagsCol ? row[mapping.tagsCol] : '';

        validatedTransactions.push({
          date: parsedDate,
          description: String(descVal).trim(),
          amount: amountVal,
          type: amountVal >= 0 ? 'INCOME' : 'EXPENSE',
          category: String(categoryVal).trim() || 'Miscellaneous',
          subcategory: String(subcategoryVal).trim() || 'General',
          paymentMethod: String(paymentMethodVal).trim(),
          account: String(accountVal).trim(),
          notes: String(notesVal).trim() || 'Imported Transaction',
          tags: String(tagsVal).trim(),
        });
      }
    });

    return { validatedTransactions, errors };
  }
}

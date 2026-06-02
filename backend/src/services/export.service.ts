import * as xlsx from 'xlsx';

export class ExportService {
  /**
   * Generates a CSV string from transactions array
   */
  public static exportToCSV(data: any[]): string {
    const flattened = this.flattenTransactions(data);
    const worksheet = xlsx.utils.json_to_sheet(flattened);
    return xlsx.utils.sheet_to_csv(worksheet);
  }

  /**
   * Generates an Excel XLSX buffer from transactions array
   */
  public static exportToXLSX(data: any[], sheetName = 'Transactions'): Buffer {
    const flattened = this.flattenTransactions(data);
    const worksheet = xlsx.utils.json_to_sheet(flattened);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Generates a JSON string
   */
  public static exportToJSON(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Flattens complex transaction structures for simple tabular exports
   */
  private static flattenTransactions(data: any[]): any[] {
    return data.map((t, idx) => {
      const dateVal = t.transactionDate || t.date;
      const noteVal = t.note || t.notes;
      const paymentMethodVal = t.paymentMethod;
      const accountVal = t.accountId || t.account;
      
      let categoryName = 'Miscellaneous';
      if (t.category) {
        categoryName = typeof t.category === 'object' ? t.category.name : t.category;
      }

      let parsedTags = '';
      if (t.tags) {
        try {
          const arr = JSON.parse(t.tags);
          if (Array.isArray(arr)) parsedTags = arr.join(', ');
          else parsedTags = String(t.tags);
        } catch {
          parsedTags = String(t.tags);
        }
      }

      return {
        'S.No': idx + 1,
        'Transaction ID': t.id || '',
        'Date': dateVal ? new Date(dateVal).toISOString().split('T')[0] : '',
        'Description': t.description || '',
        'Amount': t.amount || 0.0,
        'Type': t.transactionType || t.type || '',
        'Category': categoryName,
        'Merchant Name': t.merchantName || '',
        'Location': t.location || '',
        'Payment Method': paymentMethodVal || '',
        'Account': accountVal || '',
        'Mood': t.mood || '',
        'Notes': noteVal || '',
        'Tags': parsedTags,
        'Is Favorite': t.favorite ? 'Yes' : 'No',
        'Created At': t.createdAt ? new Date(t.createdAt).toISOString() : ''
      };
    });
  }

  /**
   * Flattens gambling records for tabular exports
   */
  public static exportGamblingToCSV(data: any[]): string {
    const flattened = this.flattenGambling(data);
    const worksheet = xlsx.utils.json_to_sheet(flattened);
    return xlsx.utils.sheet_to_csv(worksheet);
  }

  public static exportGamblingToXLSX(data: any[], sheetName = 'Gambling Records'): Buffer {
    const flattened = this.flattenGambling(data);
    const worksheet = xlsx.utils.json_to_sheet(flattened);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private static flattenGambling(data: any[]): any[] {
    return data.map((e, idx) => ({
      'S.No': idx + 1,
      'Entry ID': e.id || '',
      'Platform': e.platform ? e.platform.name : '',
      'Transaction Type': e.transactionType || '',
      'Amount': e.amount || 0.0,
      'Currency': e.currency || 'INR',
      'Date': e.date ? new Date(e.date).toISOString().split('T')[0] : '',
      'Description': e.description || '',
      'Reference ID': e.referenceId || '',
      'Category': e.category || 'Other',
      'Notes': e.notes || ''
    }));
  }
}

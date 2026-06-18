import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIService } from '../services/ai.service';
import { ImportService, ImportMapping } from '../services/import.service';
import { ExportService } from '../services/export.service';

const prisma = new PrismaClient();

export class TransactionController {
  /**
   * Helper to retrieve or create a category ID dynamically by name
   */
  private static async getOrCreateCategory(categoryName: string): Promise<string> {
    const cleanName = (categoryName || 'Miscellaneous').trim();
    
    // Find category
    let category = await prisma.category.findUnique({
      where: { name: cleanName }
    });

    // If not found, create a new one dynamically
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: cleanName,
          icon: 'HelpCircle',
          color: '#6b7280',
          isSystem: false
        }
      });
    }

    return category.id;
  }

  /**
   * Helper to parse date filters from quick ranges
   */
  private static getDateRange(quickFilter?: string, start?: string, end?: string): { gte?: Date; lte?: Date } {
    const range: { gte?: Date; lte?: Date } = {};

    if (start) range.gte = new Date(start);
    if (end) range.lte = new Date(end);

    if (quickFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (quickFilter.toUpperCase()) {
        case 'TODAY':
          range.gte = today;
          break;
        case 'THIS_WEEK':
          const dayOfWeek = today.getDay();
          const sunday = new Date(today);
          sunday.setDate(today.getDate() - dayOfWeek);
          range.gte = sunday;
          break;
        case 'THIS_MONTH':
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          range.gte = firstDayOfMonth;
          break;
        case 'LAST_MONTH':
          const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
          range.gte = firstDayLastMonth;
          range.lte = lastDayLastMonth;
          break;
        case 'LAST_3_MONTHS':
          const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
          range.gte = threeMonthsAgo;
          break;
        case 'THIS_YEAR':
          const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
          range.gte = firstDayOfYear;
          break;
      }
    }

    return range;
  }

  /**
   * List all transactions with advanced filtering, sorting, and search
   */
  public static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        search,
        type,
        category,
        account,
        paymentMethod,
        tag,
        minAmount,
        maxAmount,
        quickFilter,
        startDate,
        endDate,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      // Build filters
      const where: any = { userId };

      // Date Filters mapped to transactionDate column
      const dateRange = TransactionController.getDateRange(
        quickFilter as string,
        startDate as string,
        endDate as string
      );
      if (dateRange.gte || dateRange.lte) {
        where.transactionDate = {};
        if (dateRange.gte) where.transactionDate.gte = dateRange.gte;
        if (dateRange.lte) where.transactionDate.lte = dateRange.lte;
      }

      // Amount Range
      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount.gte = parseFloat(minAmount as string);
        if (maxAmount) where.amount.lte = parseFloat(maxAmount as string);
      }

      // Categorical and exact matches
      if (type) {
        where.transactionType = {
          equals: type as string,
        };
      }
      
      if (category) {
        where.category = {
          name: category as string
        };
      }

      if (account) where.accountId = account as string;
      if (paymentMethod) where.paymentMethod = paymentMethod as string;

      // Tag filter on SQLite JSON text contains
      if (tag) {
        where.tags = { contains: tag as string };
      }

      // Search across Description, note, location, merchantName
      if (search) {
        const searchStr = search as string;
        where.OR = [
          { description: { contains: searchStr } },
          { note: { contains: searchStr } },
          { location: { contains: searchStr } },
          { merchantName: { contains: searchStr } },
          { tags: { contains: searchStr } }
        ];
      }

      // Sort by mapped date
      const dbSortBy = sortBy === 'date' ? 'transactionDate' : sortBy as string;

      // Fetch with full Category and Receipts relations
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true,
          receipts: true
        },
        orderBy: {
          [dbSortBy]: (sortOrder as string).toLowerCase() === 'asc' ? 'asc' : 'desc'
        }
      });

      // Legacy fallback: Inject category field as string so frontend requires zero breakages
      const mapped = transactions.map(t => {
        const plain = JSON.parse(JSON.stringify(t));
        return {
          ...plain,
          category: t.category.name,
          categoryDetails: t.category,
          date: t.transactionDate, // Legacy dates alias
          notes: t.note // Legacy notes alias
        };
      });

      return res.json(mapped);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create manual transaction
   */
  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        date,
        description,
        amount,
        type,
        category,
        subcategory,
        paymentMethod,
        account,
        notes,
        tags,
        
        // New Better UX Fields
        merchantName,
        location,
        mood,
        splitTransaction,
        reminderDate,
        warrantyExpiry,
        favorite = false,
        aiSuggestedCategory,
        receipts = [] // Multiple uploaded files URLs
      } = req.body;

      if (amount === undefined || !type || !category) {
        return res.status(400).json({ error: 'Amount, type, and category are required' });
      }

      const catId = await TransactionController.getOrCreateCategory(category);

      // Parse tags
      let parsedTags = '';
      if (tags) {
        parsedTags = Array.isArray(tags) ? JSON.stringify(tags) : String(tags);
      } else {
        parsedTags = JSON.stringify([category.toLowerCase()]);
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId,
          transactionDate: date ? new Date(date) : new Date(),
          description: description || `${type} Entry`,
          amount: parseFloat(amount),
          transactionType: type, // "Expense", "Income", "Transfer", "Gambling"
          categoryId: catId,
          subcategoryId: subcategory || 'General',
          paymentMethod: paymentMethod || 'Cash',
          accountId: account || 'Wallet',
          location: location || '',
          merchantName: merchantName || '',
          currency: 'INR',
          note: notes || '',
          tags: parsedTags,
          receiptCount: receipts.length,

          // Advanced UX fields
          mood: mood || 'Neutral',
          splitTransaction: splitTransaction || '',
          reminderDate: reminderDate ? new Date(reminderDate) : null,
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
          favorite: Boolean(favorite),
          aiSuggestedCategory: aiSuggestedCategory || ''
        },
        include: {
          category: true
        }
      });

      // Write receipts if attached
      if (Array.isArray(receipts) && receipts.length > 0) {
        for (const fileUrl of receipts) {
          const fileName = fileUrl.split('/').pop() || 'receipt.jpg';
          await prisma.transactionReceipt.create({
            data: {
              transactionId: transaction.id,
              fileName,
              fileUrl,
              fileType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
            }
          });
        }
      }

      const plainTxn = JSON.parse(JSON.stringify(transaction));
      return res.status(201).json({
        ...plainTxn,
        category: transaction.category.name,
        date: transaction.transactionDate,
        notes: transaction.note
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * AI-powered expense creation via conversational text
   */
  public static async createAI(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text input is required for AI parsing' });
      }

      const parsed = await AIService.parseTransaction(text);
      const parsedTransactions = (parsed as any).transactions || [parsed];

      if (parsedTransactions.length === 0 || parsedTransactions[0].amount === undefined) {
        return res.status(422).json({
          error: 'AI was unable to parse amount. Please input manually.',
          parsedInfo: parsed
        });
      }

      const simulatedTransactions = [];

      for (const pt of parsedTransactions) {
        const categoryName = pt.category || 'Miscellaneous';
        const type = pt.type || 'Expense';
        const signedAmt = type === 'Expense' ? -Math.abs(pt.amount) : Math.abs(pt.amount);

        simulatedTransactions.push({
          id: `ai-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          transactionDate: pt.date ? new Date(pt.date) : new Date(),
          date: pt.date || new Date().toISOString().split('T')[0],
          description: pt.description || 'AI Generated Entry',
          amount: signedAmt,
          transactionType: type,
          category: categoryName,
          subcategoryId: pt.subcategory || 'General',
          paymentMethod: pt.paymentMethod || 'UPI',
          accountId: pt.account || 'SBI',
          location: pt.location || '',
          merchantName: pt.merchantName || '',
          currency: 'INR',
          note: pt.notes || `AI Parsed Statement: "${text}"`,
          tags: JSON.stringify([categoryName.toLowerCase()]),
          items: pt.items || [
            { name: pt.description || 'General Item', price: Math.abs(signedAmt) }
          ]
        });
      }

      return res.status(200).json({
        message: 'Transaction successfully parsed by AI',
        transactions: simulatedTransactions,
        transaction: simulatedTransactions[0] // Backward compatibility
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update transaction
   */
  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const data = req.body;

      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(404).json({ error: 'Transaction not found or unauthorized' });
      }

      // Map dynamic fields
      const updateData: any = {};
      
      if (data.description !== undefined) updateData.description = data.description;
      if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
      if (data.type !== undefined) updateData.transactionType = data.type;
      
      if (data.category) {
        updateData.categoryId = await TransactionController.getOrCreateCategory(data.category);
      }
      
      if (data.subcategory !== undefined) updateData.subcategoryId = data.subcategory;
      if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
      if (data.account !== undefined) updateData.accountId = data.account;
      if (data.notes !== undefined) updateData.note = data.notes;
      
      if (data.date) {
        updateData.transactionDate = new Date(data.date);
      }

      // UX and better fields
      if (data.merchantName !== undefined) updateData.merchantName = data.merchantName;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.mood !== undefined) updateData.mood = data.mood;
      if (data.splitTransaction !== undefined) updateData.splitTransaction = data.splitTransaction;
      if (data.reminderDate !== undefined) updateData.reminderDate = data.reminderDate ? new Date(data.reminderDate) : null;
      if (data.warrantyExpiry !== undefined) updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;
      if (data.favorite !== undefined) updateData.favorite = Boolean(data.favorite);

      if (data.tags !== undefined) {
        updateData.tags = Array.isArray(data.tags) ? JSON.stringify(data.tags) : String(data.tags);
      }

      const updated = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: true
        }
      });

      const plainUpdated = JSON.parse(JSON.stringify(updated));
      return res.json({
        ...plainUpdated,
        category: updated.category.name,
        date: updated.transactionDate,
        notes: updated.note
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete single transaction
   */
  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      await prisma.transaction.delete({ where: { id } });
      return res.json({ message: 'Transaction successfully deleted' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Bulk delete transactions
   */
  public static async bulkDelete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Transaction IDs array is required' });
      }

      const result = await prisma.transaction.deleteMany({
        where: {
          userId,
          id: { in: ids }
        }
      });

      return res.json({
        message: `Successfully deleted ${result.count} transactions`,
        count: result.count
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handles file upload, parses sheets, auto-detects columns and returns analysis for mapping
   */
  public static async uploadFile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileExt = req.file.originalname.split('.').pop() || '';
      const rawRows = ImportService.parseFile(req.file.buffer, fileExt);

      if (rawRows.length === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty' });
      }

      const headers = Object.keys(rawRows[0]);
      const detectedMapping = ImportService.detectMapping(headers);

      return res.json({
        filename: req.file.originalname,
        headers,
        detectedMapping,
        totalRows: rawRows.length,
        previewRows: rawRows.slice(0, 5)
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Validates mapped data before saving
   */
  public static async validateImport(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { fileData, mapping } = req.body;

      if (!fileData || !Array.isArray(fileData) || !mapping) {
        return res.status(400).json({ error: 'fileData and column mapping configuration are required' });
      }

      const existing = await prisma.transaction.findMany({
        where: { userId },
        select: { transactionDate: true, description: true, amount: true }
      });

      const existingKeys = new Set(
        existing.map(e => `${e.transactionDate.toISOString().split('T')[0]}_${(e.description || '').toLowerCase().trim()}_${e.amount.toFixed(2)}`)
      );

      const validation = ImportService.validateAndMap(fileData, mapping as ImportMapping, existingKeys);

      return res.json({
        validCount: validation.validatedTransactions.length,
        errorCount: validation.errors.length,
        errors: validation.errors,
        validatedRowsPreview: validation.validatedTransactions.slice(0, 5)
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Finalizes import
   */
  public static async finalizeImport(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { fileData, mapping } = req.body;

      if (!fileData || !Array.isArray(fileData) || !mapping) {
        return res.status(400).json({ error: 'fileData and column mapping configuration are required' });
      }

      const existing = await prisma.transaction.findMany({
        where: { userId },
        select: { transactionDate: true, description: true, amount: true }
      });

      const existingKeys = new Set(
        existing.map(e => `${e.transactionDate.toISOString().split('T')[0]}_${(e.description || '').toLowerCase().trim()}_${e.amount.toFixed(2)}`)
      );

      const validation = ImportService.validateAndMap(fileData, mapping as ImportMapping, existingKeys);

      if (validation.validatedTransactions.length === 0) {
        return res.status(400).json({ error: 'No valid rows found to import' });
      }

      // Save transactions, resolving Category IDs dynamically
      const createdCount = 0;
      const createdTxns = [];

      for (const t of validation.validatedTransactions) {
        const catId = await TransactionController.getOrCreateCategory(t.category);
        const tagsStr = t.tags ? JSON.stringify(t.tags.split(',')) : JSON.stringify([t.category.toLowerCase()]);
        
        const created = await prisma.transaction.create({
          data: {
            userId,
            transactionDate: t.date,
            description: t.description,
            amount: t.amount,
            transactionType: t.type === 'INCOME' ? 'Income' : 'Expense',
            categoryId: catId,
            subcategoryId: t.subcategory || 'General',
            paymentMethod: t.paymentMethod || 'UPI',
            accountId: t.account || 'Wallet',
            note: t.notes || '',
            tags: tagsStr,
            currency: 'INR'
          }
        });
        createdTxns.push(created);
      }

      return res.status(201).json({
        message: `Successfully imported ${createdTxns.length} transactions`,
        count: createdTxns.length
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Exports filtered transactions to CSV, XLSX or JSON format
   */
  public static async exportData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        format = 'csv',
        search,
        type,
        category,
        minAmount,
        maxAmount,
        startDate,
        endDate
      } = req.query;

      const where: any = { userId };
      if (type) where.transactionType = type as string;
      
      if (category) {
        where.category = {
          name: category as string
        };
      }

      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount.gte = parseFloat(minAmount as string);
        if (maxAmount) where.amount.lte = parseFloat(maxAmount as string);
      }
      
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = new Date(startDate as string);
        if (endDate) where.transactionDate.lte = new Date(endDate as string);
      }

      if (search) {
        const searchStr = search as string;
        where.OR = [
          { description: { contains: searchStr } },
          { note: { contains: searchStr } },
          { location: { contains: searchStr } },
          { merchantName: { contains: searchStr } }
        ];
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true
        },
        orderBy: { transactionDate: 'desc' }
      });

      const fileFormat = (format as string).toLowerCase();

      if (fileFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.json');
        return res.send(ExportService.exportToJSON(transactions));
      } else if (fileFormat === 'xlsx') {
        const xlsxBuffer = ExportService.exportToXLSX(transactions);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.xlsx');
        return res.send(xlsxBuffer);
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
        return res.send(ExportService.exportToCSV(transactions));
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

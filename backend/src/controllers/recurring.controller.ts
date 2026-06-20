import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class RecurringController {
  /**
   * Get all recurring transaction schedules
   */
  public static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const schedules = await prisma.recurringTransaction.findMany({
        where: { userId }
      });
      return res.json(schedules);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create a recurring transaction schedule
   */
  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        description,
        amount,
        type,
        category,
        subcategory,
        paymentMethod,
        account,
        frequency,
        startDate,
        endDate,
        notes,
        tags
      } = req.body;

      if (!description || amount === undefined || !type || !category || !frequency || !startDate) {
        return res.status(400).json({
          error: 'Description, amount, type, category, frequency, and startDate are required'
        });
      }

      const valAmount = parseFloat(amount);
      const parsedStartDate = new Date(startDate);
      
      // Calculate first nextRunDate (could be today or in the future)
      let nextRunDate = new Date(parsedStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If startDate is in the past, align it or keep it to execute immediately on next tick
      if (nextRunDate < today) {
        nextRunDate = today;
      }

      // If DAILY with target weekdays, align nextRunDate to first matching weekday
      if (frequency.toUpperCase() === 'DAILY' && tags && (tags as string).trim() !== '') {
        const targetDays = (tags as string).split(',').map((s: string) => s.trim().toLowerCase());
        const dayMap: { [key: string]: number } = {
          'sun': 0, 'sunday': 0,
          'mon': 1, 'monday': 1,
          'tue': 2, 'tuesday': 2,
          'wed': 3, 'wednesday': 3,
          'thu': 4, 'thursday': 4,
          'fri': 5, 'friday': 5,
          'sat': 6, 'saturday': 6
        };
        const targetIndices = targetDays.map((d: string) => dayMap[d]).filter((v: number | undefined) => v !== undefined);
        if (targetIndices.length > 0 && !targetIndices.includes(nextRunDate.getDay())) {
          nextRunDate = calculateNextRunDate(nextRunDate, 'DAILY', tags);
        }
      }

      const schedule = await prisma.recurringTransaction.create({
        data: {
          userId,
          description,
          amount: valAmount,
          type: type.toUpperCase(),
          category,
          subcategory: subcategory || 'General',
          paymentMethod: paymentMethod || 'Direct Debit',
          account: account || 'SBI',
          frequency: frequency.toUpperCase(), // "DAILY", "WEEKLY", "MONTHLY"
          startDate: parsedStartDate,
          endDate: endDate ? new Date(endDate) : null,
          nextRunDate,
          notes: notes || '',
          tags: tags || ''
        }
      });

      return res.status(201).json(schedule);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cancel and delete recurring schedule
   */
  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const schedule = await prisma.recurringTransaction.findFirst({
        where: { id, userId }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Recurring schedule not found or unauthorized' });
      }

      await prisma.recurringTransaction.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });
      return res.json({ message: 'Recurring transaction schedule cancelled and marked as completed' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update an existing recurring schedule
   */
  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const {
        description,
        amount,
        type,
        category,
        subcategory,
        paymentMethod,
        account,
        frequency,
        startDate,
        endDate,
        notes,
        tags,
        nextRunDate
      } = req.body;

      const schedule = await prisma.recurringTransaction.findFirst({
        where: { id, userId }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Recurring schedule not found or unauthorized' });
      }

      const updated = await prisma.recurringTransaction.update({
        where: { id },
        data: {
          description: description !== undefined ? description : schedule.description,
          amount: amount !== undefined ? parseFloat(amount) : schedule.amount,
          type: type !== undefined ? type.toUpperCase() : schedule.type,
          category: category !== undefined ? category : schedule.category,
          subcategory: subcategory !== undefined ? subcategory : schedule.subcategory,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : schedule.paymentMethod,
          account: account !== undefined ? account : schedule.account,
          frequency: frequency !== undefined ? frequency.toUpperCase() : schedule.frequency,
          startDate: startDate !== undefined ? new Date(startDate) : schedule.startDate,
          endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : schedule.endDate,
          nextRunDate: nextRunDate !== undefined ? new Date(nextRunDate) : schedule.nextRunDate,
          notes: notes !== undefined ? notes : schedule.notes,
          tags: tags !== undefined ? tags : schedule.tags
        }
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Approve a schedule occurrence: create transaction and advance nextRunDate
   */
  public static async approve(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const schedule = await prisma.recurringTransaction.findFirst({
        where: { id, userId }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Recurring schedule not found or unauthorized' });
      }

      // 1. Resolve category
      const cleanName = (schedule.category || 'Miscellaneous').trim();
      let category = await prisma.category.findUnique({
        where: { name: cleanName }
      });
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

      // 2. Create transaction record
      const numAmount = Math.abs(schedule.amount);
      const signedAmt = schedule.type === 'EXPENSE' ? -numAmount : numAmount;

      const today = new Date();
      const schedDate = new Date(schedule.nextRunDate);
      schedDate.setHours(0, 0, 0, 0);
      const compareToday = new Date(today);
      compareToday.setHours(0, 0, 0, 0);
      const isOverdue = compareToday.getTime() > schedDate.getTime();
      const statusSuffix = isOverdue ? '[Overdue]' : '[On-time]';

      const baseNote = schedule.notes ? `${schedule.notes} ` : '';
      const finalNote = `${baseNote}[Schedule ID: ${schedule.id}] ${statusSuffix}`;

      const newTxn = await prisma.transaction.create({
        data: {
          userId: schedule.userId,
          transactionDate: new Date(),
          description: `${schedule.description} (Recurring)`,
          amount: signedAmt,
          transactionType: schedule.type === 'INCOME' ? 'Income' : 'Expense',
          categoryId: category.id,
          subcategoryId: schedule.subcategory || 'General',
          paymentMethod: schedule.paymentMethod || 'Direct Debit',
          accountId: schedule.account || 'SBI',
          note: finalNote,
          tags: schedule.tags || ''
        }
      });

      // 3. Calculate next run date
      const nextRunDate = calculateNextRunDate(schedule.nextRunDate, schedule.frequency, schedule.tags || '');

      // 4. Update schedule
      const updatedSchedule = await prisma.recurringTransaction.update({
        where: { id },
        data: {
          lastRunDate: new Date(),
          nextRunDate
        }
      });

      return res.json({ transaction: newTxn, schedule: updatedSchedule });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Skip a schedule occurrence: advance nextRunDate without creating transaction
   */
  public static async skip(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const schedule = await prisma.recurringTransaction.findFirst({
        where: { id, userId }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Recurring schedule not found or unauthorized' });
      }

      // 1. Calculate next run date
      const nextRunDate = calculateNextRunDate(schedule.nextRunDate, schedule.frequency, schedule.tags || '');

      // 2. Update schedule
      const updatedSchedule = await prisma.recurringTransaction.update({
        where: { id },
        data: {
          nextRunDate
        }
      });

      return res.json({ schedule: updatedSchedule });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

function calculateNextRunDate(currentDate: Date, frequency: string, tags: string): Date {
  const nextDate = new Date(currentDate);
  nextDate.setHours(0, 0, 0, 0);

  if (frequency === 'DAILY') {
    if (tags && tags.trim() !== '') {
      // Tags contain specific days of week, e.g., "Mon, Wed, Fri"
      const targetDays = tags.split(',').map(s => s.trim().toLowerCase());
      const dayMap: { [key: string]: number } = {
        'sun': 0, 'sunday': 0,
        'mon': 1, 'monday': 1,
        'tue': 2, 'tuesday': 2,
        'wed': 3, 'wednesday': 3,
        'thu': 4, 'thursday': 4,
        'fri': 5, 'friday': 5,
        'sat': 6, 'saturday': 6
      };
      
      const targetIndices = targetDays.map(d => dayMap[d]).filter(v => v !== undefined);
      if (targetIndices.length > 0) {
        // Advance day by day until we match one of targetIndices
        for (let i = 1; i <= 7; i++) {
          const temp = new Date(currentDate);
          temp.setDate(temp.getDate() + i);
          if (targetIndices.includes(temp.getDay())) {
            return temp;
          }
        }
      }
    }
    // Default DAILY
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  } else if (frequency === 'WEEKLY') {
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  } else if (frequency === 'MONTHLY') {
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  } else if (frequency === 'YEARLY') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    return nextDate;
  }
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}

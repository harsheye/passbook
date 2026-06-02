import { PrismaClient } from '@prisma/client';

export class SchedulerService {
  private static prisma = new PrismaClient();

  /**
   * Processes all active recurring transactions whose nextRunDate has arrived
   */
  public static async processRecurringTransactions(): Promise<number> {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Up to end of today

    // Fetch active schedules that need running
    const schedules = await this.prisma.recurringTransaction.findMany({
      where: {
        nextRunDate: {
          lte: today
        },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      }
    });

    let createdCount = 0;

    for (const schedule of schedules) {
      let currentRunDate = new Date(schedule.nextRunDate);

      // Loop to handle cases where multiple instances were missed (e.g. system was offline)
      while (currentRunDate <= today) {
        // Resolve category
        const cleanName = (schedule.category || 'Miscellaneous').trim();
        let category = await this.prisma.category.findUnique({
          where: { name: cleanName }
        });
        if (!category) {
          category = await this.prisma.category.create({
            data: {
              name: cleanName,
              icon: 'HelpCircle',
              color: '#6b7280',
              isSystem: false
            }
          });
        }

        // 1. Create the transaction
        await this.prisma.transaction.create({
          data: {
            userId: schedule.userId,
            transactionDate: new Date(currentRunDate),
            description: `${schedule.description} (Recurring)`,
            amount: schedule.amount,
            transactionType: schedule.type === 'INCOME' ? 'Income' : 'Expense',
            categoryId: category.id,
            subcategoryId: schedule.subcategory || 'General',
            paymentMethod: schedule.paymentMethod || 'Cash',
            accountId: schedule.account || 'Wallet',
            note: schedule.notes || `Automatically generated from schedule ID: ${schedule.id}`,
            tags: schedule.tags || ''
          }
        });

        createdCount++;

        // 2. Advance the run date based on frequency
        const nextDate = new Date(currentRunDate);
        if (schedule.frequency === 'DAILY') {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (schedule.frequency === 'WEEKLY') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (schedule.frequency === 'MONTHLY') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          // Fallback monthly
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        currentRunDate = nextDate;

        // Break if it exceeds today or is past the endDate
        if (schedule.endDate && nextDate > schedule.endDate) {
          break;
        }
      }

      // 3. Update the schedule nextRunDate in the DB
      await this.prisma.recurringTransaction.update({
        where: { id: schedule.id },
        data: {
          lastRunDate: new Date(),
          nextRunDate: currentRunDate
        }
      });
    }

    return createdCount;
  }
}

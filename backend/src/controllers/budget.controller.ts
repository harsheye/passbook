import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class BudgetController {
  /**
   * Get budgets for a specific month and year
   */
  public static async getBudgets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const today = new Date();
      const month = req.query.month ? parseInt(req.query.month as string) : today.getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string) : today.getFullYear();

      // Fetch all budgets
      const budgets = await prisma.budget.findMany({
        where: {
          userId,
          month,
          year
        }
      });

      // Calculate total spending by category for the given month/year
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const expenses = await prisma.transaction.findMany({
        where: {
          userId,
          transactionType: 'Expense',
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          category: true
        }
      });

      // Sum spending by category
      const spendingByCategory: Record<string, number> = {};
      expenses.forEach(e => {
        const amt = Math.abs(e.amount);
        const catName = e.category.name;
        spendingByCategory[catName] = (spendingByCategory[catName] || 0) + amt;
      });

      // Merge budget cap with actual spent
      const mergedBudgets = budgets.map(b => ({
        id: b.id,
        category: b.category,
        limitAmount: b.amount,
        spentAmount: spendingByCategory[b.category] || 0.0,
        month: b.month,
        year: b.year
      }));

      return res.json(mergedBudgets);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Set or update budget for a category
   */
  public static async setBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { category, amount, month, year } = req.body;

      if (!category || amount === undefined) {
        return res.status(400).json({ error: 'Category and amount are required' });
      }

      const today = new Date();
      const budgetMonth = month !== undefined ? parseInt(month) : today.getMonth() + 1;
      const budgetYear = year !== undefined ? parseInt(year) : today.getFullYear();
      const budgetLimit = parseFloat(amount);

      // Create or update budget using upsert syntax
      const budget = await prisma.budget.upsert({
        where: {
          userId_category_month_year: {
            userId,
            category,
            month: budgetMonth,
            year: budgetYear
          }
        },
        update: {
          amount: budgetLimit
        },
        create: {
          userId,
          category,
          amount: budgetLimit,
          month: budgetMonth,
          year: budgetYear
        }
      });

      return res.status(200).json(budget);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete a budget limit
   */
  public static async deleteBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const budget = await prisma.budget.findFirst({
        where: { id, userId }
      });

      if (!budget) {
        return res.status(404).json({ error: 'Budget not found or unauthorized' });
      }

      await prisma.budget.delete({ where: { id } });
      return res.json({ message: 'Budget limit successfully deleted' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

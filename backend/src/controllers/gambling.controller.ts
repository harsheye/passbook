import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIService } from '../services/ai.service';
import { ExportService } from '../services/export.service';

const prisma = new PrismaClient();

// Balance delta modifier based on transactionType
const getBalanceDelta = (type: string, amount: number): number => {
  const upperType = type.toUpperCase();
  switch (upperType) {
    case 'DEPOSIT':
    case 'BET_WON':
    case 'BONUS':
    case 'CASHBACK':
    case 'REFUND':
      return amount;
    case 'WITHDRAWAL':
    case 'BET_PLACED':
    case 'BET_LOST':
    case 'COMMISSION':
      return -amount;
    case 'ADJUSTMENT':
      return amount; // Signed
    default:
      return 0;
  }
};

export class GamblingController {
  
  // ----------------------------------------------------
  // PLATFORMS CRUD
  // ----------------------------------------------------

  public static async listPlatforms(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const platforms = await prisma.gamblingPlatform.findMany({
        where: { userId },
        orderBy: { name: 'asc' }
      });
      return res.json(platforms);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async createPlatform(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { name, websiteUrl, currency, status, balance = 0.0 } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Platform name is required' });
      }

      // Check duplicate platform
      const existing = await prisma.gamblingPlatform.findUnique({
        where: {
          userId_name: { userId, name }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'A platform with this name already exists' });
      }

      const platform = await prisma.gamblingPlatform.create({
        data: {
          userId,
          name,
          websiteUrl: websiteUrl || '',
          currency: currency || 'INR',
          status: status || 'ACTIVE',
          balance: parseFloat(balance)
        }
      });

      return res.status(201).json(platform);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async updatePlatform(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name, websiteUrl, currency, status, balance } = req.body;

      const existing = await prisma.gamblingPlatform.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Platform not found or unauthorized' });
      }

      const updated = await prisma.gamblingPlatform.update({
        where: { id },
        data: {
          name: name || existing.name,
          websiteUrl: websiteUrl !== undefined ? websiteUrl : existing.websiteUrl,
          currency: currency || existing.currency,
          status: status || existing.status,
          balance: balance !== undefined ? parseFloat(balance) : existing.balance
        }
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async deletePlatform(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.gamblingPlatform.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Platform not found or unauthorized' });
      }

      await prisma.gamblingPlatform.delete({ where: { id } });
      return res.json({ message: 'Gambling platform deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ----------------------------------------------------
  // ENTRIES CRUD
  // ----------------------------------------------------

  public static async listEntries(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { platformId, transactionType, category, startDate, endDate } = req.query;

      const where: any = { userId };

      if (platformId) where.platformId = platformId as string;
      if (transactionType) where.transactionType = transactionType as string;
      if (category) where.category = category as string;
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate as string);
        if (endDate) where.date.lte = new Date(endDate as string);
      }

      const entries = await prisma.gamblingEntry.findMany({
        where,
        include: {
          platform: {
            select: { name: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      return res.json(entries);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async createEntry(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        platformId,
        platformName, // In case user sends name instead of ID
        transactionType,
        amount,
        currency = 'INR',
        date,
        description,
        referenceId = '',
        notes = '',
        category = 'Other'
      } = req.body;

      if (amount === undefined || !transactionType) {
        return res.status(400).json({ error: 'Amount and transactionType are required' });
      }

      let targetPlatformId = platformId;

      // Handle resolving by platform name if ID is missing
      if (!targetPlatformId && platformName) {
        let p = await prisma.gamblingPlatform.findFirst({
          where: { userId, name: platformName }
        });
        if (!p) {
          p = await prisma.gamblingPlatform.create({
            data: { userId, name: platformName, currency }
          });
        }
        targetPlatformId = p.id;
      }

      if (!targetPlatformId) {
        return res.status(400).json({ error: 'platformId or platformName is required' });
      }

      const valAmount = parseFloat(amount);
      
      // Verify platform exists
      const platform = await prisma.gamblingPlatform.findFirst({
        where: { id: targetPlatformId, userId }
      });
      if (!platform) {
        return res.status(404).json({ error: 'Platform not found or unauthorized' });
      }

      // Create entry and update platform balance inside a database transaction
      const result = await prisma.$transaction(async (tx) => {
        const entry = await tx.gamblingEntry.create({
          data: {
            userId,
            platformId: targetPlatformId,
            transactionType: transactionType.toUpperCase(),
            amount: valAmount,
            currency,
            date: date ? new Date(date) : new Date(),
            description: description || `${transactionType} entry on ${platform.name}`,
            referenceId,
            notes,
            category
          }
        });

        // Calculate delta change
        const delta = getBalanceDelta(transactionType, valAmount);
        
        // Update balance
        await tx.gamblingPlatform.update({
          where: { id: targetPlatformId },
          data: {
            balance: { increment: delta }
          }
        });

        return entry;
      });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async createEntryAI(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Natural language text input is required' });
      }

      const parsed = await AIService.parseGamblingEntry(text);

      if (!parsed.platform || parsed.amount === undefined || !parsed.transactionType) {
        return res.status(422).json({
          error: 'AI was unable to parse platform, amount, or type from query. Please try manual entry.',
          parsedInfo: parsed
        });
      }

      // Resolve platform
      let platform = await prisma.gamblingPlatform.findFirst({
        where: { userId, name: { equals: parsed.platform } }
      });

      if (!platform) {
        // Auto-create custom platform if not exists
        platform = await prisma.gamblingPlatform.create({
          data: {
            userId,
            name: parsed.platform,
            currency: 'INR'
          }
        });
      }

      // Record entry and adjust balance inside transaction pipeline
      const result = await prisma.$transaction(async (tx) => {
        const entry = await tx.gamblingEntry.create({
          data: {
            userId,
            platformId: platform!.id,
            transactionType: parsed.transactionType!,
            amount: parsed.amount!,
            currency: 'INR',
            date: parsed.date ? new Date(parsed.date) : new Date(),
            description: parsed.description || `${parsed.transactionType} on ${platform!.name}`,
            notes: parsed.notes || '',
            category: parsed.category || 'Other'
          }
        });

        const delta = getBalanceDelta(parsed.transactionType!, parsed.amount!);
        await tx.gamblingPlatform.update({
          where: { id: platform!.id },
          data: {
            balance: { increment: delta }
          }
        });

        return entry;
      });

      return res.status(201).json({
        message: 'AI parsed and recorded gambling entry successfully',
        entry: result
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async deleteEntry(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.gamblingEntry.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Reverse balance change and delete inside transaction
      await prisma.$transaction(async (tx) => {
        const reverseDelta = -getBalanceDelta(existing.transactionType, existing.amount);

        await tx.gamblingPlatform.update({
          where: { id: existing.platformId },
          data: {
            balance: { increment: reverseDelta }
          }
        });

        await tx.gamblingEntry.delete({
          where: { id }
        });
      });

      return res.json({ message: 'Entry successfully deleted and balance adjusted' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ----------------------------------------------------
  // ANALYTICS & INSIGHTS ENGINE
  // ----------------------------------------------------

  public static async getAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // 1. Core Summary aggregations
      const entries = await prisma.gamblingEntry.findMany({ where: { userId } });
      const platforms = await prisma.gamblingPlatform.findMany({ where: { userId } });

      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalBonuses = 0;
      let totalBets = 0;
      let totalWins = 0;
      let totalLosses = 0;
      let currentBalance = 0;

      // Calculate totals
      entries.forEach(e => {
        const type = e.transactionType.toUpperCase();
        if (type === 'DEPOSIT') totalDeposits += e.amount;
        else if (type === 'WITHDRAWAL') totalWithdrawals += e.amount;
        else if (type === 'BONUS') totalBonuses += e.amount;
        else if (type === 'BET_PLACED') totalBets += e.amount;
        else if (type === 'BET_WON') totalWins += e.amount;
        else if (type === 'BET_LOST') totalLosses += e.amount;
      });

      platforms.forEach(p => {
        if (p.status === 'ACTIVE') currentBalance += p.balance;
      });

      // ROI & P&L Formulations
      // Net Profit = (Withdrawals + Current Balance + Bonuses) - Deposits
      const netProfit = (totalWithdrawals + currentBalance + totalBonuses) - totalDeposits;
      const roi = totalDeposits > 0 ? (netProfit / totalDeposits) * 100 : 0.0;

      // Group P&L by Day/Month for Line Chart
      const plByDate: Record<string, number> = {};
      const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
      
      let runningPL = 0;
      const plTimeline = sortedEntries.map(e => {
        const type = e.transactionType.toUpperCase();
        let change = 0;
        if (type === 'BET_WON' || type === 'BONUS' || type === 'CASHBACK') change = e.amount;
        else if (type === 'BET_LOST') change = -e.amount;
        // Deposits and Withdrawals are flow events, won/lost represent earnings
        
        runningPL += change;
        return {
          date: e.date.toISOString().split('T')[0],
          profit: runningPL,
          amount: e.amount,
          type: e.transactionType
        };
      });

      // Platforms profit breakdown
      const platformProfit: Record<string, { deposits: number; withdrawals: number; wins: number; losses: number; balance: number; net: number }> = {};
      platforms.forEach(p => {
        platformProfit[p.name] = { deposits: 0, withdrawals: 0, wins: 0, losses: 0, balance: p.balance, net: 0 };
      });

      entries.forEach(e => {
        const pName = e.platformId; // In temporary group, map to actual platform names
      });

      // Relook platform grouping using standard joins
      const detailedPlatforms = await prisma.gamblingPlatform.findMany({
        where: { userId },
        include: { entries: true }
      });

      const platformWiseMetrics = detailedPlatforms.map(p => {
        let pDep = 0, pWith = 0, pWin = 0, pLos = 0, pBon = 0;
        p.entries.forEach(e => {
          const type = e.transactionType.toUpperCase();
          if (type === 'DEPOSIT') pDep += e.amount;
          else if (type === 'WITHDRAWAL') pWith += e.amount;
          else if (type === 'BET_WON') pWin += e.amount;
          else if (type === 'BET_LOST') pLos += e.amount;
          else if (type === 'BONUS') pBon += e.amount;
        });
        
        // P&L platform-specific = (withdrawals + balance + bonus) - deposits
        const pNet = (pWith + p.balance + pBon) - pDep;
        const pRoi = pDep > 0 ? (pNet / pDep) * 100 : 0.0;

        return {
          name: p.name,
          balance: p.balance,
          deposits: pDep,
          withdrawals: pWith,
          wins: pWin,
          losses: pLos,
          netProfit: pNet,
          roi: pRoi
        };
      });

      // Group Activity by Category (Sports Betting, Casino, Slots, etc.) for Pie Chart
      const categoryDistribution: Record<string, number> = {};
      entries.forEach(e => {
        if (e.transactionType === 'BET_WON' || e.transactionType === 'BET_LOST' || e.transactionType === 'BET_PLACED') {
          categoryDistribution[e.category] = (categoryDistribution[e.category] || 0) + e.amount;
        }
      });

      const pieData = Object.keys(categoryDistribution).map(cat => ({
        name: cat,
        value: categoryDistribution[cat]
      }));

      // Assemble AI insights dynamically
      const insights: string[] = [];
      if (platformWiseMetrics.length > 0) {
        const sortedProfits = [...platformWiseMetrics].sort((a, b) => b.netProfit - a.netProfit);
        const topPlatform = sortedProfits[0];
        
        if (topPlatform && topPlatform.netProfit > 0) {
          insights.push(`Most profitable platform: **${topPlatform.name}** generating ₹${topPlatform.netProfit.toFixed(2)} profit.`);
          if (netProfit > 0) {
            const share = (topPlatform.netProfit / netProfit) * 100;
            insights.push(`${topPlatform.name} generated **${share.toFixed(0)}%** of your total betting profit.`);
          }
        }

        const sportsNet = entries
          .filter(e => e.category === 'Sports Betting')
          .reduce((sum, e) => sum + (e.transactionType === 'BET_WON' ? e.amount : e.transactionType === 'BET_LOST' ? -e.amount : 0), 0);
        
        if (Math.abs(sportsNet) > 0) {
          insights.push(`Sports betting produced **₹${sportsNet.toFixed(2)}** ${sportsNet >= 0 ? 'profit' : 'loss'} overall.`);
        }

        insights.push(`ROI is currently sitting at **${roi.toFixed(1)}%** across all platforms.`);
      }

      if (insights.length === 0) {
        insights.push('Not enough transaction history to formulate betting insights. Keep tracking entries to generate insights.');
      }

      return res.json({
        summary: {
          totalDeposits,
          totalWithdrawals,
          totalBonuses,
          totalBets,
          totalWins,
          totalLosses,
          currentBalance,
          netProfit,
          roi
        },
        plTimeline,
        platformMetrics: platformWiseMetrics,
        activityDistribution: pieData,
        insights
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export gambling data
   */
  public static async exportGambling(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { format = 'csv' } = req.query;

      const entries = await prisma.gamblingEntry.findMany({
        where: { userId },
        include: { platform: true },
        orderBy: { date: 'desc' }
      });

      const fileFormat = (format as string).toLowerCase();

      if (fileFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=gambling_export.json');
        return res.send(JSON.stringify(entries, null, 2));
      } else if (fileFormat === 'xlsx') {
        const buffer = ExportService.exportGamblingToXLSX(entries);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=gambling_export.xlsx');
        return res.send(buffer);
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=gambling_export.csv');
        return res.send(ExportService.exportGamblingToCSV(entries));
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

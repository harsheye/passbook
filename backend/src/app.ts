import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import budgetRoutes from './routes/budget.routes';
import recurringRoutes from './routes/recurring.routes';
import gamblingRoutes from './routes/gambling.routes';
import dashboardRoutes from './routes/dashboard.routes';
import categoryRoutes from './routes/category.routes';
import { SchedulerService } from './services/scheduler.service';

import { AIService } from './services/ai.service';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for local dev simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/gambling', gamblingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);

// Health check and root details
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    time: new Date(),
    aiModel: AIService.getActiveModel()
  });
});

// Trigger recurring processing async on start (Disabled for manual approval)
// SchedulerService.processRecurringTransactions()
//   .then(count => {
//     if (count > 0) console.log(`[Scheduler] Generated ${count} outstanding recurring transactions.`);
//   })
//   .catch(err => {
//     console.error('[Scheduler Error] Failed to run recurring transaction check:', err);
//   });

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Middleware]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

export default app;

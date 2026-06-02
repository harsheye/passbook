import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/summary', DashboardController.getSummary);
router.get('/admin-summary', DashboardController.getCombinedSummary);

export default router;

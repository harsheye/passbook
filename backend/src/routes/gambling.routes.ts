import { Router } from 'express';
import { GamblingController } from '../controllers/gambling.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Secure all endpoints: requires JWT AND Admin role
router.use(authenticateJWT);
router.use(requireRole('ADMIN'));

// Platform custom management
router.get('/platforms', GamblingController.listPlatforms);
router.post('/platforms', GamblingController.createPlatform);
router.put('/platforms/:id', GamblingController.updatePlatform);
router.delete('/platforms/:id', GamblingController.deletePlatform);

// Gambling entries
router.get('/entries', GamblingController.listEntries);
router.post('/entries', GamblingController.createEntry);
router.post('/entries/ai', GamblingController.createEntryAI);
router.delete('/entries/:id', GamblingController.deleteEntry);

// Analytics, insights, exports
router.get('/analytics', GamblingController.getAnalytics);
router.get('/export', GamblingController.exportGambling);

export default router;

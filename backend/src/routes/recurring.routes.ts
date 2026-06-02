import { Router } from 'express';
import { RecurringController } from '../controllers/recurring.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', RecurringController.list);
router.post('/', RecurringController.create);
router.put('/:id', RecurringController.update);
router.post('/:id/approve', RecurringController.approve);
router.post('/:id/skip', RecurringController.skip);
router.delete('/:id', RecurringController.delete);

export default router;

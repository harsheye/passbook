import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', BudgetController.getBudgets);
router.post('/', BudgetController.setBudget);
router.delete('/:id', BudgetController.deleteBudget);

export default router;

import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// Require authentication for category management
router.use(authenticateJWT);

router.get('/', CategoryController.list);
router.post('/', CategoryController.create);

export default router;

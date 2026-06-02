import { Router } from 'express';
import multer from 'multer';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Authenticate all transaction endpoints
router.use(authenticateJWT);

router.get('/', TransactionController.list);
router.post('/', TransactionController.create);
router.post('/ai', TransactionController.createAI);
router.put('/:id', TransactionController.update);
router.delete('/:id', TransactionController.delete);
router.delete('/', TransactionController.bulkDelete);

// Import endpoints
router.post('/upload', upload.single('file'), TransactionController.uploadFile);
router.post('/import-validate', TransactionController.validateImport);
router.post('/import', TransactionController.finalizeImport);

// Export endpoint
router.get('/export', TransactionController.exportData);

export default router;

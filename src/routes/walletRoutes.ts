import express from 'express';
import { WalletController } from '../controllers/walletController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const walletController = new WalletController();

// Protected routes
router.get('/balance', authMiddleware, walletController.getWalletBalance.bind(walletController));
router.post('/topup', authMiddleware, walletController.topUp.bind(walletController));

// Admin routes
router.post('/admin/topup', authMiddleware, adminMiddleware, walletController.adminTopUp.bind(walletController));

export default router;
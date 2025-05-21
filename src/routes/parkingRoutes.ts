import express from 'express';
import { ParkingController } from '../controllers/parkingController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const parkingController = new ParkingController();

// Protected routes
router.post('/checkin', parkingController.checkIn.bind(parkingController));
router.post('/checkout', parkingController.checkOutAndPay.bind(parkingController));

router.get('/history', authMiddleware, parkingController.getParkingHistory.bind(parkingController));
router.get('/active', authMiddleware, parkingController.getActiveParking.bind(parkingController));

// Admin routes
router.get('/admin/active', authMiddleware, adminMiddleware, parkingController.getAllActiveParking.bind(parkingController));
router.get('/admin/history', authMiddleware, adminMiddleware, parkingController.getAllHistory.bind(parkingController));

export default router;
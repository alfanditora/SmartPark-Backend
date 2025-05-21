import express from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const userController = new UserController();

// Public routes
router.post('/register', userController.register.bind(userController));
router.post('/login', userController.login.bind(userController));

// Protected routes
router.get('/profile', authMiddleware, userController.getProfile.bind(userController));
router.put('/profile', authMiddleware, userController.updateProfile.bind(userController));

// Vehicle management routes
router.post('/vehicle', authMiddleware, userController.addVehicle.bind(userController));
router.put('/vehicle', authMiddleware, userController.updateVehicleDescription.bind(userController));
router.delete('/vehicle/:plate', authMiddleware, userController.removeVehicle.bind(userController));

// Admin routes
router.get('/all', authMiddleware, adminMiddleware, userController.getAllUsers.bind(userController));
router.post('/admin/rfid', authMiddleware, adminMiddleware, userController.addRfid.bind(userController));
router.delete('/admin/rfid/:userID', authMiddleware, adminMiddleware, userController.removeRfid.bind(userController));


export default router;
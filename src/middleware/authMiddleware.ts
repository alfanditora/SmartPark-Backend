import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Dapatkan token dari header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        status: 'error',
        message: 'Authorization header is required'
      });
      return;
    }
    
    // Token dalam format 'Bearer [token]'
    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Token is required'
      });
      return;
    }
    
    // Verifikasi token
    const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
    
    const decoded = jwt.verify(token, jwtSecret);
    
    // Menyimpan data user dari token ke request
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      res.status(401).json({
        status: 'error',
        message: 'Token expired'
      });
      return;
    }
    
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

// Admin only middleware
export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Pastikan authMiddleware digunakan sebelum adminMiddleware
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }
    
    if (user.role !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin only.'
      });
      return;
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};
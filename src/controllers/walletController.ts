import { Request, Response } from 'express';
import { Wallet } from '../models/wallet';
import { User } from '../models/user';

export class WalletController {
  private walletModel = new Wallet();
  private userModel = new User();

  async getWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      // userID diperoleh dari middleware auth
      const userID = (req as any).user.userID;
      
      const wallet = await this.walletModel.getByUserId(userID);
      if (!wallet) {
        res.status(404).json({
          status: 'error',
          message: 'Wallet not found'
        });
        return;
      }
      
      res.status(200).json({
        status: 'success',
        data: wallet
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve wallet balance',
        error: (error as Error).message
      });
    }
  }

  async topUp(req: Request, res: Response): Promise<void> {
    try {
      // userID diperoleh dari middleware auth
      const userID = (req as any).user.userID;
      const { amount } = req.body;
      
      // Validasi input
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Valid amount is required'
        });
        return;
      }
      
      const wallet = await this.walletModel.getByUserId(userID);
      if (!wallet) {
        res.status(404).json({
          status: 'error',
          message: 'Wallet not found'
        });
        return;
      }
      
      const updatedWallet = await this.walletModel.topUp(wallet.walletID, Number(amount));
      
      res.status(200).json({
        status: 'success',
        data: updatedWallet,
        message: `Successfully topped up Rp ${amount}`
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to top up wallet',
        error: (error as Error).message
      });
    }
  }

  // Admin only: top up wallet for any user
  async adminTopUp(req: Request, res: Response): Promise<void> {
    try {
      // Cek apakah user adalah admin
      const role = (req as any).user.role;
      if (role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin only.'
        });
        return;
      }
      
      const { userID, amount } = req.body;
      
      // Validasi input
      if (!userID || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({
          status: 'error',
          message: 'Valid userID and amount are required'
        });
        return;
      }
      
      // Cek apakah user ada
      const user = await this.userModel.getById(userID);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      const wallet = await this.walletModel.getByUserId(userID);
      if (!wallet) {
        // Jika wallet tidak ada, buat wallet baru
        const newWallet = await this.walletModel.create(userID, Number(amount));
        res.status(200).json({
          status: 'success',
          data: newWallet,
          message: `Successfully created wallet and topped up Rp ${amount}`
        });
        return;
      }
      
      const updatedWallet = await this.walletModel.topUp(wallet.walletID, Number(amount));
      
      res.status(200).json({
        status: 'success',
        data: updatedWallet,
        message: `Successfully topped up Rp ${amount} for user ${userID}`
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to top up wallet',
        error: (error as Error).message
      });
    }
  }
}

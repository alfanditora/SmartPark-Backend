import { db } from '../config/firebase';

export interface IWallet {
  walletID: string;
  userID: string;
  current_balance: number;
}

export class Wallet {
  private collectionName = 'wallets';

  async create(userID: string, initialBalance: number = 0): Promise<IWallet> {
    try {
      const walletID = `WALLET_${new Date().getTime()}`;
      
      const walletData: IWallet = {
        walletID,
        userID,
        current_balance: initialBalance
      };
      
      await db.collection(this.collectionName).doc(walletID).set(walletData);
      return walletData;
    } catch (error) {
      throw error;
    }
  }

  async getById(walletID: string): Promise<IWallet | null> {
    try {
      const walletDoc = await db.collection(this.collectionName).doc(walletID).get();
      if (!walletDoc.exists) return null;
      return walletDoc.data() as IWallet;
    } catch (error) {
      throw error;
    }
  }

  async getByUserId(userID: string): Promise<IWallet | null> {
    try {
      const snapshot = await db.collection(this.collectionName)
        .where('userID', '==', userID)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const walletData = snapshot.docs[0].data() as IWallet;
      return walletData;
    } catch (error) {
      throw error;
    }
  }

  async updateBalance(walletID: string, amount: number): Promise<IWallet | null> {
    try {
      const walletRef = db.collection(this.collectionName).doc(walletID);
      const walletDoc = await walletRef.get();
      
      if (!walletDoc.exists) return null;
      
      const walletData = walletDoc.data() as IWallet;
      const newBalance = walletData.current_balance + amount;
      
      // Tidak mengizinkan saldo negatif
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }
      
      await walletRef.update({ current_balance: newBalance });
      return { ...walletData, current_balance: newBalance };
    } catch (error) {
      throw error;
    }
  }

  async topUp(walletID: string, amount: number): Promise<IWallet | null> {
    if (amount <= 0) {
      throw new Error('Top up amount must be positive');
    }
    return this.updateBalance(walletID, amount);
  }

  async deduct(walletID: string, amount: number): Promise<IWallet | null> {
    if (amount <= 0) {
      throw new Error('Deduction amount must be positive');
    }
    return this.updateBalance(walletID, -amount);
  }
}
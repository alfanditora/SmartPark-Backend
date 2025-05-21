import { Request, Response } from 'express';
import { Parking } from '../models/parking';
import { User } from '../models/user';
import { Wallet } from '../models/wallet';
import { db } from '../config/firebase';

export class ParkingController {
  private parkingModel = new Parking();
  private userModel = new User();
  private walletModel = new Wallet();

  async checkIn(req: Request, res: Response): Promise<void> {
    try {
      // Mengambil RFID dan vehicle_plate dari body request
      const { rfid, vehicle_plate } = req.body;
      
      if (!rfid) {
        res.status(400).json({
          status: 'error',
          message: 'RFID is required'
        });
        return;
      }
      
      if (!vehicle_plate) {
        res.status(400).json({
          status: 'error',
          message: 'Vehicle plate is required'
        });
        return;
      }
      
      // Validasi user dengan RFID yang diberikan
      const user = await this.userModel.getByRfid(rfid);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found with the provided RFID'
        });
        return;
      }
      
      // Periksa apakah vehicle_plate terdaftar pada user
      // Menggunakan struktur vehicles baru
      const vehicleExists = user.vehicles && user.vehicles.some(vehicle => vehicle.plate === vehicle_plate);
      
      // Backward compatibility: cek juga di vehicle_plates jika ada
      const existsInOldFormat = (user as any).vehicle_plates && Array.isArray((user as any).vehicle_plates) && 
                               (user as any).vehicle_plates.includes(vehicle_plate);
      
      if (!vehicleExists && !existsInOldFormat) {
        res.status(403).json({
          status: 'error',
          message: 'Vehicle plate is not registered to this user'
        });
        return;
      }
      
      // Cek apakah kendaraan ini sedang parkir
      const activeParkingByPlate = await this.parkingModel.getActiveByVehiclePlate(vehicle_plate);
      if (activeParkingByPlate) {
        res.status(409).json({
          status: 'error',
          message: 'This vehicle is already checked in'
        });
        return;
      }
      
      // Gunakan userID dari user yang ditemukan dengan RFID
      const parking = await this.parkingModel.create(user.userID, vehicle_plate);
      
      res.status(201).json({
        status: 'success',
        data: parking,
        message: 'Successfully checked in'
      });
    } catch (error) {
      console.error("Error in checkIn:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check in',
        error: (error as Error).message
      });
    }
  }

  async checkOutAndPay(req: Request, res: Response): Promise<void> {
    try {
      // Mendapatkan RFID dan vehicle_plate dari body request
      const { rfid, vehicle_plate } = req.body;
      
      if (!rfid) {
        res.status(400).json({
          status: 'error',
          message: 'RFID is required'
        });
        return;
      }
      
      if (!vehicle_plate) {
        res.status(400).json({
          status: 'error',
          message: 'Vehicle plate is required'
        });
        return;
      }
      
      // Validasi user dengan RFID yang diberikan
      const user = await this.userModel.getByRfid(rfid);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found with the provided RFID'
        });
        return;
      }
      
      let activeParking;
      // Cek apakah kendaraan ini sedang parkir
      activeParking = await this.parkingModel.getActiveByVehiclePlate(vehicle_plate);
      
      if (!activeParking) {
        res.status(404).json({
          status: 'error',
          message: 'No active parking session found'
        });
        return;
      }
      
      // Validasi userID, hanya pemilik sesi parkir yang bisa checkout
      if (activeParking.userID !== user.userID) {
        res.status(403).json({
          status: 'error',
          message: 'You are not authorized to check out this parking session'
        });
        return;
      }
      
      // Jika out_date sudah ada, berarti sudah checkout
      if (activeParking.out_date) {
        // Jika sudah checkout tapi belum dibayar, lanjutkan ke proses pembayaran
        if (activeParking.payment_status !== 'paid') {
          return this.processPayment(req, res, activeParking, user.userID);
        }
        
        res.status(409).json({
          status: 'error',
          message: 'This parking session has already been checked out and paid'
        });
        return;
      }
      
      // Proses checkout
      const checkedOutParking = await this.parkingModel.checkout(activeParking.parkID);
      
      if (!checkedOutParking) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to check out'
        });
        return;
      }
      
      // Lanjutkan ke proses pembayaran dengan userID dari user yang ditemukan dengan RFID
      return this.processPayment(req, res, checkedOutParking, user.userID);
      
    } catch (error) {
      console.error("Error in checkOutAndPay:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check out and pay',
        error: (error as Error).message
      });
    }
  }

  private async processPayment(req: Request, res: Response, parking: any, userID: string): Promise<void> {
    try {
      // Cek jika parkir sudah dibayar
      if (parking.payment_status === 'paid') {
        res.status(409).json({
          status: 'error',
          message: 'This parking session has already been paid'
        });
        return;
      }
      
      // Dapatkan wallet user
      const wallet = await this.walletModel.getByUserId(userID);
      if (!wallet) {
        res.status(404).json({
          status: 'error',
          message: 'Wallet not found'
        });
        return;
      }
      
      // Cek saldo cukup
      if (wallet.current_balance < parking.total_billing) {
        res.status(400).json({
          status: 'error',
          message: 'Insufficient balance',
          data: {
            required: parking.total_billing,
            balance: wallet.current_balance
          }
        });
        return;
      }
      
      // Proses pembayaran: kurangi saldo wallet
      await this.walletModel.deduct(wallet.walletID, parking.total_billing);
      
      // Update status pembayaran parkir
      const updatedParking = await this.parkingModel.updatePaymentStatus(parking.parkID, 'paid');
      
      res.status(200).json({
        status: 'success',
        data: updatedParking,
        message: `Successfully checked out and paid parking fee: Rp ${parking.total_billing}`
      });
    } catch (error) {
      console.error("Error in processPayment:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process payment',
        error: (error as Error).message
      });
    }
  }

  async getParkingHistory(req: Request, res: Response): Promise<void> {
    try {
      // userID diperoleh dari middleware auth
      const userID = (req as any).user.userID;
      console.log(`Fetching parking history for userID: ${userID}`);
      
      const parkingHistory = await this.parkingModel.getParkingHistory(userID);
      console.log(`Retrieved ${parkingHistory.length} parking history records`);
      
      // Tambahkan deskripsi kendaraan ke hasil parkingHistory
      const enhancedParkingHistory = await this.enhanceParkingHistoryWithVehicleInfo(userID, parkingHistory);
      
      res.status(200).json({
        status: 'success',
        data: enhancedParkingHistory
      });
    } catch (error) {
      console.error("Error in getParkingHistory:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve parking history',
        error: (error as Error).message
      });
    }
  }

  // Fungsi helper untuk menambahkan info kendaraan ke history parking
  private async enhanceParkingHistoryWithVehicleInfo(userID: string, parkingHistory: any[]): Promise<any[]> {
    try {
      const user = await this.userModel.getById(userID);
      if (!user || !user.vehicles) {
        return parkingHistory;
      }
      
      // Membuat map dari plat nomor ke deskripsi untuk lookup yang cepat
      const vehicleMap = new Map();
      user.vehicles.forEach(vehicle => {
        vehicleMap.set(vehicle.plate, vehicle.description);
      });
      
      // Tambahkan deskripsi kendaraan ke setiap record history
      return parkingHistory.map(record => {
        const vehicleDescription = vehicleMap.get(record.vehicle_plate) || '';
        return {
          ...record,
          vehicle_description: vehicleDescription
        };
      });
    } catch (error) {
      console.error('Error enhancing parking history with vehicle info:', error);
      return parkingHistory; // Return original data if there's an error
    }
  }

  async getActiveParking(req: Request, res: Response): Promise<void> {
    try {
      // userID diperoleh dari middleware auth
      const userID = (req as any).user.userID;
      console.log(`Looking for active parking for userID: ${userID}`);
      
      // Debug: Check what's in the request object
      console.log("Request user object:", (req as any).user);
      
      const activeParking = await this.parkingModel.getActiveByUserId(userID);
      console.log("Active parking result:", activeParking);
      
      if (!activeParking) {
        res.status(404).json({
          status: 'error',
          message: 'No active parking session found'
        });
        return;
      }
      
      // Tambahkan deskripsi kendaraan jika tersedia
      const user = await this.userModel.getById(userID);
      console.log("User data for vehicle description:", user?.vehicles);
      
      if (user && user.vehicles) {
        const vehicle = user.vehicles.find(v => v.plate === activeParking.vehicle_plate);
        if (vehicle) {
          (activeParking as any).vehicle_description = vehicle.description;
        }
      }
      
      res.status(200).json({
        status: 'success',
        data: activeParking
      });
    } catch (error) {
      console.error("Error in getActiveParking:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve active parking session',
        error: (error as Error).message
      });
    }
  }

  // Admin: Mendapatkan semua sesi parkir aktif
  async getAllActiveParking(req: Request, res: Response): Promise<void> {
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
      
      console.log("Admin requesting all active parking sessions");
      
      // Dapatkan semua sesi parkir aktif dari Firestore
      const parkingRef = db.collection('parkings');
      const snapshot = await parkingRef.where('out_date', '==', null).get();
      
      console.log(`Found ${snapshot.size} active parking sessions`);
      
      if (snapshot.empty) {
        res.status(200).json({
          status: 'success',
          data: []
        });
        return;
      }
      
      const activeParkingSessions = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data() as any;
        const parkingData = {
          ...data,
          in_date: data.in_date.toDate(),
          out_date: null
        };
        
        // Tambahkan deskripsi kendaraan jika tersedia
        try {
          const user = await this.userModel.getById(parkingData.userID);
          if (user && user.vehicles) {
            const vehicle = user.vehicles.find(v => v.plate === parkingData.vehicle_plate);
            if (vehicle) {
              parkingData.vehicle_description = vehicle.description;
            }
          }
        } catch (error) {
          console.error(`Failed to get vehicle description for ${parkingData.vehicle_plate}:`, error);
        }
        
        return parkingData;
      }));
      
      res.status(200).json({
        status: 'success',
        data: activeParkingSessions
      });
    } catch (error) {
      console.error("Error in getAllActiveParking:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve active parking sessions',
        error: (error as Error).message
      });
    }
  }

  // Admin: Mendapatkan seluruh history parkir di sistem
  async getAllHistory(req: Request, res: Response): Promise<void> {
    try {
      // Verifikasi bahwa user adalah admin
      const role = (req as any).user.role;
      if (role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin only.'
        });
        return;
      }
      
      // Opsional: Parameter untuk pagination
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      // Firestore does not support offset, so true pagination should use startAfter with a cursor
      // For now, we only use limit and page 1 (or you can implement cursor-based pagination)
      
      // Parameter untuk filter dan sorting
      const sortBy = req.query.sortBy as string || 'in_date';
      const sortOrder = req.query.sortOrder as string || 'desc';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      const status = req.query.status as string || null; // paid, pending, all
      
      // Query dasar
      const parkingRef = db.collection('parkings');
      let query: FirebaseFirestore.Query = parkingRef;
      
      // Tambahkan filter jika ada
      if (startDate) {
        query = query.where('in_date', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('in_date', '<=', endDate);
      }
      
      if (status === 'paid') {
        query = query.where('payment_status', '==', 'paid');
      } else if (status === 'unpaid' || status === 'pending') {
        query = query.where('payment_status', '==', 'pending');
      }
      
      // Tambahkan sorting
      query = query.orderBy(sortBy, sortOrder as any);
      
      // Hitung total records untuk pagination info (tanpa limit/offset)
      const totalSnapshot = await query.get();
      const totalRecords = totalSnapshot.size;
      
      // Terapkan limit (Firestore does not support offset, so only first page is correct)
      query = query.limit(limit);
      
      // Dapatkan data
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        res.status(200).json({
          status: 'success',
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0
          }
        });
        return;
      }
      
      // Proses data dan tambahkan informasi tambahan
      const parkingHistory = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data() as any;
        const parkingData = {
          ...data,
          parkID: doc.id,
          in_date: data.in_date.toDate(),
          out_date: data.out_date ? data.out_date.toDate() : null
        };
        
        // Tambahkan informasi user dan kendaraan
        try {
          const user = await this.userModel.getById(parkingData.userID);
          if (user) {
            parkingData.user_name = user.username || 'Unknown';
            parkingData.user_email = user.email || 'Unknown';
            
            // Tambahkan deskripsi kendaraan jika tersedia
            if (user.vehicles) {
              const vehicle = user.vehicles.find(v => v.plate === parkingData.vehicle_plate);
              if (vehicle) {
                parkingData.vehicle_description = vehicle.description;
              }
            }
          }
        } catch (error) {
          console.error(`Failed to get user info for ${parkingData.userID}:`, error);
        }
        
        return parkingData;
      }));
      
      res.status(200).json({
        status: 'success',
        data: parkingHistory,
        pagination: {
          total: totalRecords,
          page,
          limit,
          pages: Math.ceil(totalRecords / limit)
        }
      });
    } catch (error) {
      console.error("Error in getAllHistory:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve parking history',
        error: (error as Error).message
      });
    }
  }
}
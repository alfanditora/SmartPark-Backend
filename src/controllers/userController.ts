import { Request, Response } from 'express';
import { User, IUser, IVehicle } from '../models/user';
import { Wallet } from '../models/wallet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class UserController {
  private userModel = new User();
  private walletModel = new Wallet();
  private saltRounds = 10;
  private jwtSecret = process.env.JWT_SECRET;

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, vehicles = [], role = 'user' } = req.body;
      
      // Validasi input
      if (!username || !email || !password) {
        res.status(400).json({
          status: 'error',
          message: 'Username, email and password are required'
        });
        return;
      }
      
      // Ensure vehicles is an array or empty array if not provided
      const normalizedVehicles: IVehicle[] = Array.isArray(vehicles) 
        ? vehicles 
        : [];
      
      // Backward compatibility - handle vehicle_plates if provided instead of vehicles
      if (req.body.vehicle_plates) {
        const plates = Array.isArray(req.body.vehicle_plates) 
          ? req.body.vehicle_plates 
          : [req.body.vehicle_plates];
          
        // Create vehicle objects with empty descriptions
        plates.forEach((plate: string) => {
          normalizedVehicles.push({
            plate, 
            description: ""
          });
        });
      }
      
      // Cek apakah email sudah terdaftar
      const existingUser = await this.userModel.getByEmail(email);
      if (existingUser) {
        res.status(409).json({
          status: 'error',
          message: 'Email already registered'
        });
        return;
      }
      
      // Check if any of the vehicle plates are already registered (if any plates provided)
      if (normalizedVehicles.length > 0) {
        for (const vehicle of normalizedVehicles) {
          const existingPlate = await this.userModel.getByVehiclePlate(vehicle.plate);
          if (existingPlate) {
            res.status(409).json({
              status: 'error',
              message: `Vehicle plate ${vehicle.plate} is already registered`
            });
            return;
          }
        }
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      
      // Buat user baru (RFID tidak disertakan di registrasi)
      const newUser = await this.userModel.create({
        username,
        email,
        password: hashedPassword,
        vehicles: normalizedVehicles,
        role: role as 'admin' | 'user'
      });
      
      // Buat wallet untuk user baru
      await this.walletModel.create(newUser.userID);
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = newUser;
      
      res.status(201).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to register user',
        error: (error as Error).message
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Validasi input
      if (!email || !password) {
        res.status(400).json({
          status: 'error',
          message: 'Email and password are required'
        });
        return;
      }
      
      // Cari user berdasarkan email
      const user = await this.userModel.getByEmail(email);
      if (!user) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
        return;
      }
      
      // Verifikasi password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
        return;
      }
      
      // Buat JWT token
      if (!this.jwtSecret) {
        throw new Error('JWT secret is not defined');
      }
      const token = jwt.sign(
        { userID: user.userID, email: user.email, role: user.role },
        this.jwtSecret as string,
        { expiresIn: '24h' }
      );
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = user;
      
      res.status(200).json({
        status: 'success',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to login',
        error: (error as Error).message
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // userID diperoleh dari middleware auth
      const userID = (req as any).user.userID;
      
      const user = await this.userModel.getById(userID);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      // Ambil informasi wallet user
      const wallet = await this.walletModel.getByUserId(userID);
      
      // Hapus password dari respons
      const { password, ...userResponse } = user;
      
      res.status(200).json({
        status: 'success',
        data: {
          user: userResponse,
          wallet
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve profile',
        error: (error as Error).message
      });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      // userID diperoleh dari middleware auth
      const userID = (req as any).user.userID;
      
      const { username, email, vehicles, password } = req.body;
      
      let updateData: Partial<IUser> = {};
      
      // Hanya update field yang diberikan
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      
      // Handle vehicles update if provided
      if (vehicles) {
        const normalizedVehicles: IVehicle[] = Array.isArray(vehicles) 
          ? vehicles 
          : [];
        
        // Check if any of the new plates are already registered to another user
        for (const vehicle of normalizedVehicles) {
          const existingUser = await this.userModel.getByVehiclePlate(vehicle.plate);
          if (existingUser && existingUser.userID !== userID) {
            res.status(409).json({
              status: 'error',
              message: `Vehicle plate ${vehicle.plate} is already registered to another user`
            });
            return;
          }
        }
        
        updateData.vehicles = normalizedVehicles;
      }
      
      // Jika ada password baru, hash dulu
      if (password) {
        updateData.password = await bcrypt.hash(password, this.saltRounds);
      }
      
      const updatedUser = await this.userModel.update(userID, updateData);
      if (!updatedUser) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = updatedUser;
      
      res.status(200).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to update profile',
        error: (error as Error).message
      });
    }
  }
  
  // New method to add RFID (admin only)
  async addRfid(req: Request, res: Response): Promise<void> {
    try {
      // Check if admin
      const role = (req as any).user.role;
      if (role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin only.'
        });
        return;
      }
      
      const { userID, rfid } = req.body;
      
      if (!userID || !rfid) {
        res.status(400).json({
          status: 'error',
          message: 'User ID and RFID are required'
        });
        return;
      }
      
      // Check if RFID is already assigned
      const existingRfidUser = await this.userModel.getByRfid(rfid);
      if (existingRfidUser && existingRfidUser.userID !== userID) {
        res.status(409).json({
          status: 'error',
          message: 'RFID is already assigned to another user'
        });
        return;
      }
      
      // Check if user exists
      const user = await this.userModel.getById(userID);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      // Add RFID to user
      const updatedUser = await this.userModel.addRfid(userID, rfid);
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = updatedUser as IUser;
      
      res.status(200).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to add RFID',
        error: (error as Error).message
      });
    }
  }
  
  // Method to remove RFID (admin only)
  async removeRfid(req: Request, res: Response): Promise<void> {
    try {
      // Check if admin
      const role = (req as any).user.role;
      if (role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin only.'
        });
        return;
      }
      
      const { userID } = req.params;
      
      if (!userID) {
        res.status(400).json({
          status: 'error',
          message: 'User ID is required'
        });
        return;
      }
      
      // Check if user exists
      const user = await this.userModel.getById(userID);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      // Check if user has RFID
      if (!user.rfid) {
        res.status(400).json({
          status: 'error',
          message: 'User does not have an RFID assigned'
        });
        return;
      }
      
      // Remove RFID from user
      const updatedUser = await this.userModel.removeRfid(userID);
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = updatedUser as IUser;
      
      res.status(200).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to remove RFID',
        error: (error as Error).message
      });
    }
  }
  
  // Endpoints for vehicle management
  async addVehicle(req: Request, res: Response): Promise<void> {
    try {
      const userID = (req as any).user.userID;
      const { plate, description = "" } = req.body;
      
      if (!plate) {
        res.status(400).json({
          status: 'error',
          message: 'Vehicle plate is required'
        });
        return;
      }
      
      // Check if plate is already registered to another user
      const existingUser = await this.userModel.getByVehiclePlate(plate);
      if (existingUser && existingUser.userID !== userID) {
        res.status(409).json({
          status: 'error',
          message: 'Vehicle plate already registered to another user'
        });
        return;
      }
      
      const updatedUser = await this.userModel.addVehicle(userID, plate, description);
      if (!updatedUser) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = updatedUser;
      
      res.status(200).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to add vehicle',
        error: (error as Error).message
      });
    }
  }
  
  async updateVehicleDescription(req: Request, res: Response): Promise<void> {
    try {
      const userID = (req as any).user.userID;
      const { plate, description } = req.body;
      
      if (!plate || description === undefined) {
        res.status(400).json({
          status: 'error',
          message: 'Vehicle plate and description are required'
        });
        return;
      }
      
      const user = await this.userModel.getById(userID);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      // Check if the user has this vehicle
      const vehicleExists = user.vehicles.some(vehicle => vehicle.plate === plate);
      if (!vehicleExists) {
        res.status(404).json({
          status: 'error',
          message: 'Vehicle plate not found for this user'
        });
        return;
      }
      
      const updatedUser = await this.userModel.updateVehicleDescription(userID, plate, description);
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = updatedUser as IUser;
      
      res.status(200).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to update vehicle description',
        error: (error as Error).message
      });
    }
  }
  
  async removeVehicle(req: Request, res: Response): Promise<void> {
    try {
      const userID = (req as any).user.userID;
      const { plate } = req.params;
      
      if (!plate) {
        res.status(400).json({
          status: 'error',
          message: 'Vehicle plate is required'
        });
        return;
      }
      
      const user = await this.userModel.getById(userID);
      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }
      
      const updatedUser = await this.userModel.removeVehicle(userID, plate);
      
      // Hapus password dari respons
      const { password: _, ...userResponse } = updatedUser as IUser;
      
      res.status(200).json({
        status: 'success',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to remove vehicle',
        error: (error as Error).message
      });
    }
  }
  
  // Hanya admin yang bisa mengakses daftar user
  async getAllUsers(req: Request, res: Response): Promise<void> {
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
      
      const users = await this.userModel.getAll();
      
      // Hapus password dari respons
      const usersResponse = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.status(200).json({
        status: 'success',
        data: usersResponse
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve users',
        error: (error as Error).message
      });
    }
  }
  
  // Migrate existing users with vehicle_plates to new format
  async migrateVehicleData(req: Request, res: Response): Promise<void> {
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
      
      await this.userModel.migrateVehiclePlates();
      
      res.status(200).json({
        status: 'success',
        message: 'Vehicle data migration completed successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to migrate vehicle data',
        error: (error as Error).message
      });
    }
  }
}
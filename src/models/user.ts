import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

// Interface untuk data kendaraan
export interface IVehicle {
  plate: string;
  description: string;
}

export interface IUser {
  userID: string;  // User ID
  username: string;
  email: string;
  password: string; // Akan disimpan dalam bentuk hash
  vehicles: IVehicle[]; // Array kendaraan dengan deskripsi
  role: 'admin' | 'user';
  rfid?: string;  // RFID attribute - optional when creating a user
}

export class User {
  private collectionName = 'users';

  async create(userData: Omit<IUser, 'userID'>): Promise<IUser> {
    try {
      // Generate userID unik (bisa diganti dengan nomor RFID)
      const userID = `ID_${new Date().getTime()}`;
      
      const newUser: IUser = {
        userID,
        ...userData
      };
      
      // Ensure vehicles is an array (or empty array if not provided)
      newUser.vehicles = Array.isArray(newUser.vehicles) 
        ? newUser.vehicles 
        : [];
      
      await db.collection(this.collectionName).doc(userID).set(newUser);
      return newUser;
    } catch (error) {
      throw error;
    }
  }

  async getById(userID: string): Promise<IUser | null> {
    try {
      const userDoc = await db.collection(this.collectionName).doc(userID).get();
      if (!userDoc.exists) return null;
      return userDoc.data() as IUser;
    } catch (error) {
      throw error;
    }
  }
  
  async getByEmail(email: string): Promise<IUser | null> {
    try {
      const snapshot = await db.collection(this.collectionName)
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const userData = snapshot.docs[0].data() as IUser;
      return userData;
    } catch (error) {
      throw error;
    }
  }

  async getByRfid(rfid: string): Promise<IUser | null> {
    try {
      const snapshot = await db.collection(this.collectionName)
        .where('rfid', '==', rfid)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const userData = snapshot.docs[0].data() as IUser;
      return userData;
    } catch (error) {
      throw error;
    }
  }

  async getByVehiclePlate(plate: string): Promise<IUser | null> {
    try {
      // Searching for users with a vehicle containing this plate
      const snapshot = await db.collection(this.collectionName)
        .where('vehicles', 'array-contains-any', [{ plate: plate, description: "" }])
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        // Try alternative approach for Firebase queries
        const allUsers = await this.getAll();
        const userWithPlate = allUsers.find(user => 
          user.vehicles.some(vehicle => vehicle.plate === plate)
        );
        return userWithPlate || null;
      }
      
      const userData = snapshot.docs[0].data() as IUser;
      return userData;
    } catch (error) {
      throw error;
    }
  }

  async addRfid(userID: string, rfid: string): Promise<IUser | null> {
    try {
      // Check if RFID is already assigned to another user
      const existingUser = await this.getByRfid(rfid);
      if (existingUser && existingUser.userID !== userID) {
        throw new Error('RFID is already assigned to another user');
      }
      
      // Update user with new RFID
      await db.collection(this.collectionName).doc(userID).update({
        rfid: rfid
      });
      
      return this.getById(userID);
    } catch (error) {
      throw error;
    }
  }

  async removeRfid(userID: string): Promise<IUser | null> {
    try {
      await db.collection(this.collectionName).doc(userID).update({
        rfid: FieldValue.delete()
      });
      
      return this.getById(userID);
    } catch (error) {
      throw error;
    }
  }

  async addVehicle(userID: string, plate: string, description: string): Promise<IUser | null> {
    try {
      // Check if this plate is already registered to another user
      const existingUser = await this.getByVehiclePlate(plate);
      if (existingUser && existingUser.userID !== userID) {
        throw new Error('Vehicle plate already registered to another user');
      }
      
      const user = await this.getById(userID);
      if (!user) return null;
      
      // Check if user already has this plate
      if (user.vehicles.some(vehicle => vehicle.plate === plate)) {
        // Update description if the plate exists
        const updatedVehicles = user.vehicles.map(vehicle => {
          if (vehicle.plate === plate) {
            return { ...vehicle, description };
          }
          return vehicle;
        });
        
        await db.collection(this.collectionName).doc(userID).update({
          vehicles: updatedVehicles
        });
      } else {
        // Add the new vehicle to the array
        const updatedVehicles = [...user.vehicles, { plate, description }];
        await db.collection(this.collectionName).doc(userID).update({
          vehicles: updatedVehicles
        });
      }
      
      return this.getById(userID);
    } catch (error) {
      throw error;
    }
  }

  async updateVehicleDescription(userID: string, plate: string, description: string): Promise<IUser | null> {
    try {
      const user = await this.getById(userID);
      if (!user) return null;
      
      // Check if user has this plate
      const vehicleIndex = user.vehicles.findIndex(vehicle => vehicle.plate === plate);
      if (vehicleIndex === -1) {
        throw new Error('Vehicle plate not found for this user');
      }
      
      // Update the description
      const updatedVehicles = [...user.vehicles];
      updatedVehicles[vehicleIndex].description = description;
      
      await db.collection(this.collectionName).doc(userID).update({
        vehicles: updatedVehicles
      });
      
      return this.getById(userID);
    } catch (error) {
      throw error;
    }
  }

  async removeVehicle(userID: string, plate: string): Promise<IUser | null> {
    try {
      const user = await this.getById(userID);
      if (!user) return null;
      
      // Filter out the vehicle to remove
      const updatedVehicles = user.vehicles.filter(vehicle => vehicle.plate !== plate);
      
      // Only update if there's a change
      if (updatedVehicles.length !== user.vehicles.length) {
        await db.collection(this.collectionName).doc(userID).update({
          vehicles: updatedVehicles
        });
      }
      
      return this.getById(userID);
    } catch (error) {
      throw error;
    }
  }

  async update(userID: string, updateData: Partial<IUser>): Promise<IUser | null> {
    try {
      // Tidak mengizinkan update userID
      if (updateData.userID) delete updateData.userID;
      
      await db.collection(this.collectionName).doc(userID).update(updateData);
      const updatedUser = await this.getById(userID);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async delete(userID: string): Promise<boolean> {
    try {
      await db.collection(this.collectionName).doc(userID).delete();
      return true;
    } catch (error) {
      throw error;
    }
  }

  async getAll(): Promise<IUser[]> {
    try {
      const snapshot = await db.collection(this.collectionName).get();
      return snapshot.docs.map(doc => doc.data() as IUser);
    } catch (error) {
      throw error;
    }
  }
  
  // Migration function to convert old format to new format
  async migrateVehiclePlates(): Promise<void> {
    try {
      const users = await this.getAll();
      
      for (const user of users) {
        // Check if user has old vehicle_plates format
        if ('vehicle_plates' in user && Array.isArray((user as any).vehicle_plates)) {
          const vehicles = (user as any).vehicle_plates.map((plate: string) => ({
            plate,
            description: ""  // Default empty description
          }));
          
          await db.collection(this.collectionName).doc(user.userID).update({
            vehicle_plates: FieldValue.delete()  // Remove old field
          });
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
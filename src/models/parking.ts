import { admin, db } from '../config/firebase';

export interface IParking {
  parkID: string;
  userID: string;
  vehicle_plate: string;
  in_date: Date;
  out_date: Date | null;
  total_billing: number;
  duration: number | null; // dalam menit
  payment_status: 'pending' | 'paid' | 'cancelled';
}

export class Parking {
  private collectionName = 'parkings';
  // Definisikan tarif parkir dan denda
  private NORMAL_RATE = 2000;
  private PENALTY_RATE = 10000;
  private PENALTY_THRESHOLD_HOURS = 24;
  
  async create(userID: string, vehicle_plate: string): Promise<IParking> {
    try {
      const parkID = `PARK_${new Date().getTime()}`;
      
      const parkingData: IParking = {
        parkID,
        userID,
        vehicle_plate,
        in_date: new Date(),
        out_date: null,
        total_billing: this.NORMAL_RATE,
        duration: null,
        payment_status: 'pending'
      };
      
      await db.collection(this.collectionName).doc(parkID).set({
        ...parkingData,
        in_date: admin.firestore.Timestamp.fromDate(parkingData.in_date)
      });
      
      return parkingData;
    } catch (error) {
      throw error;
    }
  }

  async getById(parkID: string): Promise<IParking | null> {
    try {
      const parkingDoc = await db.collection(this.collectionName).doc(parkID).get();
      if (!parkingDoc.exists) return null;
      
      const data = parkingDoc.data() as any;
      
      // Konversi Timestamp ke Date
      return {
        ...data,
        in_date: data.in_date.toDate(),
        out_date: data.out_date ? data.out_date.toDate() : null
      } as IParking;
    } catch (error) {
      throw error;
    }
  }
  
  async getActiveByVehiclePlate(vehicle_plate: string): Promise<IParking | null> {
    try {
      // Explicitly set out_date to null instead of using ==
      const snapshot = await db.collection(this.collectionName)
        .where('vehicle_plate', '==', vehicle_plate)
        .where('out_date', '==', null)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const data = snapshot.docs[0].data() as any;
      
      return {
        ...data,
        in_date: data.in_date.toDate(),
        out_date: null // Explicitly set to null
      } as IParking;
    } catch (error) {
      console.error("Error in getActiveByVehiclePlate:", error);
      throw error;
    }
  }

  async getActiveByUserId(userID: string): Promise<IParking | null> {
    try {
      console.log(`Looking for active parking for userID: ${userID}`);
      
      // Debug query
      const snapshot = await db.collection(this.collectionName)
        .where('userID', '==', userID)
        .where('out_date', '==', null)
        .limit(1)
        .get();
      
      console.log(`Query returned ${snapshot.size} documents`);
      
      if (snapshot.empty) return null;
      
      const data = snapshot.docs[0].data() as any;
      console.log("Found active parking data:", data);
      
      return {
        ...data,
        in_date: data.in_date.toDate(),
        out_date: null // Explicitly set to null
      } as IParking;
    } catch (error) {
      console.error("Error in getActiveByUserId:", error);
      throw error;
    }
  }

  private calculateBilling(inDate: Date, outDate: Date): { duration: number, billing: number } {
    // Hitung durasi dalam milidetik
    const durationMs = outDate.getTime() - inDate.getTime();
    
    // Konversi ke menit
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    
    // Konversi ke jam
    const durationHours = durationMinutes / 60;
    
    // Billing sudah diinisialisasi sebagai NORMAL_RATE saat create
    // Hanya ubah jika parkir melebihi threshold (24 jam)
    let billing = this.NORMAL_RATE;
    if (durationHours >= this.PENALTY_THRESHOLD_HOURS) {
      billing = this.PENALTY_RATE;
    }
    
    return {
      duration: durationMinutes,
      billing
    };
  }

  async checkout(parkID: string): Promise<IParking | null> {
    try {
      const parkingRef = db.collection(this.collectionName).doc(parkID);
      const parkingDoc = await parkingRef.get();
      
      if (!parkingDoc.exists) return null;
      
      const parkingData = parkingDoc.data() as any;
      
      if (parkingData.out_date) {
        throw new Error('This parking session has already been checked out');
      }
      
      const outDate = new Date();
      const inDate = parkingData.in_date.toDate();
      
      const { duration, billing } = this.calculateBilling(inDate, outDate);
      
      const updateData = {
        out_date: admin.firestore.Timestamp.fromDate(outDate),
        duration,
        total_billing: billing,
        // Payment status tetap pending sampai pembayaran diproses
      };
      
      await parkingRef.update(updateData);
      
      return {
        ...parkingData,
        ...updateData,
        in_date: inDate,
        out_date: outDate
      } as IParking;
    } catch (error) {
      throw error;
    }
  }

  async updatePaymentStatus(parkID: string, status: 'paid' | 'cancelled'): Promise<IParking | null> {
    try {
      const parkingRef = db.collection(this.collectionName).doc(parkID);
      await parkingRef.update({ payment_status: status });
      
      return this.getById(parkID);
    } catch (error) {
      throw error;
    }
  }

  async getParkingHistory(userID: string): Promise<IParking[]> {
    try {
      // This query requires a composite index - create it from the URL in the error message
      const snapshot = await db.collection(this.collectionName)
        .where('userID', '==', userID)
        .orderBy('in_date', 'desc')
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          ...data,
          in_date: data.in_date.toDate(),
          out_date: data.out_date ? data.out_date.toDate() : null
        } as IParking;
      });
    } catch (error) {
      console.error("Error in getParkingHistory:", error);
      throw error;
    }
  }
}
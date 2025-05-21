import { Response } from 'express';

export const formatSuccessResponse = (data: any = null, message: string = 'Success') => {
  return {
    status: 'success',
    message,
    data
  };
};

export const formatErrorResponse = (message: string = 'Error', error: any = null) => {
  return {
    status: 'error',
    message,
    error
  };
};

export const sendResponse = (res: Response, statusCode: number, data: object) => {
  res.status(statusCode).json(data);
};

export const calculateParkingFee = (inDate: Date, outDate: Date, hourlyRate: number = 5000): number => {
  // Hitung durasi dalam milidetik
  const durationMs = outDate.getTime() - inDate.getTime();
  
  // Konversi ke jam (pembulatan ke atas)
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
  
  // Hitung biaya berdasarkan tarif per jam
  return durationHours * hourlyRate;
};
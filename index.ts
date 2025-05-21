import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './src/routes/userRoutes';
import walletRoutes from './src/routes/walletRoutes';
import parkingRoutes from './src/routes/parkingRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/parking', parkingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Parking System API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
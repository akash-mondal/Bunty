import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';
import pool from './config/database';
import authRoutes from './routes/auth.routes';
import plaidRoutes from './routes/plaid.routes';
import stripeRoutes from './routes/stripe.routes';
import silaRoutes from './routes/sila.routes';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Note: Stripe webhook route needs raw body, so it's registered before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/sila', silaRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: Date.now()
    }
  });
});

// Initialize connections and start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    console.log('Redis connected successfully');

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

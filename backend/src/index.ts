import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';
import pool from './config/database';
import authRoutes from './routes/auth.routes';
import plaidRoutes from './routes/plaid.routes';
import stripeRoutes from './routes/stripe.routes';
import silaRoutes from './routes/sila.routes';
import witnessRoutes from './routes/witness.routes';
import proofRoutes from './routes/proof.routes';
import indexerRoutes from './routes/indexer.routes';
import metricsRoutes from './routes/metrics.routes';
import proofStatusPoller from './services/proofStatusPoller.service';
import alertingService from './services/alerting.service';
import { corsOptions } from './middleware/cors.middleware';
import { sanitizeInput, preventNoSQLInjection, limitBodySize } from './middleware/sanitization.middleware';
import { auditLog, initAuditTable } from './middleware/audit.middleware';
import { initAPIKeysTable } from './utils/apiKeyRotation';
import { createRateLimiter } from './middleware/rateLimit.middleware';
import { requestLogger, errorLogger } from './middleware/logging.middleware';
import { metricsMiddleware } from './middleware/metrics.middleware';
import logger from './utils/logger';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Request logging middleware (before other middleware)
app.use(requestLogger);

// Metrics collection middleware
app.use(metricsMiddleware);

// Security Middleware - Applied globally
app.use(cors(corsOptions));

// Rate limiting for all routes (general protection)
app.use(createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100
}));

// Note: Stripe webhook route needs raw body, so it's registered before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parsing with size limit
app.use(express.json({ limit: '100kb' }));
app.use(limitBodySize(100));

// Input sanitization and injection prevention
app.use(sanitizeInput);
app.use(preventNoSQLInjection);

// Audit logging for sensitive operations
app.use(auditLog);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/sila', silaRoutes);
app.use('/api/witness', witnessRoutes);
app.use('/api/proof', proofRoutes);
app.use('/api/indexer', indexerRoutes);
app.use('/api/metrics', metricsRoutes);

// Error handling middleware
app.use(errorLogger);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
  });
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
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Initialize audit logs table
    await initAuditTable();
    logger.info('Audit logs initialized');

    // Initialize API keys table
    await initAPIKeysTable();
    logger.info('API keys table initialized');

    // Start proof status polling service
    proofStatusPoller.start();
    logger.info('Proof status poller started');

    // Start alerting service
    alertingService.start();
    logger.info('Alerting service started');

    app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      logger.info('Security middleware enabled:', {
        features: [
          'CORS with domain whitelist',
          'Rate limiting',
          'Input sanitization',
          'Injection prevention',
          'Audit logging',
          'Structured logging',
          'Metrics collection',
          'Alerting',
        ],
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  proofStatusPoller.stop();
  alertingService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  proofStatusPoller.stop();
  alertingService.stop();
  process.exit(0);
});

startServer();

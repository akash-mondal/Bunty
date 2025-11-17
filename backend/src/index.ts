import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { connectRedis } from './config/redis';
import pool from './config/database';
import { features, logFeatureFlags } from './config/features';
import authRoutes from './routes/auth.routes';
import plaidRoutes from './routes/plaid.routes';
import stripeRoutes from './routes/stripe.routes';
import identityRoutes from './routes/identity.routes';
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

// Note: Identity webhook route needs raw body, so it's registered before express.json()
app.use('/api/identity/webhook', express.raw({ type: 'application/json' }));

// Note: Stripe webhook route kept temporarily for rollback capability
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
app.use('/api/identity', identityRoutes);
app.use('/api/stripe', stripeRoutes); // Kept temporarily for rollback capability
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
    console.log('Starting server...');
    
    // Test database connection
    console.log('Testing database connection...');
    const dbResult = await Promise.race([
      pool.query('SELECT NOW()'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000))
    ]);
    console.log('✓ Database connected successfully:', dbResult);

    // Connect to Redis
    console.log('Connecting to Redis...');
    await connectRedis();
    console.log('✓ Redis connected successfully');

    // Initialize audit logs table (with timeout)
    console.log('Initializing audit logs table...');
    await Promise.race([
      initAuditTable(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Audit table init timeout')), 5000))
    ]).catch(err => console.warn('⚠ Audit table init skipped:', err.message));
    console.log('✓ Audit logs initialized');

    // Initialize API keys table (with timeout)
    console.log('Initializing API keys table...');
    await Promise.race([
      initAPIKeysTable(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('API keys table init timeout')), 5000))
    ]).catch(err => console.warn('⚠ API keys table init skipped:', err.message));
    console.log('✓ API keys table initialized');

    // Start proof status polling service
    proofStatusPoller.start();
    console.log('✓ Proof status poller started');

    // Start alerting service
    alertingService.start();
    console.log('✓ Alerting service started');

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
      
      // Log feature flags configuration
      logFeatureFlags();
      logger.info('Identity verification provider:', {
        provider: features.usePersona ? 'Persona' : 'Stripe Identity',
        rollbackAvailable: true,
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

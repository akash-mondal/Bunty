/**
 * Test application setup for integration tests
 * Creates an Express app instance without starting the server
 */

import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth.routes';
import plaidRoutes from '../routes/plaid.routes';
import stripeRoutes from '../routes/stripe.routes';
import witnessRoutes from '../routes/witness.routes';
import proofRoutes from '../routes/proof.routes';
import { corsOptions } from '../middleware/cors.middleware';
import { sanitizeInput, preventNoSQLInjection, limitBodySize } from '../middleware/sanitization.middleware';

export function createTestApp() {
  const app = express();

  // Security Middleware
  app.use(cors(corsOptions));

  // Stripe webhook route needs raw body
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

  // Body parsing with size limit
  app.use(express.json({ limit: '100kb' }));
  app.use(limitBodySize(100));

  // Input sanitization
  app.use(sanitizeInput);
  app.use(preventNoSQLInjection);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/plaid', plaidRoutes);
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/witness', witnessRoutes);
  app.use('/api/proof', proofRoutes);

  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Test error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
        timestamp: Date.now()
      }
    });
  });

  return app;
}

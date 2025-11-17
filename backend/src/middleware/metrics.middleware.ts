import { Request, Response, NextFunction } from 'express';
import metricsService from '../services/metrics.service';

/**
 * Middleware to track API metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Track metrics asynchronously (don't block response)
    setImmediate(() => {
      metricsService.trackAPIResponseTime(endpoint, duration);
      metricsService.trackAPIRequest(endpoint, res.statusCode);
    });

    return originalSend.call(this, data);
  };

  next();
};

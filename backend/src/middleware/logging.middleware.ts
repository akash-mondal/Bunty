import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Middleware to log incoming requests
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Log response
    logger.http('Outgoing response', {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.id,
    });

    return originalSend.call(this, data);
  };

  next();
};

// Middleware to log errors with stack traces
export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction) => {
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userId: (req as any).user?.id,
    },
  });

  next(err);
};

// Audit trail logger for proof submissions
export const auditProofSubmission = (
  userId: string,
  proofId: string,
  action: 'generated' | 'submitted' | 'confirmed' | 'failed',
  metadata?: Record<string, any>
) => {
  logger.info('Proof submission audit', {
    audit: true,
    userId,
    proofId,
    action,
    timestamp: new Date().toISOString(),
    metadata,
  });
};

// Audit trail logger for authentication events
export const auditAuthEvent = (
  userId: string | undefined,
  action: 'login' | 'logout' | 'register' | 'refresh' | 'failed_login',
  metadata?: Record<string, any>
) => {
  logger.info('Authentication audit', {
    audit: true,
    userId: userId || 'unknown',
    action,
    timestamp: new Date().toISOString(),
    metadata,
  });
};

// Audit trail logger for external service calls
export const auditExternalService = (
  service: 'plaid' | 'stripe' | 'sila' | 'midnight',
  action: string,
  userId: string,
  success: boolean,
  metadata?: Record<string, any>
) => {
  logger.info('External service audit', {
    audit: true,
    service,
    action,
    userId,
    success,
    timestamp: new Date().toISOString(),
    metadata,
  });
};

// Audit trail logger for sensitive operations
export const auditSensitiveOperation = (
  operation: string,
  userId: string,
  success: boolean,
  metadata?: Record<string, any>
) => {
  logger.warn('Sensitive operation audit', {
    audit: true,
    operation,
    userId,
    success,
    timestamp: new Date().toISOString(),
    metadata,
  });
};

import { Request, Response, NextFunction } from 'express';

/**
 * Sanitization middleware to prevent injection attacks
 * Removes potentially dangerous characters and patterns from user input
 */

/**
 * Sanitize a string value by removing dangerous characters
 */
const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value;

  // Remove null bytes
  let sanitized = value.replace(/\0/g, '');

  // Remove SQL injection patterns (basic protection, use parameterized queries as primary defense)
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi, '');

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove excessive whitespace
  sanitized = sanitized.trim();

  return sanitized;
};

/**
 * Recursively sanitize an object
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize both key and value
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    // If sanitization fails, still proceed but log the error
    next();
  }
};

/**
 * Middleware to prevent NoSQL injection for MongoDB-like queries
 * (Not directly applicable to PostgreSQL, but useful for Redis or future NoSQL integration)
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction): void => {
  const checkForInjection = (obj: any): boolean => {
    if (obj === null || obj === undefined) return false;

    if (typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key.startsWith('_')) {
          return true;
        }
        if (checkForInjection(obj[key])) {
          return true;
        }
      }
    }

    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    res.status(400).json({
      error: {
        code: 'INJECTION_001',
        message: 'Potentially malicious input detected',
        timestamp: Date.now(),
      },
    });
    return;
  }

  next();
};

/**
 * Middleware to limit request body size
 */
export const limitBodySize = (maxSizeKB: number = 100) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      
      if (sizeKB > maxSizeKB) {
        res.status(413).json({
          error: {
            code: 'PAYLOAD_001',
            message: `Request body too large. Maximum size is ${maxSizeKB}KB`,
            timestamp: Date.now(),
          },
        });
        return;
      }
    }

    next();
  };
};

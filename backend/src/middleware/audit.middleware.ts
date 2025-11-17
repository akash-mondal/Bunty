import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

/**
 * Audit logging middleware for sensitive operations
 * Logs important actions to database for compliance and security monitoring
 */

export interface AuditLog {
  userId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Create audit logs table if it doesn't exist
 */
export const initAuditTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      method VARCHAR(10) NOT NULL,
      path VARCHAR(500) NOT NULL,
      ip VARCHAR(45) NOT NULL,
      user_agent TEXT,
      status_code INTEGER,
      error_message TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `;

  try {
    await pool.query(createTableQuery);
    console.log('Audit logs table initialized');
  } catch (error) {
    console.error('Failed to initialize audit logs table:', error);
  }
};

/**
 * Write audit log to database
 */
export const writeAuditLog = async (log: AuditLog): Promise<void> => {
  const query = `
    INSERT INTO audit_logs (
      user_id, action, resource, method, path, ip, user_agent,
      status_code, error_message, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  const values = [
    log.userId || null,
    log.action,
    log.resource,
    log.method,
    log.path,
    log.ip,
    log.userAgent || null,
    log.statusCode || null,
    log.errorMessage || null,
    log.metadata ? JSON.stringify(log.metadata) : null,
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw error to avoid disrupting the main request flow
  }
};

/**
 * Determine action type from request
 */
const getActionType = (req: Request): string => {
  const path = req.path.toLowerCase();

  // Authentication actions
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/register')) return 'REGISTER';
  if (path.includes('/logout')) return 'LOGOUT';
  if (path.includes('/refresh')) return 'TOKEN_REFRESH';

  // Proof actions
  if (path.includes('/proof/submit')) return 'PROOF_SUBMIT';
  if (path.includes('/proof/commit-hash')) return 'HASH_COMMIT';

  // Witness actions
  if (path.includes('/witness/generate')) return 'WITNESS_GENERATE';

  // Financial data access
  if (path.includes('/plaid')) return 'PLAID_ACCESS';
  if (path.includes('/stripe')) return 'STRIPE_ACCESS';
  if (path.includes('/sila')) return 'SILA_ACCESS';

  // Default
  return req.method;
};

/**
 * Determine resource type from request
 */
const getResourceType = (req: Request): string => {
  const path = req.path.toLowerCase();

  if (path.includes('/auth')) return 'AUTH';
  if (path.includes('/proof')) return 'PROOF';
  if (path.includes('/witness')) return 'WITNESS';
  if (path.includes('/plaid')) return 'PLAID';
  if (path.includes('/stripe')) return 'STRIPE';
  if (path.includes('/sila')) return 'SILA';
  if (path.includes('/indexer')) return 'INDEXER';

  return 'UNKNOWN';
};

/**
 * Middleware to audit sensitive operations
 */
export const auditLog = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function (data: any): Response {
    res.send = originalSend;

    // Only log sensitive operations
    const sensitiveActions = [
      'LOGIN', 'REGISTER', 'LOGOUT', 'TOKEN_REFRESH',
      'PROOF_SUBMIT', 'HASH_COMMIT', 'WITNESS_GENERATE',
      'PLAID_ACCESS', 'STRIPE_ACCESS', 'SILA_ACCESS'
    ];

    const action = getActionType(req);

    if (sensitiveActions.includes(action)) {
      const log: AuditLog = {
        userId: req.user?.userId,
        action,
        resource: getResourceType(req),
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        timestamp: new Date(),
        metadata: {
          duration: Date.now() - startTime,
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
        },
      };

      // Add error message if response is an error
      if (res.statusCode >= 400) {
        try {
          const responseData = typeof data === 'string' ? JSON.parse(data) : data;
          if (responseData?.error?.message) {
            log.errorMessage = responseData.error.message;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Write audit log asynchronously
      writeAuditLog(log).catch(err => {
        console.error('Audit log write failed:', err);
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Query audit logs (for admin/monitoring purposes)
 */
export const getAuditLogs = async (filters: {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLog[]> => {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const values: any[] = [];
  let paramCount = 1;

  if (filters.userId) {
    query += ` AND user_id = $${paramCount++}`;
    values.push(filters.userId);
  }

  if (filters.action) {
    query += ` AND action = $${paramCount++}`;
    values.push(filters.action);
  }

  if (filters.startDate) {
    query += ` AND created_at >= $${paramCount++}`;
    values.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ` AND created_at <= $${paramCount++}`;
    values.push(filters.endDate);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ` LIMIT $${paramCount++}`;
    values.push(filters.limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
};

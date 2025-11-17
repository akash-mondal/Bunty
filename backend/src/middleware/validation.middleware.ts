import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Generic validation middleware factory
 * Validates request body, query, or params against a Zod schema
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_001',
            message: 'Validation failed',
            details: error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            timestamp: Date.now(),
          },
        });
      } else {
        res.status(400).json({
          error: {
            code: 'VALIDATION_002',
            message: 'Invalid request data',
            timestamp: Date.now(),
          },
        });
      }
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  uuid: z.string().uuid('Invalid UUID format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  url: z.string().url('Invalid URL format'),
};

/**
 * Authentication validation schemas
 */
export const authSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
  refresh: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

/**
 * Plaid validation schemas
 */
export const plaidSchemas = {
  exchange: z.object({
    publicToken: z.string().min(1, 'Public token is required'),
  }),
};

/**
 * Stripe validation schemas
 */
export const stripeSchemas = {
  createSession: z.object({
    returnUrl: commonSchemas.url.optional(),
  }),
};

/**
 * Sila validation schemas
 */
export const silaSchemas = {
  register: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'State must be 2 characters'),
    zip: z.string().min(5, 'ZIP code is required'),
    phone: z.string().min(10, 'Phone number is required'),
    ssn: z.string().length(9, 'SSN must be 9 digits'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  }),
  linkBank: z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
    accountType: z.enum(['checking', 'savings']),
  }),
  transfer: z.object({
    amount: commonSchemas.positiveNumber,
    destination: z.string().min(1, 'Destination is required'),
  }),
};

/**
 * Proof validation schemas
 */
export const proofSchemas = {
  submit: z.object({
    proof: z.string().min(1, 'Proof is required'),
    publicInputs: z.array(z.string()),
    nullifier: z.string().min(1, 'Nullifier is required'),
    threshold: commonSchemas.positiveNumber,
    signedTx: z.string().min(1, 'Signed transaction is required'),
  }),
  commitHash: z.object({
    witnessHash: z.string().length(64, 'Witness hash must be 64 characters (SHA-256)'),
  }),
};

/**
 * Witness validation schemas
 */
export const witnessSchemas = {
  generate: z.object({
    includeIncome: z.boolean().optional(),
    includeAssets: z.boolean().optional(),
    includeLiabilities: z.boolean().optional(),
    includeSignal: z.boolean().optional(),
  }),
};

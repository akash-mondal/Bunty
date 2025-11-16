import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: {
        code: 'AUTH_001',
        message: 'Access token is required',
        timestamp: Date.now()
      }
    });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      error: {
        code: 'AUTH_002',
        message: 'Invalid or expired access token',
        timestamp: Date.now()
      }
    });
  }
};

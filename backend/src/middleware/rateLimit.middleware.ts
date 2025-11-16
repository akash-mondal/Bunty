import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100
};

export const createRateLimiter = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const endpoint = req.path;
    const key = `rate_limit:${ip}:${endpoint}`;

    try {
      const current = await redisClient.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= finalConfig.maxRequests) {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_001',
            message: 'Too many requests, please try again later',
            timestamp: Date.now()
          }
        });
        return;
      }

      const newCount = count + 1;
      const ttl = Math.ceil(finalConfig.windowMs / 1000);

      if (count === 0) {
        await redisClient.setEx(key, ttl, newCount.toString());
      } else {
        await redisClient.set(key, newCount.toString(), { KEEPTTL: true });
      }

      res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (finalConfig.maxRequests - newCount).toString());

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // If Redis fails, allow the request to proceed
      next();
    }
  };
};

// Stricter rate limit for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 5
});

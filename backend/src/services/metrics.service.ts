import redisClient from '../config/redis';
import logger from '../utils/logger';

interface ProofMetrics {
  totalGenerated: number;
  totalSubmitted: number;
  totalConfirmed: number;
  totalFailed: number;
  successRate: number;
  avgGenerationTime: number;
}

interface APIMetrics {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  requestsByEndpoint: Record<string, number>;
}

interface ExternalServiceMetrics {
  plaid: { uptime: number; avgResponseTime: number };
  stripe: { uptime: number; avgResponseTime: number };
  sila: { uptime: number; avgResponseTime: number };
  midnight: { uptime: number; avgResponseTime: number };
}

class MetricsService {
  private readonly METRICS_PREFIX = 'metrics:';
  private readonly RETENTION_DAYS = 7;

  /**
   * Track API response time
   */
  async trackAPIResponseTime(endpoint: string, duration: number): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}api:response_time:${endpoint}`;
      const timestamp = Date.now();

      await redisClient.zAdd(key, {
        score: timestamp,
        value: JSON.stringify({ duration, timestamp }),
      });

      // Set expiry for cleanup
      await redisClient.expire(key, 60 * 60 * 24 * this.RETENTION_DAYS);
    } catch (error) {
      logger.error('Failed to track API response time', { error, endpoint, duration });
    }
  }

  /**
   * Track API request count
   */
  async trackAPIRequest(endpoint: string, statusCode: number): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}api:requests:${endpoint}`;
      await redisClient.incr(key);
      await redisClient.expire(key, 60 * 60 * 24 * this.RETENTION_DAYS);

      // Track errors separately
      if (statusCode >= 400) {
        const errorKey = `${this.METRICS_PREFIX}api:errors:${endpoint}`;
        await redisClient.incr(errorKey);
        await redisClient.expire(errorKey, 60 * 60 * 24 * this.RETENTION_DAYS);
      }
    } catch (error) {
      logger.error('Failed to track API request', { error, endpoint, statusCode });
    }
  }

  /**
   * Track proof generation
   */
  async trackProofGeneration(
    userId: string,
    circuit: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    try {
      const statusKey = success
        ? `${this.METRICS_PREFIX}proof:generated`
        : `${this.METRICS_PREFIX}proof:failed`;
      await redisClient.incr(statusKey);
      await redisClient.expire(statusKey, 60 * 60 * 24 * this.RETENTION_DAYS);

      // Track generation time
      if (success) {
        const timeKey = `${this.METRICS_PREFIX}proof:generation_time`;
        const timestamp = Date.now();
        await redisClient.zAdd(timeKey, {
          score: timestamp,
          value: JSON.stringify({ duration, timestamp, circuit }),
        });
        await redisClient.expire(timeKey, 60 * 60 * 24 * this.RETENTION_DAYS);
      }

      logger.info('Proof generation tracked', { userId, circuit, success, duration });
    } catch (error) {
      logger.error('Failed to track proof generation', { error, userId, circuit });
    }
  }

  /**
   * Track proof submission
   */
  async trackProofSubmission(proofId: string, status: 'submitted' | 'confirmed' | 'failed'): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}proof:${status}`;
      await redisClient.incr(key);
      await redisClient.expire(key, 60 * 60 * 24 * this.RETENTION_DAYS);

      logger.info('Proof submission tracked', { proofId, status });
    } catch (error) {
      logger.error('Failed to track proof submission', { error, proofId, status });
    }
  }

  /**
   * Track transaction confirmation time
   */
  async trackTransactionConfirmation(txHash: string, duration: number): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}tx:confirmation_time`;
      const timestamp = Date.now();

      await redisClient.zAdd(key, {
        score: timestamp,
        value: JSON.stringify({ duration, timestamp, txHash }),
      });
      await redisClient.expire(key, 60 * 60 * 24 * this.RETENTION_DAYS);

      logger.info('Transaction confirmation tracked', { txHash, duration });
    } catch (error) {
      logger.error('Failed to track transaction confirmation', { error, txHash, duration });
    }
  }

  /**
   * Track external service call
   */
  async trackExternalService(
    service: 'plaid' | 'stripe' | 'sila' | 'midnight',
    success: boolean,
    duration: number
  ): Promise<void> {
    try {
      const statusKey = success
        ? `${this.METRICS_PREFIX}service:${service}:success`
        : `${this.METRICS_PREFIX}service:${service}:failure`;
      await redisClient.incr(statusKey);
      await redisClient.expire(statusKey, 60 * 60 * 24 * this.RETENTION_DAYS);

      // Track response time
      const timeKey = `${this.METRICS_PREFIX}service:${service}:response_time`;
      const timestamp = Date.now();
      await redisClient.zAdd(timeKey, {
        score: timestamp,
        value: JSON.stringify({ duration, timestamp, success }),
      });
      await redisClient.expire(timeKey, 60 * 60 * 24 * this.RETENTION_DAYS);

      logger.debug('External service call tracked', { service, success, duration });
    } catch (error) {
      logger.error('Failed to track external service', { error, service });
    }
  }

  /**
   * Get proof metrics
   */
  async getProofMetrics(): Promise<ProofMetrics> {
    try {
      const [generated, submitted, confirmed, failed] = await Promise.all([
        redisClient.get(`${this.METRICS_PREFIX}proof:generated`),
        redisClient.get(`${this.METRICS_PREFIX}proof:submitted`),
        redisClient.get(`${this.METRICS_PREFIX}proof:confirmed`),
        redisClient.get(`${this.METRICS_PREFIX}proof:failed`),
      ]);

      const totalGenerated = parseInt(generated || '0');
      const totalSubmitted = parseInt(submitted || '0');
      const totalConfirmed = parseInt(confirmed || '0');
      const totalFailed = parseInt(failed || '0');

      const successRate =
        totalGenerated > 0 ? (totalConfirmed / totalGenerated) * 100 : 0;

      // Calculate average generation time
      const timeKey = `${this.METRICS_PREFIX}proof:generation_time`;
      const times = await redisClient.zRange(timeKey, 0, -1);
      let avgGenerationTime = 0;

      if (times.length > 0) {
        const durations = times.map((t: string) => JSON.parse(t).duration);
        avgGenerationTime =
          durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length;
      }

      return {
        totalGenerated,
        totalSubmitted,
        totalConfirmed,
        totalFailed,
        successRate: Math.round(successRate * 100) / 100,
        avgGenerationTime: Math.round(avgGenerationTime),
      };
    } catch (error) {
      logger.error('Failed to get proof metrics', { error });
      return {
        totalGenerated: 0,
        totalSubmitted: 0,
        totalConfirmed: 0,
        totalFailed: 0,
        successRate: 0,
        avgGenerationTime: 0,
      };
    }
  }

  /**
   * Get API metrics
   */
  async getAPIMetrics(): Promise<APIMetrics> {
    try {
      const keys = await redisClient.keys(`${this.METRICS_PREFIX}api:requests:*`);
      const requestsByEndpoint: Record<string, number> = {};
      let totalRequests = 0;

      for (const key of keys) {
        const endpoint = key.replace(`${this.METRICS_PREFIX}api:requests:`, '');
        const count = parseInt((await redisClient.get(key)) || '0');
        requestsByEndpoint[endpoint] = count;
        totalRequests += count;
      }

      // Calculate average response time
      const responseTimeKeys = await redisClient.keys(
        `${this.METRICS_PREFIX}api:response_time:*`
      );
      let totalDuration = 0;
      let totalMeasurements = 0;

      for (const key of responseTimeKeys) {
        const times = await redisClient.zRange(key, 0, -1);
        for (const time of times) {
          const { duration } = JSON.parse(time);
          totalDuration += duration;
          totalMeasurements++;
        }
      }

      const avgResponseTime =
        totalMeasurements > 0 ? totalDuration / totalMeasurements : 0;

      // Calculate error rate
      const errorKeys = await redisClient.keys(`${this.METRICS_PREFIX}api:errors:*`);
      let totalErrors = 0;

      for (const key of errorKeys) {
        const count = parseInt((await redisClient.get(key)) || '0');
        totalErrors += count;
      }

      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      return {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        requestsByEndpoint,
      };
    } catch (error) {
      logger.error('Failed to get API metrics', { error });
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        requestsByEndpoint: {},
      };
    }
  }

  /**
   * Get external service metrics
   */
  async getExternalServiceMetrics(): Promise<ExternalServiceMetrics> {
    try {
      const services = ['plaid', 'stripe', 'sila', 'midnight'] as const;
      const metrics: any = {};

      for (const service of services) {
        const [success, failure] = await Promise.all([
          redisClient.get(`${this.METRICS_PREFIX}service:${service}:success`),
          redisClient.get(`${this.METRICS_PREFIX}service:${service}:failure`),
        ]);

        const successCount = parseInt(success || '0');
        const failureCount = parseInt(failure || '0');
        const totalCalls = successCount + failureCount;
        const uptime = totalCalls > 0 ? (successCount / totalCalls) * 100 : 100;

        // Calculate average response time
        const timeKey = `${this.METRICS_PREFIX}service:${service}:response_time`;
        const times = await redisClient.zRange(timeKey, 0, -1);
        let avgResponseTime = 0;

        if (times.length > 0) {
          const durations = times.map((t: string) => JSON.parse(t).duration);
          avgResponseTime =
            durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length;
        }

        metrics[service] = {
          uptime: Math.round(uptime * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime),
        };
      }

      return metrics as ExternalServiceMetrics;
    } catch (error) {
      logger.error('Failed to get external service metrics', { error });
      return {
        plaid: { uptime: 0, avgResponseTime: 0 },
        stripe: { uptime: 0, avgResponseTime: 0 },
        sila: { uptime: 0, avgResponseTime: 0 },
        midnight: { uptime: 0, avgResponseTime: 0 },
      };
    }
  }

  /**
   * Get all metrics
   */
  async getAllMetrics() {
    const [proofMetrics, apiMetrics, serviceMetrics] = await Promise.all([
      this.getProofMetrics(),
      this.getAPIMetrics(),
      this.getExternalServiceMetrics(),
    ]);

    return {
      proof: proofMetrics,
      api: apiMetrics,
      externalServices: serviceMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics (for testing or maintenance)
   */
  async resetMetrics(): Promise<void> {
    try {
      const keys = await redisClient.keys(`${this.METRICS_PREFIX}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      logger.info('All metrics reset');
    } catch (error) {
      logger.error('Failed to reset metrics', { error });
    }
  }
}

export default new MetricsService();

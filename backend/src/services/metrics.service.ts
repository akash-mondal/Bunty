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
  persona: { uptime: number; avgResponseTime: number };
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
    service: 'plaid' | 'stripe' | 'sila' | 'midnight' | 'persona',
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
   * Track Persona verification attempt
   */
  async trackPersonaVerification(
    userId: string,
    inquiryId: string,
    status: 'created' | 'completed' | 'failed' | 'expired'
  ): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}persona:verification:${status}`;
      await redisClient.incr(key);
      await redisClient.expire(key, 60 * 60 * 24 * this.RETENTION_DAYS);

      logger.info('Persona verification tracked', { userId, inquiryId, status });
    } catch (error) {
      logger.error('Failed to track Persona verification', { error, userId, inquiryId });
    }
  }

  /**
   * Track Persona webhook delivery
   */
  async trackPersonaWebhook(
    eventType: string,
    success: boolean,
    processingTime: number
  ): Promise<void> {
    try {
      const statusKey = success
        ? `${this.METRICS_PREFIX}persona:webhook:success`
        : `${this.METRICS_PREFIX}persona:webhook:failure`;
      await redisClient.incr(statusKey);
      await redisClient.expire(statusKey, 60 * 60 * 24 * this.RETENTION_DAYS);

      // Track processing time
      const timeKey = `${this.METRICS_PREFIX}persona:webhook:processing_time`;
      const timestamp = Date.now();
      await redisClient.zAdd(timeKey, {
        score: timestamp,
        value: JSON.stringify({ processingTime, timestamp, eventType, success }),
      });
      await redisClient.expire(timeKey, 60 * 60 * 24 * this.RETENTION_DAYS);

      logger.debug('Persona webhook tracked', { eventType, success, processingTime });
    } catch (error) {
      logger.error('Failed to track Persona webhook', { error, eventType });
    }
  }

  /**
   * Get Persona-specific metrics
   */
  async getPersonaMetrics() {
    try {
      const [created, completed, failed, expired, webhookSuccess, webhookFailure] = await Promise.all([
        redisClient.get(`${this.METRICS_PREFIX}persona:verification:created`),
        redisClient.get(`${this.METRICS_PREFIX}persona:verification:completed`),
        redisClient.get(`${this.METRICS_PREFIX}persona:verification:failed`),
        redisClient.get(`${this.METRICS_PREFIX}persona:verification:expired`),
        redisClient.get(`${this.METRICS_PREFIX}persona:webhook:success`),
        redisClient.get(`${this.METRICS_PREFIX}persona:webhook:failure`),
      ]);

      const totalCreated = parseInt(created || '0');
      const totalCompleted = parseInt(completed || '0');
      const totalFailed = parseInt(failed || '0');
      const totalExpired = parseInt(expired || '0');
      const totalWebhookSuccess = parseInt(webhookSuccess || '0');
      const totalWebhookFailure = parseInt(webhookFailure || '0');

      const completionRate = totalCreated > 0 ? (totalCompleted / totalCreated) * 100 : 0;
      const failureRate = totalCreated > 0 ? (totalFailed / totalCreated) * 100 : 0;
      const totalWebhooks = totalWebhookSuccess + totalWebhookFailure;
      const webhookSuccessRate = totalWebhooks > 0 ? (totalWebhookSuccess / totalWebhooks) * 100 : 100;

      // Calculate average webhook processing time
      const timeKey = `${this.METRICS_PREFIX}persona:webhook:processing_time`;
      const times = await redisClient.zRange(timeKey, 0, -1);
      let avgProcessingTime = 0;

      if (times.length > 0) {
        const durations = times.map((t: string) => JSON.parse(t).processingTime);
        avgProcessingTime =
          durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length;
      }

      return {
        verifications: {
          created: totalCreated,
          completed: totalCompleted,
          failed: totalFailed,
          expired: totalExpired,
          completionRate: Math.round(completionRate * 100) / 100,
          failureRate: Math.round(failureRate * 100) / 100,
        },
        webhooks: {
          totalDelivered: totalWebhooks,
          successful: totalWebhookSuccess,
          failed: totalWebhookFailure,
          successRate: Math.round(webhookSuccessRate * 100) / 100,
          avgProcessingTime: Math.round(avgProcessingTime),
        },
      };
    } catch (error) {
      logger.error('Failed to get Persona metrics', { error });
      return {
        verifications: {
          created: 0,
          completed: 0,
          failed: 0,
          expired: 0,
          completionRate: 0,
          failureRate: 0,
        },
        webhooks: {
          totalDelivered: 0,
          successful: 0,
          failed: 0,
          successRate: 100,
          avgProcessingTime: 0,
        },
      };
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
      const services = ['plaid', 'stripe', 'sila', 'midnight', 'persona'] as const;
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
        persona: { uptime: 0, avgResponseTime: 0 },
      };
    }
  }

  /**
   * Get all metrics
   */
  async getAllMetrics() {
    const [proofMetrics, apiMetrics, serviceMetrics, personaMetrics] = await Promise.all([
      this.getProofMetrics(),
      this.getAPIMetrics(),
      this.getExternalServiceMetrics(),
      this.getPersonaMetrics(),
    ]);

    return {
      proof: proofMetrics,
      api: apiMetrics,
      externalServices: serviceMetrics,
      persona: personaMetrics,
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

import logger from '../utils/logger';
import metricsService from './metrics.service';
import pool from '../config/database';

interface AlertConfig {
  enabled: boolean;
  threshold: number;
  cooldownMinutes: number;
}

interface AlertState {
  lastAlertTime: number;
  alertCount: number;
}

class AlertingService {
  private alertStates: Map<string, AlertState> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  // Alert configurations
  private readonly alertConfigs = {
    apiDowntime: {
      enabled: true,
      threshold: 5, // 5 consecutive failures
      cooldownMinutes: 15,
    },
    proofGenerationFailure: {
      enabled: true,
      threshold: 3, // 3 failures in monitoring window
      cooldownMinutes: 10,
    },
    databaseConnection: {
      enabled: true,
      threshold: 1, // Alert immediately
      cooldownMinutes: 5,
    },
    highErrorRate: {
      enabled: true,
      threshold: 10, // 10% error rate
      cooldownMinutes: 15,
    },
    externalServiceFailure: {
      enabled: true,
      threshold: 5, // 5 consecutive failures
      cooldownMinutes: 10,
    },
    personaVerificationFailure: {
      enabled: true,
      threshold: 20, // 20% failure rate
      cooldownMinutes: 15,
    },
    personaWebhookFailure: {
      enabled: true,
      threshold: 10, // 10% webhook failure rate
      cooldownMinutes: 10,
    },
    personaLowCompletionRate: {
      enabled: true,
      threshold: 70, // Below 70% completion rate
      cooldownMinutes: 20,
    },
  };

  /**
   * Start the alerting monitoring service
   */
  start() {
    if (this.isMonitoring) {
      logger.info('Alerting service is already running');
      return;
    }

    logger.info('Starting alerting service...');
    this.isMonitoring = true;

    // Run checks every minute
    this.monitoringInterval = setInterval(() => {
      this.runHealthChecks();
    }, 60000);

    // Run immediately on start
    this.runHealthChecks();
  }

  /**
   * Stop the alerting monitoring service
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Alerting service stopped');
  }

  /**
   * Run all health checks
   */
  private async runHealthChecks() {
    try {
      await Promise.all([
        this.checkAPIHealth(),
        this.checkProofGenerationHealth(),
        this.checkDatabaseHealth(),
        this.checkErrorRate(),
        this.checkExternalServices(),
        this.checkPersonaHealth(),
      ]);
    } catch (error) {
      logger.error('Error running health checks', { error });
    }
  }

  /**
   * Check API health
   */
  private async checkAPIHealth() {
    try {
      const metrics = await metricsService.getAPIMetrics();
      
      // Check if error rate is too high
      if (metrics.errorRate > this.alertConfigs.highErrorRate.threshold) {
        this.triggerAlert(
          'highErrorRate',
          'High API Error Rate',
          `API error rate is ${metrics.errorRate.toFixed(2)}%, exceeding threshold of ${this.alertConfigs.highErrorRate.threshold}%`,
          { errorRate: metrics.errorRate, totalRequests: metrics.totalRequests }
        );
      }
    } catch (error) {
      logger.error('Error checking API health', { error });
    }
  }

  /**
   * Check proof generation health
   */
  private async checkProofGenerationHealth() {
    try {
      const metrics = await metricsService.getProofMetrics();
      
      // Check if proof generation failure rate is too high
      const failureRate = metrics.totalGenerated > 0 
        ? (metrics.totalFailed / metrics.totalGenerated) * 100 
        : 0;

      if (failureRate > 20 && metrics.totalFailed >= this.alertConfigs.proofGenerationFailure.threshold) {
        this.triggerAlert(
          'proofGenerationFailure',
          'High Proof Generation Failure Rate',
          `Proof generation failure rate is ${failureRate.toFixed(2)}% with ${metrics.totalFailed} failures`,
          { 
            failureRate, 
            totalFailed: metrics.totalFailed, 
            totalGenerated: metrics.totalGenerated 
          }
        );
      }
    } catch (error) {
      logger.error('Error checking proof generation health', { error });
    }
  }

  /**
   * Check database connection health
   */
  private async checkDatabaseHealth() {
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      this.triggerAlert(
        'databaseConnection',
        'Database Connection Failed',
        'Unable to connect to PostgreSQL database',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Check error rate
   */
  private async checkErrorRate() {
    try {
      const metrics = await metricsService.getAPIMetrics();
      
      if (metrics.errorRate > this.alertConfigs.highErrorRate.threshold) {
        this.triggerAlert(
          'highErrorRate',
          'High Error Rate Detected',
          `System error rate is ${metrics.errorRate.toFixed(2)}%`,
          { errorRate: metrics.errorRate }
        );
      }
    } catch (error) {
      logger.error('Error checking error rate', { error });
    }
  }

  /**
   * Check external services health
   */
  private async checkExternalServices() {
    try {
      const metrics = await metricsService.getExternalServiceMetrics();
      
      const services = ['plaid', 'stripe', 'sila', 'midnight'] as const;
      
      for (const service of services) {
        const serviceMetrics = metrics[service];
        
        // Alert if uptime is below 90%
        if (serviceMetrics.uptime < 90) {
          this.triggerAlert(
            `externalService_${service}`,
            `External Service Degraded: ${service}`,
            `${service} service uptime is ${serviceMetrics.uptime.toFixed(2)}%`,
            { service, uptime: serviceMetrics.uptime, avgResponseTime: serviceMetrics.avgResponseTime }
          );
        }
      }
    } catch (error) {
      logger.error('Error checking external services', { error });
    }
  }

  /**
   * Check Persona integration health
   */
  private async checkPersonaHealth() {
    try {
      const metrics = await metricsService.getPersonaMetrics();
      
      // Check verification failure rate
      if (
        metrics.verifications.failureRate > this.alertConfigs.personaVerificationFailure.threshold &&
        metrics.verifications.created >= 10 // Only alert if we have enough data
      ) {
        this.triggerAlert(
          'personaVerificationFailure',
          'High Persona Verification Failure Rate',
          `Persona verification failure rate is ${metrics.verifications.failureRate.toFixed(2)}% (${metrics.verifications.failed} failures out of ${metrics.verifications.created} attempts)`,
          {
            failureRate: metrics.verifications.failureRate,
            totalFailed: metrics.verifications.failed,
            totalCreated: metrics.verifications.created,
          }
        );
      }

      // Check verification completion rate
      if (
        metrics.verifications.completionRate < this.alertConfigs.personaLowCompletionRate.threshold &&
        metrics.verifications.created >= 10 // Only alert if we have enough data
      ) {
        this.triggerAlert(
          'personaLowCompletionRate',
          'Low Persona Verification Completion Rate',
          `Persona verification completion rate is ${metrics.verifications.completionRate.toFixed(2)}% (${metrics.verifications.completed} completed out of ${metrics.verifications.created} attempts)`,
          {
            completionRate: metrics.verifications.completionRate,
            totalCompleted: metrics.verifications.completed,
            totalCreated: metrics.verifications.created,
          }
        );
      }

      // Check webhook delivery success rate
      if (
        metrics.webhooks.successRate < (100 - this.alertConfigs.personaWebhookFailure.threshold) &&
        metrics.webhooks.totalDelivered >= 5 // Only alert if we have enough data
      ) {
        this.triggerAlert(
          'personaWebhookFailure',
          'High Persona Webhook Failure Rate',
          `Persona webhook failure rate is ${(100 - metrics.webhooks.successRate).toFixed(2)}% (${metrics.webhooks.failed} failures out of ${metrics.webhooks.totalDelivered} webhooks)`,
          {
            successRate: metrics.webhooks.successRate,
            totalFailed: metrics.webhooks.failed,
            totalDelivered: metrics.webhooks.totalDelivered,
            avgProcessingTime: metrics.webhooks.avgProcessingTime,
          }
        );
      }

      // Check Persona API uptime from external service metrics
      const serviceMetrics = await metricsService.getExternalServiceMetrics();
      if (serviceMetrics.persona.uptime < 95) {
        this.triggerAlert(
          'externalService_persona',
          'Persona API Degraded',
          `Persona API uptime is ${serviceMetrics.persona.uptime.toFixed(2)}%`,
          {
            service: 'persona',
            uptime: serviceMetrics.persona.uptime,
            avgResponseTime: serviceMetrics.persona.avgResponseTime,
          }
        );
      }
    } catch (error) {
      logger.error('Error checking Persona health', { error });
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    alertKey: string,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    const config = this.getAlertConfig(alertKey);
    
    if (!config.enabled) {
      return;
    }

    // Check cooldown
    const state = this.alertStates.get(alertKey);
    const now = Date.now();
    
    if (state) {
      const cooldownMs = config.cooldownMinutes * 60 * 1000;
      if (now - state.lastAlertTime < cooldownMs) {
        // Still in cooldown period
        return;
      }
    }

    // Update alert state
    this.alertStates.set(alertKey, {
      lastAlertTime: now,
      alertCount: (state?.alertCount || 0) + 1,
    });

    // Log the alert
    logger.warn('ALERT TRIGGERED', {
      alert: true,
      alertKey,
      title,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // In production, you would send this to:
    // - Email (via SendGrid, AWS SES, etc.)
    // - Slack/Discord webhook
    // - PagerDuty
    // - SMS (via Twilio)
    // - Monitoring service (Datadog, New Relic, etc.)
    
    this.sendAlertNotification(title, message, metadata);
  }

  /**
   * Send alert notification through configured channels
   */
  private async sendAlertNotification(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    const notifications: Promise<void>[] = [];

    // Send to all configured channels
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      notifications.push(this.sendEmailAlert(title, message, metadata));
    }

    if (process.env.ALERT_SLACK_ENABLED === 'true') {
      notifications.push(this.sendSlackAlert(title, message, metadata));
    }

    if (process.env.ALERT_WEBHOOK_ENABLED === 'true') {
      notifications.push(this.sendWebhookAlert(title, message, metadata));
    }

    if (process.env.ALERT_PAGERDUTY_ENABLED === 'true') {
      notifications.push(this.sendPagerDutyAlert(title, message, metadata));
    }

    // Execute all notifications in parallel
    try {
      await Promise.allSettled(notifications);
      logger.info('Alert notifications sent', { title, channels: notifications.length });
    } catch (error) {
      logger.error('Failed to send some alert notifications', { error, title });
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Using nodemailer or similar service
      // This is a placeholder - implement with your email service
      const emailConfig = {
        to: process.env.ALERT_EMAIL_TO || '',
        from: process.env.ALERT_EMAIL_FROM || '',
        subject: `[BUNTY ALERT] ${title}`,
        text: `${message}\n\nDetails:\n${JSON.stringify(metadata, null, 2)}`,
        html: `
          <h2 style="color: #dc2626;">🚨 ${title}</h2>
          <p>${message}</p>
          <h3>Details:</h3>
          <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px;">${JSON.stringify(metadata, null, 2)}</pre>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">
            Timestamp: ${new Date().toISOString()}<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        `,
      };

      logger.info('Email alert prepared', { to: emailConfig.to, subject: emailConfig.subject });
      
      // TODO: Implement actual email sending with nodemailer or AWS SES
      // Example with nodemailer:
      // const transporter = nodemailer.createTransport({ ... });
      // await transporter.sendMail(emailConfig);
      
    } catch (error) {
      logger.error('Failed to send email alert', { error, title });
      throw error;
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const webhookUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
      
      if (!webhookUrl) {
        logger.warn('Slack webhook URL not configured');
        return;
      }

      const axios = require('axios');
      
      const payload = {
        text: `🚨 *${title}*`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 ${title}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Environment:*\n${process.env.NODE_ENV || 'development'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Timestamp:*\n${new Date().toISOString()}`,
              },
            ],
          },
        ],
        attachments: metadata ? [
          {
            color: 'danger',
            text: `\`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``,
          },
        ] : [],
      };

      await axios.post(webhookUrl, payload);
      logger.info('Slack alert sent', { title });
      
    } catch (error) {
      logger.error('Failed to send Slack alert', { error, title });
      throw error;
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      
      if (!webhookUrl) {
        logger.warn('Webhook URL not configured');
        return;
      }

      const axios = require('axios');
      
      const payload = {
        alert: {
          title,
          message,
          severity: 'error',
          source: 'bunty-backend',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          metadata,
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication if configured
      if (process.env.ALERT_WEBHOOK_AUTH_HEADER) {
        headers['Authorization'] = process.env.ALERT_WEBHOOK_AUTH_HEADER;
      }

      await axios.post(webhookUrl, payload, { headers });
      logger.info('Webhook alert sent', { title, url: webhookUrl });
      
    } catch (error) {
      logger.error('Failed to send webhook alert', { error, title });
      throw error;
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const integrationKey = process.env.ALERT_PAGERDUTY_INTEGRATION_KEY;
      
      if (!integrationKey) {
        logger.warn('PagerDuty integration key not configured');
        return;
      }

      const axios = require('axios');
      
      const payload = {
        routing_key: integrationKey,
        event_action: 'trigger',
        payload: {
          summary: title,
          severity: 'error',
          source: 'bunty-backend',
          timestamp: new Date().toISOString(),
          custom_details: {
            message,
            environment: process.env.NODE_ENV || 'development',
            ...metadata,
          },
        },
      };

      await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
      logger.info('PagerDuty alert sent', { title });
      
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { error, title });
      throw error;
    }
  }

  /**
   * Get alert configuration
   */
  private getAlertConfig(alertKey: string): AlertConfig {
    // Extract base key (remove service-specific suffix)
    const baseKey = alertKey.split('_')[0];
    
    return (
      this.alertConfigs[baseKey as keyof typeof this.alertConfigs] || {
        enabled: true,
        threshold: 1,
        cooldownMinutes: 10,
      }
    );
  }

  /**
   * Manually trigger an alert (for testing)
   */
  async testAlert(alertType: string) {
    this.triggerAlert(
      `test_${alertType}`,
      'Test Alert',
      `This is a test alert for ${alertType}`,
      { test: true, alertType }
    );
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const stats: Record<string, any> = {};
    
    for (const [key, state] of this.alertStates.entries()) {
      stats[key] = {
        alertCount: state.alertCount,
        lastAlertTime: new Date(state.lastAlertTime).toISOString(),
        timeSinceLastAlert: Date.now() - state.lastAlertTime,
      };
    }
    
    return stats;
  }

  /**
   * Reset alert states (for testing or maintenance)
   */
  resetAlertStates() {
    this.alertStates.clear();
    logger.info('Alert states reset');
  }
}

export default new AlertingService();

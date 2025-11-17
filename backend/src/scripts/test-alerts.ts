import dotenv from 'dotenv';
import alertingService from '../services/alerting.service';
import logger from '../utils/logger';
import { connectRedis } from '../config/redis';
import pool from '../config/database';

dotenv.config({ path: '../../.env' });

/**
 * Test script for alerting system
 * 
 * Usage:
 *   npm run test:alerts
 *   npm run test:alerts -- --type=database
 *   npm run test:alerts -- --type=all
 */

interface TestAlertOptions {
  type?: string;
  all?: boolean;
}

async function testDatabaseAlert() {
  logger.info('Testing database connection alert...');
  
  try {
    // Simulate database connection failure by using invalid query
    await pool.query('SELECT * FROM non_existent_table');
  } catch (error) {
    logger.info('Database error triggered (expected)', { error: error instanceof Error ? error.message : 'Unknown' });
  }
}

async function testAPIDowntimeAlert() {
  logger.info('Testing API downtime alert...');
  
  await alertingService.testAlert('apiDowntime');
}

async function testProofGenerationAlert() {
  logger.info('Testing proof generation failure alert...');
  
  await alertingService.testAlert('proofGenerationFailure');
}

async function testHighErrorRateAlert() {
  logger.info('Testing high error rate alert...');
  
  await alertingService.testAlert('highErrorRate');
}

async function testExternalServiceAlert() {
  logger.info('Testing external service failure alert...');
  
  await alertingService.testAlert('externalServiceFailure');
}

async function testAllAlerts() {
  logger.info('Testing all alert types...\n');
  
  await testAPIDowntimeAlert();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testProofGenerationAlert();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testDatabaseAlert();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testHighErrorRateAlert();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testExternalServiceAlert();
}

async function displayAlertConfiguration() {
  logger.info('Current Alert Configuration:', {
    email: {
      enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
      from: process.env.ALERT_EMAIL_FROM || 'not configured',
      to: process.env.ALERT_EMAIL_TO || 'not configured',
    },
    slack: {
      enabled: process.env.ALERT_SLACK_ENABLED === 'true',
      webhookConfigured: !!process.env.ALERT_SLACK_WEBHOOK_URL,
    },
    webhook: {
      enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
      urlConfigured: !!process.env.ALERT_WEBHOOK_URL,
    },
    pagerduty: {
      enabled: process.env.ALERT_PAGERDUTY_ENABLED === 'true',
      keyConfigured: !!process.env.ALERT_PAGERDUTY_INTEGRATION_KEY,
    },
  });
}

async function displayAlertStats() {
  const stats = alertingService.getAlertStats();
  
  logger.info('Alert Statistics:', stats);
  
  if (Object.keys(stats).length === 0) {
    logger.info('No alerts have been triggered yet');
  }
}

async function runTests() {
  try {
    logger.info('='.repeat(60));
    logger.info('Bunty Alerting System Test');
    logger.info('='.repeat(60));
    logger.info('');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: TestAlertOptions = {};
    
    for (const arg of args) {
      if (arg.startsWith('--type=')) {
        options.type = arg.split('=')[1];
      } else if (arg === '--all') {
        options.all = true;
      }
    }
    
    // Display configuration
    await displayAlertConfiguration();
    logger.info('');
    
    // Connect to services
    logger.info('Connecting to Redis...');
    await connectRedis();
    logger.info('Redis connected');
    
    logger.info('Connecting to PostgreSQL...');
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connected');
    logger.info('');
    
    // Start alerting service
    logger.info('Starting alerting service...');
    alertingService.start();
    logger.info('Alerting service started');
    logger.info('');
    
    // Run tests based on options
    if (options.all || options.type === 'all') {
      await testAllAlerts();
    } else if (options.type === 'database') {
      await testDatabaseAlert();
    } else if (options.type === 'api') {
      await testAPIDowntimeAlert();
    } else if (options.type === 'proof') {
      await testProofGenerationAlert();
    } else if (options.type === 'error') {
      await testHighErrorRateAlert();
    } else if (options.type === 'service') {
      await testExternalServiceAlert();
    } else {
      // Default: run a single test alert
      logger.info('Running default test alert...');
      await alertingService.testAlert('test');
    }
    
    logger.info('');
    logger.info('Waiting for alerts to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Display statistics
    logger.info('');
    await displayAlertStats();
    
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Test completed successfully!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Check your configured alert channels for notifications:');
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      logger.info(`  - Email: ${process.env.ALERT_EMAIL_TO}`);
    }
    if (process.env.ALERT_SLACK_ENABLED === 'true') {
      logger.info('  - Slack: Check your configured channel');
    }
    if (process.env.ALERT_WEBHOOK_ENABLED === 'true') {
      logger.info(`  - Webhook: ${process.env.ALERT_WEBHOOK_URL}`);
    }
    if (process.env.ALERT_PAGERDUTY_ENABLED === 'true') {
      logger.info('  - PagerDuty: Check your incidents');
    }
    logger.info('');
    
    // Stop alerting service
    alertingService.stop();
    
    process.exit(0);
  } catch (error) {
    logger.error('Test failed', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Test interrupted');
  alertingService.stop();
  process.exit(0);
});

runTests();

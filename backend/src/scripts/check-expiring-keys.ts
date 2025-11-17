#!/usr/bin/env node
/**
 * CLI script to check for expiring API keys
 * Usage: npm run check-expiring-keys
 */

import dotenv from 'dotenv';
import { getExpiringKeys } from '../utils/apiKeyRotation';
import pool from '../config/database';

dotenv.config({ path: '../../.env' });

const main = async () => {
  try {
    console.log('Checking for expiring API keys (within 7 days)...');
    console.log('');

    const keys = await getExpiringKeys();

    if (keys.length === 0) {
      console.log('✓ No API keys expiring soon.');
      return;
    }

    console.log(`⚠ Warning: ${keys.length} API key(s) expiring soon:`);
    console.log('─'.repeat(80));

    keys.forEach(key => {
      const daysUntilExpiry = Math.ceil(
        (new Date(key.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      console.log(`Service:    ${key.service}`);
      console.log(`Key Name:   ${key.keyName}`);
      console.log(`Expires:    ${key.expiresAt!.toISOString()}`);
      console.log(`Days Left:  ${daysUntilExpiry} day(s)`);
      console.log('─'.repeat(80));
    });

    console.log('');
    console.log('Action Required:');
    console.log('  1. Generate new API keys in the service provider dashboard');
    console.log('  2. Rotate keys using: npm run rotate-key');
    console.log('  3. Update environment variables');
    console.log('  4. Restart backend service');
    console.log('');
    console.log('See API_KEY_ROTATION.md for detailed procedures.');

    // Exit with error code to trigger alerts in monitoring systems
    process.exit(1);
  } catch (error) {
    console.error('✗ Failed to check expiring keys:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();

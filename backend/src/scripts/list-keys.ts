#!/usr/bin/env node
/**
 * CLI script to list API keys
 * Usage: npm run list-keys [-- --service <service>]
 */

import dotenv from 'dotenv';
import { listAPIKeys } from '../utils/apiKeyRotation';
import pool from '../config/database';

dotenv.config({ path: '../../.env' });

interface Args {
  service?: string;
}

const parseArgs = (): Args => {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--service' && argv[i + 1]) {
      args.service = argv[i + 1];
      i++;
    }
  }

  return args;
};

const main = async () => {
  const args = parseArgs();

  try {
    console.log(args.service ? `Listing API keys for ${args.service}...` : 'Listing all API keys...');
    console.log('');

    const keys = await listAPIKeys(args.service);

    if (keys.length === 0) {
      console.log('No API keys found.');
      return;
    }

    console.log('API Keys:');
    console.log('─'.repeat(80));

    keys.forEach(key => {
      console.log(`Service:    ${key.service}`);
      console.log(`Key Name:   ${key.keyName}`);
      console.log(`Status:     ${key.isActive ? '✓ Active' : '✗ Inactive'}`);
      console.log(`Created:    ${key.createdAt.toISOString()}`);
      
      if (key.expiresAt) {
        const isExpired = new Date(key.expiresAt) < new Date();
        const expiryStatus = isExpired ? '✗ EXPIRED' : '✓ Valid';
        console.log(`Expires:    ${key.expiresAt.toISOString()} ${expiryStatus}`);
      }
      
      if (key.rotatedAt) {
        console.log(`Rotated:    ${key.rotatedAt.toISOString()}`);
      }
      
      console.log('─'.repeat(80));
    });

    console.log(`Total: ${keys.length} key(s)`);
  } catch (error) {
    console.error('✗ Failed to list API keys:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();

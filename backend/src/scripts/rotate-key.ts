#!/usr/bin/env node
/**
 * CLI script to rotate API keys
 * Usage: npm run rotate-key -- --service <service> --key-name <name> --value <value> [--expires <date>]
 */

import dotenv from 'dotenv';
import { rotateAPIKey } from '../utils/apiKeyRotation';
import pool from '../config/database';

dotenv.config({ path: '../../.env' });

interface Args {
  service?: string;
  keyName?: string;
  value?: string;
  expires?: string;
}

const parseArgs = (): Args => {
  const args: Args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--service' && argv[i + 1]) {
      args.service = argv[i + 1];
      i++;
    } else if (argv[i] === '--key-name' && argv[i + 1]) {
      args.keyName = argv[i + 1];
      i++;
    } else if (argv[i] === '--value' && argv[i + 1]) {
      args.value = argv[i + 1];
      i++;
    } else if (argv[i] === '--expires' && argv[i + 1]) {
      args.expires = argv[i + 1];
      i++;
    }
  }

  return args;
};

const main = async () => {
  const args = parseArgs();

  if (!args.service || !args.keyName || !args.value) {
    console.error('Usage: npm run rotate-key -- --service <service> --key-name <name> --value <value> [--expires <date>]');
    console.error('');
    console.error('Example:');
    console.error('  npm run rotate-key -- --service plaid --key-name client_id --value "new_client_id" --expires "2025-06-01"');
    process.exit(1);
  }

  try {
    const expiresAt = args.expires ? new Date(args.expires) : undefined;

    console.log(`Rotating API key for ${args.service}:${args.keyName}...`);
    
    await rotateAPIKey(args.service, args.keyName, args.value, expiresAt);
    
    console.log('✓ API key rotated successfully');
    
    if (expiresAt) {
      console.log(`  Expires: ${expiresAt.toISOString()}`);
    }
  } catch (error) {
    console.error('✗ Failed to rotate API key:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();

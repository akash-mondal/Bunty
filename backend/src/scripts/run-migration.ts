#!/usr/bin/env tsx
/**
 * Database Migration Runner
 * 
 * Usage:
 *   npm run migrate <migration-file>
 *   npm run migrate 001_create_persona_verifications.sql
 * 
 * Rollback:
 *   npm run migrate 001_create_persona_verifications_rollback.sql
 */

import dotenv from 'dotenv';

// Load environment variables BEFORE importing pool
dotenv.config();

import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../config/database';

async function runMigration(migrationFile: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔄 Running migration: ${migrationFile}`);
    console.log('━'.repeat(60));
    
    // Read migration file
    const migrationPath = join(__dirname, '../../db/migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Execute migration
    await client.query(sql);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully');
    console.log('━'.repeat(60));
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error(error);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('❌ Error: Migration file not specified');
    console.log('\nUsage:');
    console.log('  npm run migrate <migration-file>');
    console.log('\nExample:');
    console.log('  npm run migrate 001_create_persona_verifications.sql');
    process.exit(1);
  }
  
  try {
    await runMigration(migrationFile);
    console.log('\n✨ All migrations completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration failed\n');
    if (error instanceof Error) {
      console.error('Final error:', error.message);
    }
    process.exit(1);
  }
}

main();

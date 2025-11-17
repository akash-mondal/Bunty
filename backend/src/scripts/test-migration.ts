#!/usr/bin/env tsx
/**
 * Test Migration Script
 * 
 * Verifies that the persona_verifications table was created correctly
 * and all required columns and indexes exist.
 * 
 * Usage:
 *   npm run test:migration
 */

import dotenv from 'dotenv';

// Load environment variables BEFORE importing pool
dotenv.config();

import pool from '../config/database';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

async function testMigration(): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log('\n🧪 Testing persona_verifications migration');
    console.log('━'.repeat(60));
    
    // Test 1: Check if table exists
    console.log('\n1️⃣  Checking if persona_verifications table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'persona_verifications'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('❌ Table persona_verifications does not exist');
    }
    console.log('   ✅ Table exists');
    
    // Test 2: Check columns
    console.log('\n2️⃣  Checking table columns...');
    const columnsQuery = await client.query<ColumnInfo>(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'persona_verifications'
      ORDER BY ordinal_position;
    `);
    
    const expectedColumns = [
      'id',
      'user_id',
      'inquiry_id',
      'ssn_verified',
      'selfie_verified',
      'document_verified',
      'completed_at',
      'created_at',
      'updated_at'
    ];
    
    const actualColumns = columnsQuery.rows.map(row => row.column_name);
    
    for (const expectedCol of expectedColumns) {
      if (actualColumns.includes(expectedCol)) {
        const colInfo = columnsQuery.rows.find(r => r.column_name === expectedCol);
        console.log(`   ✅ ${expectedCol} (${colInfo?.data_type})`);
      } else {
        throw new Error(`❌ Missing column: ${expectedCol}`);
      }
    }
    
    // Test 3: Check inquiry_id is unique
    console.log('\n3️⃣  Checking inquiry_id unique constraint...');
    const uniqueConstraint = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'persona_verifications'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%inquiry_id%';
    `);
    
    if (uniqueConstraint.rows.length > 0) {
      console.log('   ✅ inquiry_id unique constraint exists');
    } else {
      throw new Error('❌ inquiry_id unique constraint not found');
    }
    
    // Test 4: Check indexes
    console.log('\n4️⃣  Checking indexes...');
    const indexesQuery = await client.query<IndexInfo>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'persona_verifications'
      AND schemaname = 'public';
    `);
    
    const expectedIndexes = [
      'idx_persona_verifications_user_id',
      'idx_persona_verifications_inquiry_id'
    ];
    
    const actualIndexes = indexesQuery.rows.map(row => row.indexname);
    
    for (const expectedIdx of expectedIndexes) {
      if (actualIndexes.includes(expectedIdx)) {
        console.log(`   ✅ ${expectedIdx}`);
      } else {
        throw new Error(`❌ Missing index: ${expectedIdx}`);
      }
    }
    
    // Test 5: Check foreign key constraint
    console.log('\n5️⃣  Checking foreign key constraint...');
    const fkConstraint = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'persona_verifications'
      AND constraint_type = 'FOREIGN KEY';
    `);
    
    if (fkConstraint.rows.length > 0) {
      console.log('   ✅ Foreign key constraint on user_id exists');
    } else {
      throw new Error('❌ Foreign key constraint not found');
    }
    
    // Test 6: Test insert and query
    console.log('\n6️⃣  Testing insert and query operations...');
    
    // Create a test user first
    const testUserResult = await client.query(`
      INSERT INTO users (email, password_hash)
      VALUES ('test_migration_user@example.com', 'test_hash')
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id;
    `);
    const testUserId = testUserResult.rows[0].id;
    
    // Insert test record
    const testInquiryId = `test_inq_${Date.now()}`;
    await client.query(`
      INSERT INTO persona_verifications (user_id, inquiry_id, ssn_verified, selfie_verified, document_verified)
      VALUES ($1, $2, true, true, false)
    `, [testUserId, testInquiryId]);
    console.log('   ✅ Insert operation successful');
    
    // Query test record
    const queryResult = await client.query(`
      SELECT * FROM persona_verifications WHERE inquiry_id = $1
    `, [testInquiryId]);
    
    if (queryResult.rows.length === 1) {
      console.log('   ✅ Query operation successful');
    } else {
      throw new Error('❌ Query operation failed');
    }
    
    // Clean up test data
    await client.query(`
      DELETE FROM persona_verifications WHERE inquiry_id = $1
    `, [testInquiryId]);
    await client.query(`
      DELETE FROM users WHERE id = $1
    `, [testUserId]);
    console.log('   ✅ Cleanup successful');
    
    console.log('\n━'.repeat(60));
    console.log('✅ All migration tests passed!');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Migration test failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testMigration();
    console.log('\n✨ Migration verification completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration verification failed\n');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

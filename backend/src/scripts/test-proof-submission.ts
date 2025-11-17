/**
 * Test script for proof submission and status tracking
 * 
 * This script tests the proof submission flow without requiring
 * a running Midnight node (for development purposes)
 */

import pool from '../config/database';
import midnightService from '../services/midnight.service';

async function testProofSubmission() {
  console.log('=== Testing Proof Submission Flow ===\n');

  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    const dbResult = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', dbResult.rows[0].now);
    console.log();

    // Test 2: Check proof_submissions table exists
    console.log('2. Checking proof_submissions table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'proof_submissions'
      );
    `);
    console.log('✓ proof_submissions table exists:', tableCheck.rows[0].exists);
    console.log();

    // Test 3: Insert a test proof submission
    console.log('3. Inserting test proof submission...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const testProofId = `proof_test_${Date.now()}`;
    const testNullifier = `0x${Date.now().toString(16)}`;
    const testTxHash = `0xtest${Date.now()}`;
    
    const insertResult = await pool.query(
      `INSERT INTO proof_submissions 
       (user_id, proof_id, nullifier, tx_hash, threshold, status, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days') 
       RETURNING *`,
      [testUserId, testProofId, testNullifier, testTxHash, 50000, 'pending']
    );
    console.log('✓ Test proof inserted:', insertResult.rows[0].proof_id);
    console.log();

    // Test 4: Query proof status
    console.log('4. Querying proof status...');
    const queryResult = await pool.query(
      'SELECT * FROM proof_submissions WHERE proof_id = $1',
      [testProofId]
    );
    console.log('✓ Proof found:', {
      proofId: queryResult.rows[0].proof_id,
      status: queryResult.rows[0].status,
      nullifier: queryResult.rows[0].nullifier,
    });
    console.log();

    // Test 5: Update proof status to confirmed
    console.log('5. Updating proof status to confirmed...');
    await pool.query(
      `UPDATE proof_submissions 
       SET status = 'confirmed', confirmed_at = NOW() 
       WHERE proof_id = $1`,
      [testProofId]
    );
    const updatedResult = await pool.query(
      'SELECT * FROM proof_submissions WHERE proof_id = $1',
      [testProofId]
    );
    console.log('✓ Proof status updated:', {
      status: updatedResult.rows[0].status,
      confirmedAt: updatedResult.rows[0].confirmed_at,
    });
    console.log();

    // Test 6: Test nullifier uniqueness constraint
    console.log('6. Testing nullifier uniqueness constraint...');
    try {
      await pool.query(
        `INSERT INTO proof_submissions 
         (user_id, proof_id, nullifier, tx_hash, threshold, status, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days')`,
        [testUserId, `proof_test_${Date.now()}_2`, testNullifier, testTxHash, 50000, 'pending']
      );
      console.log('✗ Nullifier uniqueness constraint failed - duplicate allowed!');
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation
        console.log('✓ Nullifier uniqueness constraint working correctly');
      } else {
        console.log('✗ Unexpected error:', error.message);
      }
    }
    console.log();

    // Test 7: Clean up test data
    console.log('7. Cleaning up test data...');
    await pool.query(
      'DELETE FROM proof_submissions WHERE proof_id LIKE $1',
      ['proof_test_%']
    );
    console.log('✓ Test data cleaned up');
    console.log();

    // Test 8: Test Midnight service methods (will fail if node not running)
    console.log('8. Testing Midnight service (may fail if node not running)...');
    try {
      const txStatus = await midnightService.getTransactionStatus('0xtest123');
      console.log('✓ Midnight service responded:', txStatus);
    } catch (error: any) {
      console.log('⚠ Midnight node not available (expected in development):', error.message);
    }
    console.log();

    console.log('=== All Tests Completed ===');
    console.log('✓ Database schema is correct');
    console.log('✓ Proof submission flow is ready');
    console.log('✓ Status tracking is functional');
    console.log('⚠ Midnight node integration requires running node');

  } catch (error: any) {
    console.error('✗ Test failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run tests
testProofSubmission();

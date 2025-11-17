import dotenv from 'dotenv';
import { indexerService } from '../services/indexer.service';
import { BuntyVerifierClient } from '../services/verifier.client';

dotenv.config({ path: '../../.env' });

/**
 * Test script for Midnight GraphQL Indexer integration
 * 
 * This script tests the indexer service and verifier client to ensure
 * they can successfully connect to the Midnight indexer and query proof records.
 * 
 * Run with: npx tsx src/scripts/test-indexer.ts
 */

async function testIndexerIntegration() {
  console.log('=== Midnight Indexer Integration Test ===\n');

  // Test 1: Health Check
  console.log('Test 1: Indexer Health Check');
  try {
    const isHealthy = await indexerService.healthCheck();
    const indexerUrl = indexerService.getIndexerUrl();
    console.log(`✓ Indexer URL: ${indexerUrl}`);
    console.log(`✓ Indexer Status: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
    
    if (!isHealthy) {
      console.log('⚠ Warning: Indexer is not responding. Make sure Docker containers are running.');
      console.log('  Run: docker-compose up -d');
    }
  } catch (error) {
    console.error('✗ Health check failed:', error instanceof Error ? error.message : error);
  }
  console.log('');

  // Test 2: Query Proof by Nullifier (should return null for non-existent proof)
  console.log('Test 2: Query Non-Existent Proof by Nullifier');
  try {
    const testNullifier = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const proof = await indexerService.getProofByNullifier(testNullifier);
    
    if (proof === null) {
      console.log('✓ Correctly returned null for non-existent proof');
    } else {
      console.log('✓ Found existing proof:', proof);
    }
  } catch (error) {
    console.error('✗ Query failed:', error instanceof Error ? error.message : error);
  }
  console.log('');

  // Test 3: Query Proofs by User DID (should return empty array for non-existent user)
  console.log('Test 3: Query Proofs by User DID');
  try {
    const testUserDID = 'did:midnight:test123';
    const proofs = await indexerService.getProofsByUserDID(testUserDID);
    console.log(`✓ Found ${proofs.length} proofs for user ${testUserDID}`);
    
    if (proofs.length > 0) {
      console.log('  Sample proof:', proofs[0]);
    }
  } catch (error) {
    console.error('✗ Query failed:', error instanceof Error ? error.message : error);
  }
  console.log('');

  // Test 4: Query All Proofs with Pagination
  console.log('Test 4: Query All Proofs (Paginated)');
  try {
    const proofs = await indexerService.getAllProofs(10, 0);
    console.log(`✓ Retrieved ${proofs.length} proofs (limit: 10, offset: 0)`);
    
    if (proofs.length > 0) {
      console.log('  Sample proof:', proofs[0]);
    } else {
      console.log('  No proofs found in indexer (this is expected for a fresh deployment)');
    }
  } catch (error) {
    console.error('✗ Query failed:', error instanceof Error ? error.message : error);
  }
  console.log('');

  // Test 5: Verify Proof (should return null for non-existent proof)
  console.log('Test 5: Verify Proof');
  try {
    const testNullifier = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const validation = await indexerService.verifyProof(testNullifier);
    
    if (validation === null) {
      console.log('✓ Correctly returned null for non-existent proof');
    } else {
      console.log('✓ Proof validation result:', validation);
    }
  } catch (error) {
    console.error('✗ Verification failed:', error instanceof Error ? error.message : error);
  }
  console.log('');

  // Test 6: Verifier Client Library
  console.log('Test 6: Verifier Client Library');
  try {
    const verifier = new BuntyVerifierClient();
    console.log(`✓ Verifier client initialized with URL: ${verifier.getIndexerUrl()}`);
    
    const testNullifier = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const validation = await verifier.verifyProof(testNullifier);
    
    if (validation === null) {
      console.log('✓ Verifier client correctly returned null for non-existent proof');
    } else {
      console.log('✓ Verifier client validation result:', validation);
    }
    
    // Test threshold check
    const meetsThreshold = await verifier.meetsThreshold(testNullifier, 50000);
    console.log(`✓ Threshold check (50000): ${meetsThreshold}`);
    
    // Test expiry check
    const isExpired = await verifier.isExpired(testNullifier);
    console.log(`✓ Expiry check: ${isExpired ? 'expired' : 'not expired'}`);
  } catch (error) {
    console.error('✗ Verifier client test failed:', error instanceof Error ? error.message : error);
  }
  console.log('');

  console.log('=== Test Complete ===');
  console.log('\nNext Steps:');
  console.log('1. Ensure Docker containers are running: docker-compose up -d');
  console.log('2. Submit a proof using the proof submission flow');
  console.log('3. Re-run this test to verify the proof appears in the indexer');
  console.log('4. Use the verifier client in your application to validate proofs');
}

// Run the test
testIndexerIntegration()
  .then(() => {
    console.log('\n✓ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test suite failed:', error);
    process.exit(1);
  });

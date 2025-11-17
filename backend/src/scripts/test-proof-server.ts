/**
 * Test script for proof server integration
 * Run with: npx tsx src/scripts/test-proof-server.ts
 */

import dotenv from 'dotenv';
import proofServerService from '../services/proofServer.service';
import { Witness } from '../types/witness.types';
import { CircuitType } from '../types/proof.types';

dotenv.config({ path: '../../.env' });

const testWitness: Witness = {
  income: 75000,
  employmentMonths: 24,
  employerHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  assets: 50000,
  liabilities: 10000,
  creditScore: 720,
  ssnVerified: true,
  selfieVerified: true,
  documentVerified: true,
  timestamp: Date.now(),
};

async function testProofServerHealth() {
  console.log('\n=== Testing Proof Server Health ===');
  try {
    const isHealthy = await proofServerService.healthCheck();
    console.log(`✓ Proof server health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    return isHealthy;
  } catch (error: any) {
    console.error(`✗ Health check failed: ${error.message}`);
    return false;
  }
}

async function testProofGeneration(circuit: CircuitType, threshold: number) {
  console.log(`\n=== Testing Proof Generation: ${circuit} ===`);
  console.log(`Threshold: ${threshold}`);
  
  try {
    const startTime = Date.now();
    const proof = await proofServerService.generateProof(
      circuit,
      testWitness,
      { threshold }
    );
    const duration = Date.now() - startTime;

    console.log(`✓ Proof generated successfully in ${duration}ms`);
    console.log(`  Nullifier: ${proof.publicOutputs.nullifier}`);
    console.log(`  Timestamp: ${new Date(proof.publicOutputs.timestamp * 1000).toISOString()}`);
    console.log(`  Expires: ${new Date(proof.publicOutputs.expiresAt * 1000).toISOString()}`);
    console.log(`  Proof length: ${proof.proof.length} bytes`);
    
    return true;
  } catch (error: any) {
    console.error(`✗ Proof generation failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Starting Proof Server Integration Tests...');
  console.log(`Proof Server URL: ${process.env.PROOF_SERVER_URL || 'http://localhost:6300'}`);
  
  // Test 1: Health check
  const isHealthy = await testProofServerHealth();
  
  if (!isHealthy) {
    console.error('\n❌ Proof server is not available. Please ensure:');
    console.error('   1. Docker is running');
    console.error('   2. Run: docker-compose up proof-server');
    console.error('   3. Proof server is accessible at port 6300');
    process.exit(1);
  }

  // Test 2: Generate income proof
  const test1 = await testProofGeneration('verifyIncome', 60000);

  // Test 3: Generate assets proof
  const test2 = await testProofGeneration('verifyAssets', 30000);

  // Test 4: Generate creditworthiness proof
  const test3 = await testProofGeneration('verifyCreditworthiness', 700);

  // Summary
  console.log('\n=== Test Summary ===');
  const allPassed = test1 && test2 && test3;
  
  if (allPassed) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

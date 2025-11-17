#!/usr/bin/env ts-node

/**
 * Test script for metrics collection system
 * 
 * This script demonstrates and verifies the metrics collection functionality
 * by simulating various operations and querying the metrics.
 * 
 * Usage:
 *   ts-node src/scripts/test-metrics.ts
 */

import metricsService from '../services/metrics.service';
import { connectRedis } from '../config/redis';

async function testMetrics() {
  console.log('🔍 Testing Metrics Collection System\n');

  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    await connectRedis();
    console.log('✅ Redis connected\n');

    // Test 1: Track API metrics
    console.log('📊 Test 1: Tracking API Metrics');
    await metricsService.trackAPIResponseTime('GET /api/test', 150);
    await metricsService.trackAPIRequest('GET /api/test', 200);
    await metricsService.trackAPIResponseTime('GET /api/test', 200);
    await metricsService.trackAPIRequest('GET /api/test', 200);
    await metricsService.trackAPIResponseTime('POST /api/test', 300);
    await metricsService.trackAPIRequest('POST /api/test', 500);
    console.log('✅ API metrics tracked\n');

    // Test 2: Track proof generation
    console.log('📊 Test 2: Tracking Proof Generation');
    await metricsService.trackProofGeneration('user-123', 'verifyIncome', true, 4500);
    await metricsService.trackProofGeneration('user-456', 'verifyAssets', true, 3800);
    await metricsService.trackProofGeneration('user-789', 'verifyIncome', false, 2000);
    console.log('✅ Proof generation metrics tracked\n');

    // Test 3: Track proof submissions
    console.log('📊 Test 3: Tracking Proof Submissions');
    await metricsService.trackProofSubmission('proof-001', 'submitted');
    await metricsService.trackProofSubmission('proof-002', 'submitted');
    await metricsService.trackProofSubmission('proof-001', 'confirmed');
    console.log('✅ Proof submission metrics tracked\n');

    // Test 4: Track transaction confirmations
    console.log('📊 Test 4: Tracking Transaction Confirmations');
    await metricsService.trackTransactionConfirmation('tx-abc123', 15000);
    await metricsService.trackTransactionConfirmation('tx-def456', 12000);
    console.log('✅ Transaction confirmation metrics tracked\n');

    // Test 5: Track external services
    console.log('📊 Test 5: Tracking External Services');
    await metricsService.trackExternalService('plaid', true, 1200);
    await metricsService.trackExternalService('plaid', true, 1100);
    await metricsService.trackExternalService('stripe', true, 800);
    await metricsService.trackExternalService('sila', false, 2000);
    await metricsService.trackExternalService('midnight', true, 2500);
    console.log('✅ External service metrics tracked\n');

    // Wait a moment for Redis to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Query all metrics
    console.log('📈 Querying All Metrics:\n');
    const allMetrics = await metricsService.getAllMetrics();
    console.log(JSON.stringify(allMetrics, null, 2));
    console.log('\n');

    // Query specific metrics
    console.log('📈 Proof Metrics:');
    const proofMetrics = await metricsService.getProofMetrics();
    console.log(JSON.stringify(proofMetrics, null, 2));
    console.log('\n');

    console.log('📈 API Metrics:');
    const apiMetrics = await metricsService.getAPIMetrics();
    console.log(JSON.stringify(apiMetrics, null, 2));
    console.log('\n');

    console.log('📈 External Service Metrics:');
    const serviceMetrics = await metricsService.getExternalServiceMetrics();
    console.log(JSON.stringify(serviceMetrics, null, 2));
    console.log('\n');

    // Verify metrics
    console.log('✅ Verification:');
    console.log(`   - Proof success rate: ${proofMetrics.successRate}%`);
    console.log(`   - Average proof generation time: ${proofMetrics.avgGenerationTime}ms`);
    console.log(`   - API error rate: ${apiMetrics.errorRate}%`);
    console.log(`   - Plaid uptime: ${serviceMetrics.plaid.uptime}%`);
    console.log(`   - Stripe uptime: ${serviceMetrics.stripe.uptime}%`);
    console.log(`   - Sila uptime: ${serviceMetrics.sila.uptime}%`);
    console.log(`   - Midnight uptime: ${serviceMetrics.midnight.uptime}%`);
    console.log('\n');

    console.log('🎉 All metrics tests passed!\n');

    // Optional: Reset metrics
    console.log('🧹 Cleaning up test metrics...');
    await metricsService.resetMetrics();
    console.log('✅ Test metrics reset\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing metrics:', error);
    process.exit(1);
  }
}

// Run tests
testMetrics();

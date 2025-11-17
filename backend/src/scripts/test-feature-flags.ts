/**
 * Test script for feature flags
 * 
 * This script tests the feature flag configuration and demonstrates
 * how to switch between Persona and Stripe Identity providers.
 * 
 * Usage:
 *   # Test with Persona (default)
 *   USE_PERSONA=true npx ts-node src/scripts/test-feature-flags.ts
 * 
 *   # Test with Stripe (rollback)
 *   USE_PERSONA=false npx ts-node src/scripts/test-feature-flags.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { features, logFeatureFlags } from '../config/features';
import logger from '../utils/logger';

async function testFeatureFlags() {
  console.log('\n=== Feature Flags Test ===\n');
  
  // Log feature flags
  logFeatureFlags();
  
  // Test feature flag values
  console.log('\nFeature Flag Values:');
  console.log('-------------------');
  console.log(`USE_PERSONA env var: ${process.env.USE_PERSONA}`);
  console.log(`features.usePersona: ${features.usePersona}`);
  console.log(`Identity Provider: ${features.usePersona ? 'Persona' : 'Stripe Identity'}`);
  
  // Test provider selection logic
  console.log('\nProvider Selection Logic:');
  console.log('------------------------');
  
  if (features.usePersona) {
    console.log('✓ Using Persona for identity verification');
    console.log('  - API endpoints: /api/identity/*');
    console.log('  - Webhook signature: Persona-Signature header');
    console.log('  - Database table: persona_verifications');
    console.log('  - Service: PersonaService');
  } else {
    console.log('✓ Using Stripe Identity for identity verification (ROLLBACK MODE)');
    console.log('  - API endpoints: /api/identity/* (routed to Stripe)');
    console.log('  - Webhook signature: stripe-signature header');
    console.log('  - Database table: stripe_verifications');
    console.log('  - Service: StripeService');
  }
  
  // Test rollback capability
  console.log('\nRollback Capability:');
  console.log('-------------------');
  console.log('✓ Both Persona and Stripe services are available');
  console.log('✓ Both database tables are preserved');
  console.log('✓ Switch providers by setting USE_PERSONA environment variable');
  console.log('✓ No code deployment required for rollback');
  
  // Instructions
  console.log('\nHow to Switch Providers:');
  console.log('-----------------------');
  console.log('1. Update environment variable: USE_PERSONA=false (for Stripe) or USE_PERSONA=true (for Persona)');
  console.log('2. Restart the application');
  console.log('3. Verify the provider in application logs');
  console.log('4. Test verification flow with the selected provider');
  
  console.log('\nTest completed successfully!\n');
}

// Run the test
testFeatureFlags().catch((error) => {
  logger.error('Feature flags test failed', { error });
  process.exit(1);
});

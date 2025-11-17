/**
 * Basic Proof Verification Example
 * 
 * This example demonstrates how to verify a single proof by its nullifier.
 */

import { BuntyVerifierClient } from '../src';

async function main() {
  // Initialize the verifier client
  const client = new BuntyVerifierClient({
    indexerUrl: process.env.BUNTY_INDEXER_URL || 'http://localhost:8081/graphql',
    timeout: 10000
  });

  // Example nullifier (replace with actual nullifier from your application)
  const nullifier = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  try {
    console.log('Verifying proof...');
    console.log(`Nullifier: ${nullifier}`);
    console.log('---');

    // Verify the proof
    const validation = await client.verifyProof(nullifier);

    if (validation.isValid) {
      console.log('✅ Proof is VALID');
      console.log(`Threshold: $${validation.threshold.toLocaleString()}`);
      console.log(`Created: ${new Date(validation.timestamp * 1000).toLocaleString()}`);
      console.log(`Expires: ${new Date(validation.expiresAt * 1000).toLocaleString()}`);
      console.log(`User DID: ${validation.userDID}`);

      // Calculate days until expiry
      const now = Date.now() / 1000;
      const daysUntilExpiry = Math.floor((validation.expiresAt - now) / 86400);
      console.log(`Days until expiry: ${daysUntilExpiry}`);
    } else {
      console.log('❌ Proof is INVALID or EXPIRED');
    }
  } catch (error) {
    console.error('Error verifying proof:', error);
  }
}

main();

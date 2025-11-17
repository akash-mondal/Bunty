/**
 * User Proofs Query Example
 * 
 * This example demonstrates how to query all proofs for a specific user.
 */

import { BuntyVerifierClient } from '../src';

async function main() {
  const client = new BuntyVerifierClient({
    indexerUrl: process.env.BUNTY_INDEXER_URL || 'http://localhost:8081/graphql'
  });

  // Example user DID (replace with actual DID)
  const userDID = 'did:midnight:user123456789';

  try {
    console.log('Fetching user proofs...');
    console.log(`User DID: ${userDID}`);
    console.log('---');

    // Get all proofs for the user
    const proofs = await client.getUserProofs(userDID);

    console.log(`Found ${proofs.length} total proofs\n`);

    if (proofs.length === 0) {
      console.log('No proofs found for this user');
      return;
    }

    // Display each proof
    proofs.forEach((proof, index) => {
      console.log(`Proof ${index + 1}:`);
      console.log(`  Nullifier: ${proof.nullifier}`);
      console.log(`  Threshold: $${proof.threshold.toLocaleString()}`);
      console.log(`  Created: ${new Date(proof.timestamp * 1000).toLocaleDateString()}`);
      console.log(`  Expires: ${new Date(proof.expiresAt * 1000).toLocaleDateString()}`);
      console.log(`  Valid: ${proof.isValid ? '✅' : '❌'}`);
      console.log(`  Expired: ${proof.isExpired ? '❌' : '✅'}`);
      console.log('---');
    });

    // Get count of valid proofs
    const validCount = await client.getValidProofCount(userDID);
    console.log(`\nValid proofs: ${validCount} / ${proofs.length}`);

    // Find highest threshold
    const highestThreshold = Math.max(...proofs.map(p => p.threshold));
    console.log(`Highest proven income: $${highestThreshold.toLocaleString()}`);

    // Find most recent proof
    const mostRecent = proofs.sort((a, b) => b.timestamp - a.timestamp)[0];
    console.log(`Most recent proof: ${new Date(mostRecent.timestamp * 1000).toLocaleDateString()}`);

  } catch (error) {
    console.error('Error fetching user proofs:', error);
  }
}

main();

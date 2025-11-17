/**
 * Hash calculation utilities for witness data
 * Matches backend SHA-256 implementation
 */

/**
 * Calculate SHA-256 hash of witness data
 * This must match the backend implementation exactly
 */
export async function calculateWitnessHash(witnessData: any): Promise<string> {
  // Convert witness to canonical JSON string (sorted keys)
  const canonicalJson = JSON.stringify(witnessData, Object.keys(witnessData).sort());
  
  // Encode to UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);
  
  // Calculate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Verify witness hash matches expected value
 */
export async function verifyWitnessHash(
  witnessData: any,
  expectedHash: string
): Promise<boolean> {
  const calculatedHash = await calculateWitnessHash(witnessData);
  return calculatedHash === expectedHash;
}

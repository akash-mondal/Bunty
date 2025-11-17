/**
 * Client-side encryption utilities for witness data
 * Uses Web Crypto API for AES-GCM encryption
 */

/**
 * Generate a cryptographic key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(
  data: string,
  password: string
): Promise<{ encryptedData: string; iv: string; salt: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive encryption key
  const key = await deriveKey(password, salt);

  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Convert to base64 for storage
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const encryptedData = btoa(String.fromCharCode(...encryptedArray));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));

  return {
    encryptedData,
    iv: ivBase64,
    salt: saltBase64,
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  salt: string,
  password: string
): Promise<string> {
  // Convert from base64
  const encryptedArray = Uint8Array.from(atob(encryptedData), (c) =>
    c.charCodeAt(0)
  );
  const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const saltArray = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));

  // Derive decryption key
  const key = await deriveKey(password, saltArray);

  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivArray,
    },
    key,
    encryptedArray
  );

  // Convert back to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generate a secure random password for witness encryption
 * This should be derived from user credentials or stored securely
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Derive encryption key from user credentials
 * This ensures the key is consistent across sessions
 */
export function deriveEncryptionKeyFromUser(userId: string, email: string): string {
  // Simple derivation - in production, use a more robust method
  return btoa(`${userId}:${email}:bunty-witness-key`);
}

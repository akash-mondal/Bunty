import pool from '../config/database';
import { encrypt, decrypt } from './encryption';

/**
 * API Key Rotation Utilities
 * Provides functions to manage and rotate API keys for external services
 */

export interface APIKey {
  id: string;
  service: string;
  keyName: string;
  encryptedValue: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  rotatedAt?: Date;
}

/**
 * Initialize API keys table
 */
export const initAPIKeysTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service VARCHAR(50) NOT NULL,
      key_name VARCHAR(100) NOT NULL,
      encrypted_value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      rotated_at TIMESTAMP,
      UNIQUE(service, key_name)
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service);
    CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
  `;

  try {
    await pool.query(createTableQuery);
    console.log('API keys table initialized');
  } catch (error) {
    console.error('Failed to initialize API keys table:', error);
  }
};

/**
 * Store an encrypted API key
 */
export const storeAPIKey = async (
  service: string,
  keyName: string,
  keyValue: string,
  expiresAt?: Date
): Promise<void> => {
  const encryptedValue = encrypt(keyValue);

  const query = `
    INSERT INTO api_keys (service, key_name, encrypted_value, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (service, key_name)
    DO UPDATE SET
      encrypted_value = EXCLUDED.encrypted_value,
      is_active = TRUE,
      rotated_at = NOW()
  `;

  await pool.query(query, [service, keyName, encryptedValue, expiresAt || null]);
};

/**
 * Retrieve and decrypt an API key
 */
export const getAPIKey = async (service: string, keyName: string): Promise<string | null> => {
  const query = `
    SELECT encrypted_value, expires_at, is_active
    FROM api_keys
    WHERE service = $1 AND key_name = $2
  `;

  const result = await pool.query(query, [service, keyName]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Check if key is active
  if (!row.is_active) {
    throw new Error(`API key for ${service}:${keyName} is inactive`);
  }

  // Check if key is expired
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new Error(`API key for ${service}:${keyName} has expired`);
  }

  return decrypt(row.encrypted_value);
};

/**
 * Rotate an API key (mark old as inactive, store new)
 */
export const rotateAPIKey = async (
  service: string,
  keyName: string,
  newKeyValue: string,
  expiresAt?: Date
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Deactivate old key
    await client.query(
      'UPDATE api_keys SET is_active = FALSE WHERE service = $1 AND key_name = $2',
      [service, keyName]
    );

    // Store new key
    const encryptedValue = encrypt(newKeyValue);
    await client.query(
      `INSERT INTO api_keys (service, key_name, encrypted_value, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [service, keyName, encryptedValue, expiresAt || null]
    );

    await client.query('COMMIT');
    console.log(`API key rotated for ${service}:${keyName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * List all API keys (without decrypted values)
 */
export const listAPIKeys = async (service?: string): Promise<APIKey[]> => {
  let query = `
    SELECT id, service, key_name, created_at, expires_at, is_active, rotated_at
    FROM api_keys
  `;

  const values: any[] = [];

  if (service) {
    query += ' WHERE service = $1';
    values.push(service);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, values);

  return result.rows.map(row => ({
    id: row.id,
    service: row.service,
    keyName: row.key_name,
    encryptedValue: '[REDACTED]',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    rotatedAt: row.rotated_at,
  }));
};

/**
 * Delete an API key
 */
export const deleteAPIKey = async (service: string, keyName: string): Promise<void> => {
  await pool.query(
    'DELETE FROM api_keys WHERE service = $1 AND key_name = $2',
    [service, keyName]
  );
  console.log(`API key deleted for ${service}:${keyName}`);
};

/**
 * Check for expiring keys (within next 7 days)
 */
export const getExpiringKeys = async (): Promise<APIKey[]> => {
  const query = `
    SELECT id, service, key_name, created_at, expires_at, is_active
    FROM api_keys
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at <= NOW() + INTERVAL '7 days'
      AND expires_at > NOW()
    ORDER BY expires_at ASC
  `;

  const result = await pool.query(query);

  return result.rows.map(row => ({
    id: row.id,
    service: row.service,
    keyName: row.key_name,
    encryptedValue: '[REDACTED]',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
  }));
};

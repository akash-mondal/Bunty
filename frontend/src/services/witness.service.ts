import { plaidService } from './plaid.service';
import { stripeService } from './stripe.service';
import { Witness, WitnessValidation } from '@/types/witness.types';
import { indexedDB, StoredWitness } from '@/utils/indexedDB';
import { encryptData, decryptData, deriveEncryptionKeyFromUser } from '@/utils/encryption';
import { calculateWitnessHash } from '@/utils/hash';

/**
 * Witness Service
 * Handles construction, storage, and retrieval of witness data
 * All witness data is stored locally and never transmitted to backend
 */
class WitnessService {
  /**
   * Fetch all required data from backend APIs and construct witness
   */
  async constructWitness(): Promise<Witness> {
    try {
      // Fetch data from all sources in parallel
      const [incomeData, assetsData, liabilitiesData, signalData, verificationStatus] =
        await Promise.all([
          plaidService.getIncomeData(),
          plaidService.getAssetsData(),
          plaidService.getLiabilitiesData(),
          plaidService.getSignalData(),
          stripeService.getVerificationStatus(),
        ]);

      // Construct witness object
      const witness: Witness = {
        income: incomeData.monthlyIncome,
        employmentMonths: incomeData.employmentMonths,
        employerHash: incomeData.employerHash,
        assets: assetsData.totalAssets,
        liabilities: liabilitiesData.totalLiabilities,
        creditScore: signalData.creditScore,
        ssnVerified: verificationStatus?.ssnVerified || false,
        selfieVerified: verificationStatus?.selfieVerified || false,
        documentVerified: verificationStatus?.documentVerified || false,
        timestamp: Date.now(),
      };

      return witness;
    } catch (error) {
      console.error('Failed to construct witness:', error);
      throw new Error('Failed to fetch data for witness construction');
    }
  }

  /**
   * Store witness data locally with encryption
   */
  async storeWitness(
    witness: Witness,
    userId: string,
    userEmail: string
  ): Promise<string> {
    try {
      // Initialize IndexedDB
      await indexedDB.init();

      // Derive encryption key from user credentials
      const encryptionKey = deriveEncryptionKeyFromUser(userId, userEmail);

      // Calculate witness hash
      const hash = await calculateWitnessHash(witness);

      // Encrypt witness data
      const witnessJson = JSON.stringify(witness);
      const { encryptedData, iv, salt } = await encryptData(witnessJson, encryptionKey);

      // Generate unique ID for this witness
      const witnessId = `witness_${userId}_${Date.now()}`;

      // Store in IndexedDB
      const storedWitness: StoredWitness = {
        id: witnessId,
        userId,
        encryptedData,
        iv: `${iv}:${salt}`, // Store IV and salt together
        timestamp: witness.timestamp,
        hash,
      };

      await indexedDB.storeWitness(storedWitness);

      return witnessId;
    } catch (error) {
      console.error('Failed to store witness:', error);
      throw new Error('Failed to store witness locally');
    }
  }

  /**
   * Retrieve and decrypt witness data from local storage
   */
  async retrieveWitness(
    witnessId: string,
    userId: string,
    userEmail: string
  ): Promise<Witness | null> {
    try {
      // Initialize IndexedDB
      await indexedDB.init();

      // Retrieve stored witness
      const storedWitness = await indexedDB.getWitness(witnessId);
      if (!storedWitness) {
        return null;
      }

      // Verify user owns this witness
      if (storedWitness.userId !== userId) {
        throw new Error('Unauthorized access to witness data');
      }

      // Derive decryption key
      const encryptionKey = deriveEncryptionKeyFromUser(userId, userEmail);

      // Parse IV and salt
      const [iv, salt] = storedWitness.iv.split(':');

      // Decrypt witness data
      const decryptedJson = await decryptData(
        storedWitness.encryptedData,
        iv,
        salt,
        encryptionKey
      );

      const witness: Witness = JSON.parse(decryptedJson);

      return witness;
    } catch (error) {
      console.error('Failed to retrieve witness:', error);
      throw new Error('Failed to retrieve witness from local storage');
    }
  }

  /**
   * Get the most recent witness for a user
   */
  async getLatestWitness(
    userId: string,
    userEmail: string
  ): Promise<Witness | null> {
    try {
      // Initialize IndexedDB
      await indexedDB.init();

      // Get latest stored witness
      const storedWitness = await indexedDB.getLatestWitness(userId);
      if (!storedWitness) {
        return null;
      }

      // Retrieve and decrypt
      return this.retrieveWitness(storedWitness.id, userId, userEmail);
    } catch (error) {
      console.error('Failed to get latest witness:', error);
      return null;
    }
  }

  /**
   * Validate witness data
   */
  validateWitness(witness: Witness): WitnessValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (typeof witness.income !== 'number' || witness.income < 0) {
      errors.push('Invalid income value');
    }

    if (typeof witness.employmentMonths !== 'number' || witness.employmentMonths < 0) {
      errors.push('Invalid employment months');
    }

    if (!witness.employerHash || typeof witness.employerHash !== 'string') {
      errors.push('Missing employer hash');
    }

    if (typeof witness.assets !== 'number' || witness.assets < 0) {
      errors.push('Invalid assets value');
    }

    if (typeof witness.liabilities !== 'number' || witness.liabilities < 0) {
      errors.push('Invalid liabilities value');
    }

    if (typeof witness.creditScore !== 'number' || witness.creditScore < 0) {
      errors.push('Invalid credit score');
    }

    if (typeof witness.ssnVerified !== 'boolean') {
      errors.push('Invalid SSN verification status');
    }

    if (typeof witness.selfieVerified !== 'boolean') {
      errors.push('Invalid selfie verification status');
    }

    if (typeof witness.documentVerified !== 'boolean') {
      errors.push('Invalid document verification status');
    }

    if (typeof witness.timestamp !== 'number' || witness.timestamp <= 0) {
      errors.push('Invalid timestamp');
    }

    // Warnings for incomplete verification
    if (!witness.ssnVerified) {
      warnings.push('SSN not verified');
    }

    if (!witness.selfieVerified) {
      warnings.push('Selfie not verified');
    }

    if (!witness.documentVerified) {
      warnings.push('Document not verified');
    }

    // Warning for low employment duration
    if (witness.employmentMonths < 6) {
      warnings.push('Employment duration less than 6 months');
    }

    // Warning for negative net worth
    const netWorth = witness.assets - witness.liabilities;
    if (netWorth < 0) {
      warnings.push('Negative net worth');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate hash of witness data
   */
  async calculateHash(witness: Witness): Promise<string> {
    return calculateWitnessHash(witness);
  }

  /**
   * Delete a specific witness
   */
  async deleteWitness(witnessId: string): Promise<void> {
    try {
      await indexedDB.init();
      await indexedDB.deleteWitness(witnessId);
    } catch (error) {
      console.error('Failed to delete witness:', error);
      throw new Error('Failed to delete witness');
    }
  }

  /**
   * Delete all witnesses for a user
   */
  async deleteAllWitnesses(userId: string): Promise<void> {
    try {
      await indexedDB.init();
      await indexedDB.deleteWitnessesByUser(userId);
    } catch (error) {
      console.error('Failed to delete witnesses:', error);
      throw new Error('Failed to delete witnesses');
    }
  }

  /**
   * Get all witness IDs for a user
   */
  async getWitnessIds(userId: string): Promise<string[]> {
    try {
      await indexedDB.init();
      const witnesses = await indexedDB.getWitnessesByUser(userId);
      return witnesses.map((w) => w.id);
    } catch (error) {
      console.error('Failed to get witness IDs:', error);
      return [];
    }
  }

  /**
   * Check if user has any stored witnesses
   */
  async hasWitness(userId: string): Promise<boolean> {
    try {
      await indexedDB.init();
      const witnesses = await indexedDB.getWitnessesByUser(userId);
      return witnesses.length > 0;
    } catch (error) {
      console.error('Failed to check witness existence:', error);
      return false;
    }
  }
}

export const witnessService = new WitnessService();

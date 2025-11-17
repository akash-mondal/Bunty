/**
 * Witness data structure combining all financial and identity data sources
 * This data is stored locally and never transmitted to backend servers
 */
export interface Witness {
  income: number;
  employmentMonths: number;
  employerHash: string;
  assets: number;
  liabilities: number;
  creditScore: number;
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
  timestamp: number;
}

/**
 * Encrypted witness storage format
 */
export interface EncryptedWitness {
  encryptedData: string;
  iv: string;
  timestamp: number;
}

/**
 * Witness validation result
 */
export interface WitnessValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

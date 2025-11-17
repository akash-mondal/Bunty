/**
 * Feature Flags Configuration
 * 
 * This module manages feature flags for the application, allowing runtime
 * configuration of features without code deployment.
 */

export interface FeatureFlags {
  /**
   * USE_PERSONA: Controls which identity verification provider to use
   * - true: Use Persona for identity verification (default)
   * - false: Use Stripe Identity for identity verification (rollback)
   * 
   * Set via environment variable: USE_PERSONA=true|false
   * Default: true
   */
  usePersona: boolean;
}

/**
 * Load feature flags from environment variables
 */
function loadFeatureFlags(): FeatureFlags {
  const usePersona = process.env.USE_PERSONA !== 'false'; // Default to true unless explicitly set to false
  
  return {
    usePersona,
  };
}

/**
 * Feature flags instance
 * Loaded once at application startup
 */
export const features: FeatureFlags = loadFeatureFlags();

/**
 * Log feature flags configuration
 */
export function logFeatureFlags(): void {
  console.log('Feature Flags Configuration:', {
    usePersona: features.usePersona,
    identityProvider: features.usePersona ? 'Persona' : 'Stripe Identity',
  });
}

-- Rollback Migration: Restore stripe_verifications table
-- Description: Rename stripe_verifications_archived back to stripe_verifications
-- Date: 2024-01-15
-- Author: System

-- Restore the original table name
ALTER TABLE IF EXISTS stripe_verifications_archived 
RENAME TO stripe_verifications;

-- Remove the archive comment
COMMENT ON TABLE stripe_verifications IS NULL;

-- Log the rollback
DO $$
BEGIN
  RAISE NOTICE 'stripe_verifications table restored from archive';
END $$;

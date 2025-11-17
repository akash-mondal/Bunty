-- Migration: Archive stripe_verifications table
-- Description: Rename stripe_verifications table to stripe_verifications_archived
--              This preserves historical data while marking it as deprecated
-- Date: 2024-01-15
-- Author: System

-- Rename the table to indicate it's archived
ALTER TABLE IF EXISTS stripe_verifications 
RENAME TO stripe_verifications_archived;

-- Add a comment to the archived table
COMMENT ON TABLE stripe_verifications_archived IS 
'ARCHIVED: This table contains historical Stripe Identity verification data. 
Stripe Identity has been replaced with Persona. 
This table is kept for historical reference only and will be removed after data retention period.
Archived on: 2024-01-15';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'stripe_verifications table archived successfully';
END $$;

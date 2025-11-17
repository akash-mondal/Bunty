-- Rollback Migration: Drop persona_verifications table
-- Description: Rollback the persona_verifications table creation
-- Date: 2025-11-17

-- Drop indexes first
DROP INDEX IF EXISTS idx_persona_verifications_inquiry_id;
DROP INDEX IF EXISTS idx_persona_verifications_user_id;

-- Drop table
DROP TABLE IF EXISTS persona_verifications;

-- Migration: Create persona_verifications table
-- Description: Replace stripe_verifications with persona_verifications table
-- Date: 2025-11-17

-- Create persona_verifications table
CREATE TABLE IF NOT EXISTS persona_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  inquiry_id VARCHAR(255) UNIQUE NOT NULL,
  ssn_verified BOOLEAN DEFAULT FALSE,
  selfie_verified BOOLEAN DEFAULT FALSE,
  document_verified BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_persona_verifications_user_id ON persona_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_verifications_inquiry_id ON persona_verifications(inquiry_id);

-- Add comment to table
COMMENT ON TABLE persona_verifications IS 'Stores Persona identity verification records for users';
COMMENT ON COLUMN persona_verifications.inquiry_id IS 'Persona inquiry ID (replaces Stripe session_id)';
COMMENT ON COLUMN persona_verifications.ssn_verified IS 'Whether SSN/government ID verification passed';
COMMENT ON COLUMN persona_verifications.selfie_verified IS 'Whether selfie/liveness verification passed';
COMMENT ON COLUMN persona_verifications.document_verified IS 'Whether document verification passed';

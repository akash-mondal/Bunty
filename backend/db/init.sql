-- Initialize Bunty database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Plaid connections
CREATE TABLE IF NOT EXISTS plaid_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  institution_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stripe verifications
CREATE TABLE IF NOT EXISTS stripe_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  ssn_verified BOOLEAN DEFAULT FALSE,
  selfie_verified BOOLEAN DEFAULT FALSE,
  document_verified BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Witness commitments
CREATE TABLE IF NOT EXISTS witness_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  witness_hash VARCHAR(64) NOT NULL,
  committed_at TIMESTAMP DEFAULT NOW(),
  on_chain_tx_hash VARCHAR(255)
);

-- Proof submissions
CREATE TABLE IF NOT EXISTS proof_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proof_id VARCHAR(255) UNIQUE NOT NULL,
  nullifier VARCHAR(64) UNIQUE NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  threshold INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Sila wallets
CREATE TABLE IF NOT EXISTS sila_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  bank_account_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proof_id VARCHAR(255) REFERENCES proof_submissions(proof_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Create indexer database for Midnight indexer
CREATE DATABASE bunty_indexer;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_user_id ON plaid_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_verifications_user_id ON stripe_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_witness_commitments_user_id ON witness_commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_submissions_user_id ON proof_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_submissions_nullifier ON proof_submissions(nullifier);
CREATE INDEX IF NOT EXISTS idx_sila_wallets_user_id ON sila_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_proof_id ON payment_history(proof_id);

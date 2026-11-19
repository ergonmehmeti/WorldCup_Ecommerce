-- Migration 003: Add password reset token fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token_hash   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token_hash);

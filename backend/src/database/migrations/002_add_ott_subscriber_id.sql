-- Migration: 002_add_ott_subscriber_id
-- Description: Add ott_subscriber_id column to users table
-- Date: 2026-03-04

BEGIN;

-- Add ott_subscriber_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ott_subscriber_id INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN users.ott_subscriber_id IS 'OTT API subscriber ID from external OTT system';

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES ('002', 'Add ott_subscriber_id column to users table')
ON CONFLICT (version) DO NOTHING;

COMMIT;

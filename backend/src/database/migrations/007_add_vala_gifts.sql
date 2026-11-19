-- Migration 007: Add VALA gift tracking columns

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS valaboterori_gift BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS valaboterori_gift_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valaboterori_biz_gift BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS valaboterori_biz_gift_at TIMESTAMPTZ;

-- No indexes needed: operators search by email/name (already indexed), 
-- not by gift status. Gift columns are just displayed.

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('007', 'Add VALA gift tracking columns');

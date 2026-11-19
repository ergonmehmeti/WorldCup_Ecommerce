-- Migration 008: Add VALA email tracking columns
-- Tracks whether each number was included in an XML email to customer care.
-- Independent of OSC gift columns (valaboterori_gift / valaboterori_biz_gift).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vala_email_sent          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vala_email_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vala_email_failed        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vala_email_failed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vala_biz_email_sent      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vala_biz_email_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vala_biz_email_failed    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vala_biz_email_failed_at TIMESTAMPTZ;

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('008', 'Add VALA email tracking columns');

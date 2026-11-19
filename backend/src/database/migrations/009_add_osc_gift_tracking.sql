-- Migration 009: Add OSC/Recharge gift tracking columns
-- Tracks automatic prepaid gifting via Recharge SOAP API (independent from email system)

ALTER TABLE users
  -- Personal package OSC tracking
  ADD COLUMN IF NOT EXISTS osc_gift_attempted      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS osc_gift_attempted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS osc_gift_error          TEXT,          -- null = success, text = error message
  ADD COLUMN IF NOT EXISTS osc_transaction_id      VARCHAR(50),   -- Recharge TransactionID on success

  -- Business package OSC tracking
  ADD COLUMN IF NOT EXISTS osc_biz_gift_attempted      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS osc_biz_gift_attempted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS osc_biz_gift_error          TEXT,
  ADD COLUMN IF NOT EXISTS osc_biz_transaction_id      VARCHAR(50);

-- States (per package):
--   osc_gift_attempted = false                             → not yet tried
--   osc_gift_attempted = true  + valaboterori_gift = true  → success (prepaid, gifted)
--   osc_gift_attempted = true  + valaboterori_gift = false → failed (postpaid/wrong network/timeout)
--   phone is not VALA                                      → N/A

INSERT INTO schema_migrations (version, description)
VALUES ('009', 'Add OSC/Recharge gift tracking columns');

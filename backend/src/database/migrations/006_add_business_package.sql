-- Migration 006: Add business package columns to users + package_type to payments

-- Business package payment fields on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS biz_payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (biz_payment_status IN ('unpaid', 'pending', 'paid')),
  ADD COLUMN IF NOT EXISTS biz_payment_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS biz_payment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS biz_payment_amount INTEGER;

-- Business package OTT credentials on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS biz_ott_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS biz_ott_password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS biz_ott_subscriber_id INTEGER,
  ADD COLUMN IF NOT EXISTS biz_ott_provisioned BOOLEAN DEFAULT FALSE;

-- Track which package each payment is for
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS package_type VARCHAR(20) DEFAULT 'personal'
    CHECK (package_type IN ('personal', 'business'));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_biz_payment_status ON users(biz_payment_status);

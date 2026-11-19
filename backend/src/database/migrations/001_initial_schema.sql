-- Migration: 001_initial_schema
-- Description: Create users and payments tables
-- Date: 2026-03-01

BEGIN;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,

    -- Email Verification
    email_verified              BOOLEAN DEFAULT FALSE,
    verification_code           VARCHAR(6),
    verification_code_expires   TIMESTAMP WITH TIME ZONE,

    -- Payment
    payment_status      VARCHAR(20) DEFAULT 'unpaid'
                        CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
    payment_reference   VARCHAR(255),
    payment_date        TIMESTAMP WITH TIME ZONE,
    payment_amount      INTEGER,

    -- OTT Credentials
    ott_username        VARCHAR(255),
    ott_password        VARCHAR(255),
    ott_provisioned     BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_reference     VARCHAR(255) UNIQUE NOT NULL,
    amount              INTEGER NOT NULL,
    currency            VARCHAR(3) DEFAULT 'EUR',
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    bank_transaction_id VARCHAR(255),
    bank_response       JSONB,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_reference ON payments(order_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers (drop if exists for idempotency)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id              SERIAL PRIMARY KEY,
    version         VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    executed_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Initial schema - users and payments tables');

COMMIT;

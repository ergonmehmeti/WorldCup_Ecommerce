-- ============================================
-- World Cup E-commerce Database Schema
-- ============================================
-- Run this file against your PostgreSQL database:
-- psql -U your_user -d worldcup_ecommerce -f schema.sql

-- Create the database (run separately if needed)
-- CREATE DATABASE worldcup_ecommerce;

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
    payment_amount      INTEGER,  -- in cents (e.g., 2000 = €20.00)

    -- OTT Credentials (received from OTT API after payment)
    ott_username        VARCHAR(255),
    ott_password        VARCHAR(255),
    ott_subscriber_id   INTEGER,
    ott_provisioned     BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table (for audit trail)
CREATE TABLE IF NOT EXISTS payments (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_reference     VARCHAR(255) UNIQUE NOT NULL,
    amount              INTEGER NOT NULL,         -- in cents
    currency            VARCHAR(3) DEFAULT 'EUR',
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    bank_transaction_id VARCHAR(255),
    bank_response       JSONB,                    -- store raw bank callback data
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_reference ON payments(order_reference);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

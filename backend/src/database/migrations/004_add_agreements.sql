-- Migration 004: Create agreements table for legal record of user consent
CREATE TABLE IF NOT EXISTS agreements (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_type    VARCHAR(20) NOT NULL DEFAULT 'premium',
    agreed_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address      VARCHAR(45),
    user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_agreements_user_id ON agreements(user_id);

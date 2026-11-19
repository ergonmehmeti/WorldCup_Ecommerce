-- Migration: Add mobile_package field to users table
-- This field tracks which mobile package (XXL, XL, L, M, S) was purchased
-- or 'false' if OSC second request failed

ALTER TABLE users ADD COLUMN mobile_package VARCHAR(10) DEFAULT NULL;

-- Add index for querying users by mobile package
CREATE INDEX idx_users_mobile_package ON users(mobile_package);

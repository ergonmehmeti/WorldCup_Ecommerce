-- Migration 010: Add indexes on ott_username and biz_ott_username
-- Improves lookup performance when checking for existing usernames during provisioning

CREATE INDEX IF NOT EXISTS idx_users_ott_username ON users(ott_username);
CREATE INDEX IF NOT EXISTS idx_users_biz_ott_username ON users(biz_ott_username);

INSERT INTO schema_migrations (version, description)
VALUES ('010', 'Add indexes on ott_username and biz_ott_username');

-- Additive B2B V1 email verification token storage.
-- Apply only after reviewing 001_initial.sql on an isolated development database.
-- Store only SHA-256 token digests, never raw verification tokens.
CREATE TABLE IF NOT EXISTS b2b_email_verifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 consumed_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_b2b_verification_hash (token_hash),
 INDEX ix_b2b_verification_user (user_id),
 FOREIGN KEY (user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Application transaction must atomically mark consumed_at and email_verified_at.
-- Never treat the pure verification helper as proof of single-use consumption.

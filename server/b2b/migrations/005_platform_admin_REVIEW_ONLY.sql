-- Additive only. Execute via existing owner-controlled migrator, never runtime DDL.
CREATE TABLE IF NOT EXISTS b2b_platform_admins (
 id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 totp_encrypted VARCHAR(160) CHARACTER SET ascii NOT NULL,
 state ENUM('PROVISIONED','ACTIVE','DISABLED') NOT NULL DEFAULT 'PROVISIONED',
 role ENUM('COMPANY_REVIEW') NOT NULL DEFAULT 'COMPANY_REVIEW',
 auth_version INT UNSIGNED NOT NULL DEFAULT 1,
 last_totp_counter BIGINT NOT NULL DEFAULT -1,
 failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
 locked_until DATETIME(3) NULL,
 conflict_company_ids JSON NOT NULL,
 conflicts_confirmed_at DATETIME(3) NOT NULL,
 owner_authorization_ref VARCHAR(200) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS b2b_platform_admin_sessions (
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 admin_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 auth_version INT UNSIGNED NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 INDEX admin_session_owner (admin_id),
 CONSTRAINT admin_session_identity FOREIGN KEY(admin_id) REFERENCES b2b_platform_admins(id)
) ENGINE=InnoDB;
-- Existing audit events retain their meaning; member actor IDs are never fabricated.
ALTER TABLE b2b_audit_log ADD COLUMN IF NOT EXISTS platform_admin_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL;

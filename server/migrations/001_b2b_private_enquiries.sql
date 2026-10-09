-- OWNER-REVIEWED MANUAL MIGRATION ONLY. Never executed by the web runtime.
-- MySQL 5.7+/MariaDB InnoDB. Re-run CREATE IF NOT EXISTS safely; existing incompatible
-- schemas are not silently repaired. Verify schema/grants/backup before activation.
CREATE TABLE IF NOT EXISTS b2b_enquiries (
 enquiry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 received_at_ms BIGINT UNSIGNED NOT NULL,
 company_name VARCHAR(120) NOT NULL,
 business_email VARCHAR(254) NOT NULL,
 role ENUM('Buyer','Seller','Partner') NOT NULL,
 country VARCHAR(100) NOT NULL,
 delivery_status ENUM('RECEIVED','PENDING_DELIVERY','DELIVERING','DELIVERED_TO_PROVIDER','DELIVERY_FAILED_RETRYABLE','DELIVERY_FAILED_PERMANENT','MANUAL_REVIEW_REQUIRED') NOT NULL,
 delivery_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
 last_delivery_error_code VARCHAR(40) CHARACTER SET ascii NULL,
 created_at_ms BIGINT UNSIGNED NOT NULL,
 updated_at_ms BIGINT UNSIGNED NOT NULL,
 next_attempt_at_ms BIGINT UNSIGNED NOT NULL,
 retention_expires_at_ms BIGINT UNSIGNED NOT NULL,
 provider_message_id VARCHAR(200) CHARACTER SET ascii NULL,
 claim_token CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 INDEX b2b_delivery_due (delivery_status,next_attempt_at_ms),
 INDEX b2b_retention_due (retention_expires_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS b2b_idempotency (
 key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 enquiry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
 expires_at_ms BIGINT UNSIGNED NOT NULL,
 INDEX b2b_key_expiry (expires_at_ms),
 CONSTRAINT b2b_key_enquiry FOREIGN KEY(enquiry_id) REFERENCES b2b_enquiries(enquiry_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS b2b_rate_buckets (
 bucket_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 count_value INT UNSIGNED NOT NULL,
 window_expires_at_ms BIGINT UNSIGNED NOT NULL,
 retention_expires_at_ms BIGINT UNSIGNED NOT NULL,
 INDEX b2b_rate_expiry (retention_expires_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS b2b_delivery_attempts (
 enquiry_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 attempt_no TINYINT UNSIGNED NOT NULL,
 claim_token CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 delivery_status ENUM('DELIVERING','DELIVERED_TO_PROVIDER','DELIVERY_FAILED_RETRYABLE','DELIVERY_FAILED_PERMANENT','MANUAL_REVIEW_REQUIRED') NOT NULL,
 started_at_ms BIGINT UNSIGNED NOT NULL,
 completed_at_ms BIGINT UNSIGNED NULL,
 error_code VARCHAR(40) CHARACTER SET ascii NULL,
 PRIMARY KEY(enquiry_id,attempt_no),
 UNIQUE KEY b2b_attempt_claim (claim_token),
 CONSTRAINT b2b_attempt_enquiry FOREIGN KEY(enquiry_id) REFERENCES b2b_enquiries(enquiry_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

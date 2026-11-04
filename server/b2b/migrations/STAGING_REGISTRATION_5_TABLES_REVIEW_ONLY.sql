-- SeedTrade B2B V1 — PROPOSED staging-only registration schema.
-- REVIEW DRAFT. DO NOT APPLY without separate owner approval and backup.
-- Target identity (must be verified at execution): u230581718_staging_b2b.
-- Not for production or the historical u230581718_seedtrade_test database.
-- These five tables support the existing registration repository only.
-- No offers, enquiries, messages, or background jobs are created.
-- DDL may partially commit on failure: take a verified backup first.
-- Existing 001_initial.sql and 002_email_verification.sql remain unchanged.

CREATE TABLE b2b_companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legal_name VARCHAR(255) NOT NULL,
  registration_country CHAR(2) NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  verification_status ENUM('PENDING','VERIFIED','MORE_INFO','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_registration (registration_country, registration_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2b_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_b2b_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2b_company_members (
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('MEMBER','COMPANY_ADMIN') NOT NULL DEFAULT 'MEMBER',
  PRIMARY KEY (company_id,user_id),
  FOREIGN KEY (company_id) REFERENCES b2b_companies(id),
  FOREIGN KEY (user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2b_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  company_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_b2b_audit_company_time (company_id,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2b_email_verifications (
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

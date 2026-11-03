-- SeedTrade B2B V1: additive schema, development only.
-- Apply only to a dedicated empty development database after backup and review.
-- Existing Crop Master IDs are referenced as strings; no duplicate crop taxonomy is created.
CREATE TABLE IF NOT EXISTS b2b_companies (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 legal_name VARCHAR(255) NOT NULL,
 registration_country CHAR(2) NOT NULL,
 registration_number VARCHAR(100) NOT NULL,
 verification_status ENUM('PENDING','VERIFIED','MORE_INFO','REJECTED') NOT NULL DEFAULT 'PENDING',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_company_registration (registration_country, registration_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b2b_users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 email_verified_at TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_b2b_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b2b_company_members (
 company_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 role ENUM('MEMBER','COMPANY_ADMIN') NOT NULL DEFAULT 'MEMBER',
 PRIMARY KEY (company_id,user_id),
 FOREIGN KEY (company_id) REFERENCES b2b_companies(id),
 FOREIGN KEY (user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b2b_offers (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT UNSIGNED NOT NULL,
 crop_id VARCHAR(128) NOT NULL,
 variety_id VARCHAR(128) NULL,
 seed_category VARCHAR(80) NULL,
 certification_class VARCHAR(80) NULL,
 quantity DECIMAL(16,3) NOT NULL,
 unit VARCHAR(16) NOT NULL,
 origin_country CHAR(2) NULL,
 harvest_year SMALLINT UNSIGNED NULL,
 incoterm VARCHAR(16) NULL,
 price_amount DECIMAL(16,2) NULL,
 currency CHAR(3) NOT NULL DEFAULT 'EUR',
 valid_until DATE NULL,
 status ENUM('DRAFT','PUBLISHED','CLOSED') NOT NULL DEFAULT 'DRAFT',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (company_id) REFERENCES b2b_companies(id),
 INDEX ix_b2b_offers_crop_status (crop_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b2b_enquiries (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 offer_id BIGINT UNSIGNED NOT NULL,
 buyer_company_id BIGINT UNSIGNED NOT NULL,
 created_by_user_id BIGINT UNSIGNED NOT NULL,
 status ENUM('OPEN','REPLIED','CLOSED') NOT NULL DEFAULT 'OPEN',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (offer_id) REFERENCES b2b_offers(id),
 FOREIGN KEY (buyer_company_id) REFERENCES b2b_companies(id),
 FOREIGN KEY (created_by_user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b2b_enquiry_messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 enquiry_id BIGINT UNSIGNED NOT NULL,
 author_user_id BIGINT UNSIGNED NOT NULL,
 body TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (enquiry_id) REFERENCES b2b_enquiries(id),
 FOREIGN KEY (author_user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS b2b_audit_log (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 actor_user_id BIGINT UNSIGNED NULL,
 company_id BIGINT UNSIGNED NULL,
 action VARCHAR(100) NOT NULL,
 entity_type VARCHAR(80) NOT NULL,
 entity_id VARCHAR(100) NOT NULL,
 occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX ix_b2b_audit_company_time (company_id,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

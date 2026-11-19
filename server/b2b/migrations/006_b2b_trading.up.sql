-- Additive local candidate only. Never executed by website startup/build.
CREATE TABLE IF NOT EXISTS b2b_trading_records (
 enquiry_id BIGINT UNSIGNED PRIMARY KEY, offer_id BIGINT UNSIGNED NOT NULL,
 owner_company_id BIGINT UNSIGNED NOT NULL, responding_company_id BIGINT UNSIGNED NOT NULL,
 version INT UNSIGNED NOT NULL, payload_json JSON NOT NULL,
 INDEX trading_owner(owner_company_id,enquiry_id), INDEX trading_respondent(responding_company_id,enquiry_id),
 FOREIGN KEY(enquiry_id) REFERENCES b2b_enquiries(id), FOREIGN KEY(offer_id) REFERENCES b2b_offers(id),
 FOREIGN KEY(owner_company_id) REFERENCES b2b_companies(id), FOREIGN KEY(responding_company_id) REFERENCES b2b_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS b2b_listing_preferences (
 user_id BIGINT UNSIGNED PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE,
 language CHAR(2) NOT NULL, crop_ids JSON NOT NULL,
 FOREIGN KEY(user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS b2b_listing_notices (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, offer_id BIGINT UNSIGNED NOT NULL,
 offer_version INT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
 payload_json JSON NOT NULL, status ENUM('PENDING','SENDING','SENT','UNKNOWN','FAILED','BLOCKED') NOT NULL,
 UNIQUE KEY listing_recipient(offer_id,offer_version,user_id),
 FOREIGN KEY(offer_id) REFERENCES b2b_offers(id), FOREIGN KEY(user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

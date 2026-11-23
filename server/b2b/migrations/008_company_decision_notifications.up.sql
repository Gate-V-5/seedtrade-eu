-- Additive extension of the existing transactional outbox. No startup DDL.
CREATE TABLE b2b_company_decision_notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT UNSIGNED NOT NULL,
 decision_version INT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL,
 recipient_email VARCHAR(254) NOT NULL,
 language CHAR(2) NOT NULL,
 decision ENUM('VERIFIED','REJECTED') NOT NULL,
 admin_actor_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 status ENUM('PENDING','SENDING','SENT','RETRY','FAILED','UNKNOWN','BLOCKED') NOT NULL DEFAULT 'PENDING',
 attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
 smtp_code SMALLINT UNSIGNED NULL,
 next_attempt_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 finished_at DATETIME(3) NULL,
 UNIQUE KEY company_decision_recipient(company_id,decision_version,user_id),
 INDEX decision_pending(status,next_attempt_at,id),
 FOREIGN KEY(company_id)REFERENCES b2b_companies(id),
 FOREIGN KEY(user_id)REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

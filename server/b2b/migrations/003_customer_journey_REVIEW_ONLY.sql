-- REVIEW ONLY. Never run on import, startup, npm install/build or deployment.
-- Apply only after owner approval, backup and read-only comparison of the five existing tables.
-- Target: u230581718_staging_b2b. No DROP/TRUNCATE or recreation of existing registration tables.
-- These statements are additive, but MariaDB DDL can partially commit: inspect any failure; do not blindly replay.
USE u230581718_staging_b2b;

ALTER TABLE b2b_companies
  ADD COLUMN profile_json JSON NULL,
  ADD COLUMN profile_version INT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE b2b_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ix_b2b_sessions_user_expiry (user_id,expires_at),
  FOREIGN KEY (user_id) REFERENCES b2b_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reuses the offer/enquiry/message contracts proposed in 001_initial.sql, with versions,
-- one conversation per buyer/offer and an immutable author-company snapshot.
CREATE TABLE b2b_offers (
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
  valid_until DATE NOT NULL,
  status ENUM('DRAFT','PUBLISHED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES b2b_companies(id),
  INDEX ix_b2b_offers_crop_status (crop_id,status),
  INDEX ix_b2b_offers_company (company_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2b_enquiries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  offer_id BIGINT UNSIGNED NOT NULL,
  buyer_company_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('OPEN','REPLIED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_b2b_enquiry_buyer_offer (offer_id,buyer_company_id),
  INDEX ix_b2b_enquiries_buyer (buyer_company_id,id),
  FOREIGN KEY (offer_id) REFERENCES b2b_offers(id),
  FOREIGN KEY (buyer_company_id) REFERENCES b2b_companies(id),
  FOREIGN KEY (created_by_user_id) REFERENCES b2b_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2b_enquiry_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enquiry_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  author_company_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_b2b_enquiry_messages_thread (enquiry_id,id),
  FOREIGN KEY (enquiry_id) REFERENCES b2b_enquiries(id),
  FOREIGN KEY (author_user_id) REFERENCES b2b_users(id),
  FOREIGN KEY (author_company_id) REFERENCES b2b_companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Runtime grants after approval: SELECT on the nine tables; INSERT on sessions/offers/enquiries/messages/audit;
-- existing registration INSERT grants; UPDATE on companies/offers/enquiries/users/email_verifications;
-- DELETE on sessions only. Runtime does not need DDL, global privileges or GRANT OPTION.
-- Session expiry is checked on every request. Account-scoped expired sessions are deleted on login.
-- Retention/erasure for profiles, messages, audit and backups remains an owner-approved operator procedure;
-- no global deletion scheduler or automatic database rollback is introduced.
--
-- ONE CONTROLLED STAGING ACCEPTANCE (owner approval must cover remote writes, emails, configuration and release):
-- 1. Privately compare scripts/b2b_staging_schema_readonly.sql results with the five-table contract
--    and this proposal, inspect effective grants, and preserve the confirmed restorable DB/release/config backup.
-- 2. Apply this proposal with an owner migration account; verify nine InnoDB tables, eleven FKs,
--    column/index/default parity. The application account receives only the bounded runtime grants above.
-- 3. Commit/push the reviewed local source through the existing Hostinger Git staging workflow;
--    keep all registration/portal/admin flags false initially. Verify public pages and /b2b/account,
--    noindex/private caching, disabled forms and no-store API 404s. Do not run unrelated workflows.
-- 4. Owner must approve a real privacy/terms notice (current /privacy is a draft), controller/contact,
--    purposes, counterpart disclosure, retention/erasure/access and backup handling before the privacy gate.
--    Privately verify HTTPS proxy peer/header overwrite policy and single-instance/external abuse controls.
-- 5. With explicit mail/config authorization, configure only registration SMTP (465 TLS or 587 required
--    STARTTLS) and verified sender/approved real inboxes. Global SEEDTRADE_MAIL_TRANSPORT stays test-stream.
--    Prove actual inbox delivery, not just transport acceptance; then authorize the time-bounded write test
--    with the existing six registration gates plus B2B_PORTAL_ENABLED/B2B_PORTAL_STORAGE_VERIFIED satisfied.
-- 6. Register/verify a trusted operator first; read its own authenticated /session user.id and only then
--    privately enable B2B_PLATFORM_ADMIN_ENABLED with that approved existing ID in B2B_PLATFORM_ADMIN_USER_IDS.
--    Never preassign an anticipated auto-increment ID or promote the first self-registered customer.
--    Restart the staging process only under approval to apply these private runtime settings.
-- 7. Register/verify two owner-controlled inboxes as seller/buyer; sign in, submit both profiles, review
--    identity as the operator, approve both, create/edit/publish a seller draft with a canonical crop,
--    browse as buyer, send one inquiry, read/reply as seller and confirm the buyer receives the reply.
--    Check session reload/logout, cookie flags, no self-approval, no cross-company reads/edits,
--    expired/replayed verification failure, pending approval and unpublication after profile changes.
--    Respect the five-login/15-minute IP/account budget; do not bypass production rate limits for tests.
-- 8. Sign out test accounts and return all activation flags to false unless continued activation is
--    expressly approved. On failure restore the pinned previous source/config through the known rollback
--    mechanism; leave additive schema/data for owner reconciliation, never DROP/TRUNCATE on code rollback.

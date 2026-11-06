-- Customer journey companion to the existing read-only probe. Metadata only.
-- SELECT-only metadata; no registration rows, credentials, grants hashes, DDL or DML.
-- Compare these ordered results with
-- server/b2b/migrations/STAGING_REGISTRATION_5_TABLES_REVIEW_ONLY.sql and
-- server/b2b/migrations/003_customer_journey_REVIEW_ONLY.sql.
-- Check missing/extra columns, defaults, unsigned IDs, auto_increment, enum values,
-- nullable audit company_id, token ascii_bin collation and datetime(3) precision.
-- Index names need not match; ordered columns, uniqueness and full-length keys must.
-- Before expansion: five InnoDB tables and three FKs. After approved expansion:
-- nine InnoDB tables, eleven FKs, session expiry index, company profile/version columns,
-- offer versions and unique buyer/offer conversations. Missing metadata is not proof of absence.

SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'u230581718_staging_b2b'
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME IN ('b2b_companies','b2b_users','b2b_company_members',
                     'b2b_audit_log','b2b_email_verifications','b2b_sessions',
                     'b2b_offers','b2b_enquiries','b2b_enquiry_messages')
ORDER BY TABLE_NAME;

SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE,
       IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_SET_NAME,
       COLLATION_NAME, DATETIME_PRECISION
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'u230581718_staging_b2b'
  AND TABLE_NAME IN ('b2b_companies','b2b_users','b2b_company_members',
                     'b2b_audit_log','b2b_email_verifications','b2b_sessions',
                     'b2b_offers','b2b_enquiries','b2b_enquiry_messages')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME,
       SUB_PART, COLLATION, INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'u230581718_staging_b2b'
  AND TABLE_NAME IN ('b2b_companies','b2b_users','b2b_company_members',
                     'b2b_audit_log','b2b_email_verifications','b2b_sessions',
                     'b2b_offers','b2b_enquiries','b2b_enquiry_messages')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION, k.COLUMN_NAME,
       k.REFERENCED_TABLE_SCHEMA, k.REFERENCED_TABLE_NAME,
       k.REFERENCED_COLUMN_NAME, r.UPDATE_RULE, r.DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE AS k
JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
  ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND r.TABLE_NAME = k.TABLE_NAME AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
WHERE k.TABLE_SCHEMA = 'u230581718_staging_b2b'
  AND k.REFERENCED_TABLE_NAME IS NOT NULL
  AND k.TABLE_NAME IN ('b2b_companies','b2b_users','b2b_company_members',
                       'b2b_audit_log','b2b_email_verifications','b2b_sessions',
                     'b2b_offers','b2b_enquiries','b2b_enquiry_messages')
ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION;

-- Direct privilege metadata only; never paste SHOW GRANTS output containing authentication material.
-- Effective inherited role grants must be reviewed privately by the owner as well.
SELECT 'GLOBAL' AS scope, PRIVILEGE_TYPE, IS_GRANTABLE
FROM information_schema.USER_PRIVILEGES
WHERE GRANTEE=CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',1)),'@',QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',-1)))
UNION ALL
SELECT CONCAT('SCHEMA:',TABLE_SCHEMA),PRIVILEGE_TYPE,IS_GRANTABLE
FROM information_schema.SCHEMA_PRIVILEGES
WHERE TABLE_SCHEMA='u230581718_staging_b2b'
  AND GRANTEE=CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',1)),'@',QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',-1)))
UNION ALL
SELECT CONCAT('TABLE:',TABLE_NAME),PRIVILEGE_TYPE,IS_GRANTABLE
FROM information_schema.TABLE_PRIVILEGES
WHERE TABLE_SCHEMA='u230581718_staging_b2b'
  AND GRANTEE=CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',1)),'@',QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',-1)))
UNION ALL
SELECT CONCAT('COLUMN:',TABLE_NAME,'.',COLUMN_NAME),PRIVILEGE_TYPE,IS_GRANTABLE
FROM information_schema.COLUMN_PRIVILEGES
WHERE TABLE_SCHEMA='u230581718_staging_b2b'
  AND GRANTEE=CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',1)),'@',QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',-1)))
ORDER BY scope,PRIVILEGE_TYPE;

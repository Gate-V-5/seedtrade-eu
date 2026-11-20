-- Preserve existing accounts/roles. A new identity has no review permission.
ALTER TABLE b2b_platform_admins
 MODIFY COLUMN role ENUM('COMPANY_REVIEW','ENROLLMENT_ONLY') NOT NULL DEFAULT 'COMPANY_REVIEW',
 MODIFY COLUMN conflict_company_ids JSON NULL,
 MODIFY COLUMN conflicts_confirmed_at DATETIME(3) NULL;
-- Existing runtime grants cannot update role, conflicts or owner authorization.
-- Rollback retains this expanded schema and all identity/audit data. Never narrow
-- the ENUM over retained ENROLLMENT_ONLY rows or promote them during rollback.

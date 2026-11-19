-- Proposed least-privilege extension for the existing runtime and backup accounts.
-- Runtime CANNOT provision accounts, replace credentials/keys or alter conflict records.
GRANT SELECT ON u230581718_seedtrade_b2b.b2b_platform_admins TO 'u230581718_b2b_prod'@'localhost';
GRANT UPDATE (state,last_totp_counter,failed_attempts,locked_until) ON u230581718_seedtrade_b2b.b2b_platform_admins TO 'u230581718_b2b_prod'@'localhost';
GRANT SELECT,INSERT,DELETE ON u230581718_seedtrade_b2b.b2b_platform_admin_sessions TO 'u230581718_b2b_prod'@'localhost';
GRANT SELECT ON u230581718_seedtrade_b2b.b2b_platform_admins TO 'seedtrade_prod_backup'@'localhost';
GRANT SELECT ON u230581718_seedtrade_b2b.b2b_platform_admin_sessions TO 'seedtrade_prod_backup'@'localhost';

# Package 3H — existing staging only

Production remains on main. Staging source overlays the approved Package3D backend without changing UI or canonical data. The runtimeMail staging guard and production SMTP requirements are preserved. No migration, cron schedule or mail delivery activates automatically.

## Default behaviour

Keep existing staging identity and `test-stream` settings. With enquiries disabled or DB/proxy/privacy configuration incomplete, ordinary pages remain HTTP200 and `/api/network-interest` returns HTTP503 without a receipt or memory fallback. Optional worker endpoint is absent unless separately enabled with a private token and verified HTTPS proxy context. Staging responses carry a non-secret `X-SeedTrade-Staging-Backend: package3h` marker.

## Private environment configuration

Use `server/b2b.staging.env.example`. Set password and storage/cron secrets only in the private staging control plane. Credentials must belong exclusively to `u230581718_st_test` and database `u230581718_seedtrade_test`. No Remote MySQL access. TCP requires verified TLS/CA, or use a hosting-confirmed private Unix socket with explicit verification. The active connection must return exact DATABASE() and CURRENT_USER(), and restricted grants; environment-name equality alone is insufficient. Every pooled connection is checked before DDL/DML. Roles, global privileges other than USAGE, privileges for other databases and GRANT OPTION fail closed.

Do not use production credentials. Do not set activation flags based on mocks. Proxy peer/overwrite policy, privacy approval and schema verification remain prerequisites. Deletion schedules remain disabled; retention periods are unapproved defaults.

## Manual migration — private staging runtime only

After secure test identity/configuration is established, set `B2B_STAGING_TEST_EXECUTION=true` privately for this controlled session. Run:

    node server/networkStagingMigration.mjs --apply-test-only

This verifies active identity, security and grants before applying the unchanged four-table Package3D CREATE IF NOT EXISTS migration, then checks engines/indexes/FKs. It does not drop or overwrite existing records. DDL is not transactionally rolled back; a partial failure is reported and must be reviewed rather than hidden. A mismatch stops before DDL.

## Real test procedure

Inside the same authorised private runtime only, set `B2B_STAGING_REAL_TESTS=true` for the test session and run:

    node --test tests/networkStagingMysqlIntegration.test.mjs

Use no command-line credentials. The test checks migration replay, transactional receipts, four concurrent duplicates within the four-connection pool limit, payload conflict, fresh-pool reconnect persistence, locks, retry limits, interrupted recovery, a real SQL error/rollback, adapter failure recovery, hostile synthetic input parameter binding, stream-only non-delivery and random-key scoped cleanup. It never labels stream generation as provider acceptance. No SMTP socket/API transport is used. Failure simulation and mocked provider outcomes are distinct from genuine DB evidence. Pool reconnect is tested; an OS-process restart remains a separate operator check.

Cleanup deletes only this run's identified synthetic receipts and client bucket, preserving other records and the shared global rate bucket. If cleanup fails, retain the private failure receipt and reconcile synthetic keys internally. Never TRUNCATE or DROP. Disable test execution flags afterwards. Do not enable or schedule cron/deletion.

## Activation limits

Current frontend is byte-identical to approved staging. It does not yet send Package3D's mandatory Idempotency-Key or consume the durable HTTP202 acknowledgement. Therefore this package prepares the backend and API test procedure; it does not claim the public form is operational. Keep enquiries disabled until separately approved minimal client protocol alignment and real DB/runtime/privacy verification. No form redesign is needed.

## Failure and rollback

No DB exception or credential detail enters public responses or logs. An unready DB returns503 and leaves ordinary pages usable. A verified receipt returns202 only after durable commit; late commits reconcile with the same idempotency key. Unknown provider outcomes remain manual review; test transport intentionally settles permanent non-delivery with TEST_TRANSPORT_DISABLED and never retries knowingly. To deactivate, set B2B_ENQUIRIES_ENABLED=false only in staging. To restore prior staging source use its recorded parent commit; never change main or production. Do not automatically alter or delete schema/data on rollback.

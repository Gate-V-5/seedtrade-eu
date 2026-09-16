# Backup & Recovery v1

The 371-file recovered source is C:\SeedTrade. Its complete byte inventory is RECOVERED_BASELINE.json. All 328 September 14 baseline files and all 338 September 15 baseline files match their original SHA256. There are 33 further files. No original source file was edited during the read-only audit.

RECOVERED = bytes recovered from the audited source. REBUILT = new code/documentation, or deliberately changed recovered file, never represented as the original. MISSING = requested evidence or artifact not found in the audited sources; not proof that it never existed elsewhere.

## Restore from full ZIP

1. Obtain the ZIP, its .sha256 file and CHECKPOINT_RECEIPT.json from an independent durable location. Verify the archive SHA256 against the receipt before using its code.
2. With trusted Python, run tools/recovery.py verify-zip --zip <archive>. It checks every entry, size, SHA256, duplicate entries and unsafe paths.
3. Extract into a new empty directory. Do not overwrite an existing project. Run python -B tools/recovery.py verify --root <restored-directory>.
4. Read MASTER_STATE.json, CONTROL_REVIEW.md, ACCESS_REQUIRED.md and MASTER_ROADMAP.md. Re-run each test command from RECOVERED_TEST_RESULTS.json; recovery tests use python -B -m unittest discover -s tools -p test_*.py -v.
5. To restore Git history, clone Gate-V-5/seedtrade-eu and check out the exact receipt commit on the named backup branch. Overlay the archive's data/raw only after verifying it. Git deliberately excludes data/raw as in the original .gitignore; Git alone is not a complete recovery of the ~4 GB evidence.
6. Restore authenticated access manually. No passwords, tokens, cookies or .env secrets are part of the recovery package. Do not run copernicus_auth_test.py until authorized manual access is established; it is a live integration script, not a local unit suite.

## Create a checkpoint

Run all suites and relevant build checks. Update MASTER_STATE and control report. Run inventory then verify. Commit only reviewed files to the dedicated recovery backup branch. Verify the remote commit. Run snapshot with a ZIP destination outside the project; the tool verifies every archived byte. Save a receipt binding remote commit, archive hash and FILE_INVENTORY hash. Copy archive and receipt to an independently durable store and rehash the destination. A local Sandbox ZIP without a confirmed durable destination remains BACKUP_WARNING.

The inventory excludes .git, dependencies, generated build output, caches and itself/SHA256SUMS to avoid recursion. It includes raw source data. SHA256SUMS also hashes FILE_INVENTORY; the external ZIP hash protects both manifests. Git backup branch is used to avoid a default-branch deployment trigger. No deployment is requested or performed.

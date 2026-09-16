# SeedTrade Recovery control review — 2026-09-16

## Verified outcome

RECOVERED: 371 original files, 4,042,227,819 bytes. SHA256 confirms all 328 files from the September 14 baseline unchanged; all 338 from the September 15 baseline unchanged. The 10 documented additions survived, plus 33 newer additions. No original file is missing or modified against those baselines. Copies verified byte-for-byte. The 6 website files match GitHub main at 44479ed8396dbc2161571511a0d084a91ee2712d. GitHub history contains seven commits through September 4, one branch and no releases observed.

The newest recovered development journal records September 15 04:02 UTC. This is documentary evidence, not an inference from Windows timestamps. It contains partial Multi-Source work beyond the requested 18-test reference. The earlier belief that all Work files were lost is contradicted by the recovered bytes.

## Tests and build

Phenology 21/21, Supply 14/14, Trade 48/48, Recovery 7/7 PASS (90 total). All nine recovered test_*.py files are covered. Original Trade 18 methods are preserved. Web build passes with locked Vite 8.3.0 and React 18.3.1; no deployment. AST parse of every Python source succeeds. Weather has no dedicated recovered test suite; syntax inspection is not empirical validation. Copernicus live OAuth test requires credentials and was not run.

## Integrity and backup decisions

RECOVERED_BASELINE.json fixes all original hashes. New recovery documents/tools and dependency lock are REBUILT; this is not a recreation of missing originals. FILE_INVENTORY records every payload file including raw data. Manifests exclude self-reference, Git, dependency caches and build output. An external receipt binds the final commit to the ZIP and manifest hashes.

Canonical Git checkpoint uses backup/recovery-v1-20260916, preserving main to avoid a possible deployment integration. Existing data/raw exclusion is retained; therefore Git alone cannot restore the full project. Plan B ZIP contains full original raw evidence. BACKUP_WARNING remains until a durable independent destination is confirmed and checked. No website deployment, email access or secrets handling performed.

## Open evidence gaps

Globalwits redirected to login; ACCESS_REQUIRED, manual login requested. Five real Globalwits/Eurostat pairs are MISSING. Real Eurostat June 2025 and UN June 2025 raw sample files survived, but a defensible accepted concordance/cross-check is still pending. Generic Basket v0.2 exists; real populated v0.2 metadata registry is incomplete. Refresh and signals are designs at this checkpoint. Do not count synthetic tests as empirical data validation. Full commercial product remains M3 roadmap work.

## Operational errors resolved / limitations

Initial Git clone failed because the bundled HTTPS helper path was absent; setting the per-process helper path resolved it. Network sandbox blocked Git/npm; approved network execution succeeded. Git ownership check uses a per-command exact safe.directory, no global relaxation. First recovery-test command used the wrong working directory and did not discover tests; corrected invocation passed all seven. Original pnpm network attempt failed; successful approved dependency install and build followed. Browser navigation returned only after a lengthy tool delay; no development during that blocked tool interval is claimed. No nightly automation was created.

## Pre-commit checks

High-specificity credential-pattern scan of staged text: no matches (not a guarantee of absence). Git whitespace inspection: 6 pre-existing/recovered formatting findings; original bytes retained for baseline integrity. No blanket whitespace rewrite.

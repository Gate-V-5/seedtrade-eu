# Seed Production Intelligence V1

The existing production evidence card now opens `/production-intelligence`. Its approved realistic visual and evidence-limited supply question are unchanged. The new page uses the existing Market Intelligence design with canonical entity, country, metric, year and minimum consecutive-history filters; selection-scoped KPIs; official historical values; unranked country evidence; source links and definitions.

## Evidence and transformation

The canonical V5 ZIP SHA256 is `12a5c499789336c69c280d6117b8ca6e73ed36d3111a8c2789957f3ce0a65b79`. Dropbox metadata and checksum sidecar matched the preserved local ZIP. The ZIP CRC and all 63 provenance member hashes were checked. Full remote ZIP readback remains blocked by the connector 5 MiB limit; upload existence is not full readback verification.

`generate_production_public.py` reads this immutable checkpoint and its embedded V41 canonical master. It checks PUBLIC_SAFE, mapping, original eligibility, metrics and provenance before projecting approved fields. It outputs 1,669 records, 23 CORE/STANDARD countries and 86 canonical entities. V5 has 1,835 PUBLIC_SAFE records; 166 Luxembourg records remain preserved in V5 and are excluded from the primary product. Canonical navigation is not pooling permission. No new taxon or research observation was created.

Every record retains its original country, metric, unit, year, value, source, botanical scope, certification stage, season and category. V5 exact-grain comparable series are reused. Missing years remain absent, isolated anomalies stay excluded, and quantity is never asserted to equal domestic production. National definitions have no proven common concordance, so comparisons are explicitly unranked and unsummed. There were no validated V5 directional classifications; neutral consecutive-history labels and individual plotted points are used. No interpolated line or arbitrary market-signal thresholds are introduced.

The public bundle contains a whitelisted projection, not source binaries, original research metadata, filesystem paths or CN research decisions. `PROVENANCE.json` records canonical source and projection hashes plus every approved projected observation signature. Public source institutions, document titles, reporting periods, original terminology and retrieval dates remain available.

## Reproduce and validate

From the repository root, with the immutable V5 dependency restored beside the repository:

```sh
npm ci --ignore-scripts
python3 scripts/generate_production_public.py ../SeedTrade-eu-seed-production-V05-20261003.zip --check
npm run build
npm test
node scripts/check_hydration_initial.mjs
node scripts/check_production_controls.mjs
node scripts/check_production_responsive.mjs
```

Checkpoints include the complete repository source state and built `dist`, the immutable V5 dependency, all validation tooling and QA evidence. A Git bundle preserves the baseline repository history for existing tests which compare historical commits. Restore by copying `repository/` to `seedtrade-eu/`, placing `dependencies/SeedTrade-eu-seed-production-V05-20261003.zip` beside it, and cloning the bundled baseline Git metadata if required. Never put the dependency ZIP in public or dist.

## QA and release gate

235 Python tests and four mocked B2B Node tests passed. Three production evidence Node cases execute under a Python gate. Additional controls/hydration and responsive CSS/DOM scripts passed. Build and all 45 prerendered routes passed, including 225 route/language DOM hydration combinations. The route-count assertions in two existing multilingual scripts were updated from 44 to 45; their full behavioral checks remain intact. The shallow checkout initially lacked historical reference commits, so Git history was fetched without changing main. Existing B2B server, Daily News components/CSS, header, footer, Trade Pulse, Weather and approved assets are unchanged.

Structural and computed CSS checks cover 360, 390, 430, 768, 1024 and 1440 pixels in all five languages. These do not prove rendered browser geometry or visual quality. Local Playwright failed because its Chromium executable is absent. The connected cloud browser preview timed out. `BROWSER_QA=BLOCKED_ENVIRONMENT`; no screenshots or visual PASS are claimed. This prevents a release-ready assertion.

The eager build bundle is 1,539.10 kB (269.16 kB gzip), triggering the existing 500 kB build warning. Further performance work should be reviewed separately. No manual deployment, GitHub push, real email, Globalwits or new research occurred. The implementation remains in the workspace, pending rendered browser QA and unambiguous owner authorization for push.

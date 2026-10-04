# European Seed Market Catalogue UI V2

Implemented against GitHub main `6f638719d5991b1ba3306ac8692b51638218acc1` in a fresh, initially clean detached worktree. No commit, push, deployment, new research, taxonomy activation or observation changes.

The category-first `/market` opens seven visual categories. Seven dedicated category routes provide compact commercial seed cards and a common/botanical-name search. All 65 approved commercial identities have stable `/market/seeds/<slug>` detail routes. Secondary customs methodology and public-source provenance are collapsed on individual detail pages. The existing eleven legacy market-detail routes remain available.

## Scope and counts

| Category | Commercial cards |
|---|---:|
| Cereals | 9 |
| Pulses / Legumes | 7 |
| Vegetables | 1 |
| Oil & Fibre Seeds | 12 |
| Maize & Sorghum | 3 |
| Fodder Plants & Amenity Grasses | 29 |
| Catch / Cover Crops | 43 |

There are 65 unique commercial entities and 39 multi-category entities. Category membership does not duplicate biological or observation records. Eleven cards have safely attributed trade amounts, 33 have group-level customs scope, and 54 display developing trade evidence. All seven full category trade aggregates remain withheld; category summaries show only entity counts and evidence-covered countries where supported. Missing amounts stay null and never become zero.

## Recovery and evidence boundaries

Recovered exact local archives and verified SHA256, ZIP integrity and connected Dropbox receipt evidence:

- Master V2: `06499266d53be983c375283d3b20bb9cdda4d53a5819bce33b07c7ed27f80908`.
- Priority 65: `08d8abeca5947c9985dbf36e1b1ee857e62508c490524b0e1533e460759c39b7`.

Exact input artefacts are preserved in `inputs/`. The public projection intentionally excludes owner supply claims, research/private paths, GlobalWits and Datamyne records. The proposal for 134 biological species is not activated. Homepage KPI remains 121; approved homepage code and assets are unchanged.

The older Priority 65 input associates common wheat (*Triticum aestivum*) with CN 10019110. The current canonical CN source identifies that code as spelt (*Triticum aestivum* subsp. *spelta*). This conflict is explicitly recorded in `PUBLIC_PROJECTION_QA.json`; the catalogue withholds the wheat amount while preserving the input and all original trade/production observations. Consequently 12 input trade cards become 11 public measured cards. Broad CN groups are never allocated to individual species. Parent-taxon quantities are not assigned to distinct commercial forms.

Representative-price evidence already has six source-compatibility flags in the input package; prices and their trends remain withheld. Category totals and market supply labels are not made public merely to fill the design. Seed production detail shows evidence availability, years and separated national metrics, with a link to the unchanged Production Intelligence interface. It does not invent a combined EU total or production trend.

## Visuals

Seven new category illustrations were generated with the built-in imagegen capability. They are realistic crop-category illustrations, not documentary evidence. No homepage imagery was replaced. `VISUAL_PROVENANCE.json` records subjects with botanical names, generation constraints, dimensions, original SHA256 and public-asset SHA256. PNG originals are preserved in `visual-originals/`; public WebP files use encoding-only conversion. Every asset was visually inspected independently.

## Verification

- 268 Python tests PASS; 43 Node tests PASS, including seven targeted catalogue tests and all existing network, crop-master, Production, trade-coverage and Daily News tests.
- Build PASS with the existing large-chunk warning; measured sizes in `BUILD_EVIDENCE.json`.
- 117 prerendered routes PASS; initial static/client markup matches all 117 routes.
- 585 route/language DOM hydration combinations PASS, including selection, persistence, fallback, blocked storage and mocked B2B validation/success/error. Five-language SSR and fallback PASS. Real emails: zero.
- 25 deterministic projection/regression checks PASS with zero failures. All protected tracked files match the starting commit; homepage implementation is byte-equivalent. Trade Pulse remains June 2026, 40 CN, 251,015.10 t and EUR 400,438,328. Production data and definitions are unchanged.

Initial regressions identified outdated tests asserting the previous technical `/market` presentation, plus a new test incorrectly looking for the homepage hero KPI inside `<main>`. Only those test expectations were corrected: category-first markup and search are now checked, and legacy crop-detail evidence assertions remain. Initial and final logs are retained. An existing test rewrote its historical performance report; that unrelated generated change was restored before final validation.

Rendered browser QA is **BLOCKED_ENVIRONMENT**. The connected browser rejected `http://127.0.0.1:4173/market/` with `net::ERR_BLOCKED_BY_CLIENT`; no local Chromium executable is available. Vite preview also reported `uv_interface_addresses` unavailable; a Python static preview started successfully but cloud access remained blocked. No browser installation or access-control workaround was attempted. Widths 360, 390, 430, 768, 1024 and 1440 were not actually rendered. DOM, HTML parser, responsive CSS guards, asset existence and route/hydration checks are structural evidence only and do not constitute a visual PASS.

## Recovery and publication

The checkpoint contains complete project source/public assets, exact input data, generated routes/projection, built output, tests, scripts, initial/final QA logs, provenance, binary Git diff, baseline metadata, per-file SHA256 manifest and local verification receipt. Dependencies, Git worktree pointers, caches and secrets are excluded. Reinstall locked dependencies after restoring and use `scripts/generate_market_catalogue.py`, `npm run build`, and `scripts/validate_market_catalogue.py`.

The archive SHA256 sidecar is external because embedding an archive's own hash inside itself is circular. Connector upload/readback results are captured in the external verification receipt. Full ZIP readback must not be declared PASS above the connector's 5 MiB extraction limit; metadata, provider content hash and small sidecars can be verified independently.

No publication: rendered QA is blocked and publication authorization is conditional. Next work is owner review of the recovered candidate, rendered desktop/mobile QA in a supported environment, then explicit publication authorization. No new research is required for this UI task.

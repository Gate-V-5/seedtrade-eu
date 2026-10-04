# European Seed Market Catalogue UI V3

Starting GitHub main: `6f638719d5991b1ba3306ac8692b51638218acc1`. V2 was preserved intact in its original worktree and verified checkpoint (`3d1687e2d8996432968a2133b1e225b5d5c8c4cd1a4b1327d9d281b8d2c9aa6e`). V3 uses a separate worktree at the same canonical HEAD with the exact completed V2 source state as its starting implementation. No research, master regeneration, observation changes, commit, push or deployment.

## Market navigation

`/market` now opens with one compact EU summary, followed immediately by exactly six category cards. Desktop CSS uses three equal columns, with the owner-requested order:

| Row | Category | Cards |
|---|---|---:|
| 1 | Cereals & Pulses | 16 |
| 1 | Fodder Plants & Amenity Grasses | 29 |
| 1 | Catch / Cover Crops | 43 |
| 2 | Oil & Fibre Seeds | 12 |
| 2 | Maize & Sorghum | 3 |
| 2 | Vegetables | 4 |

The EU summary reads the current canonical datasets: 121 biological seed species, 136 canonical market entities, 251,015.10 t internal EU trade, EUR 400,438,328 and 40 sowing CN codes for June 2026. These are global dataset counts, not a sum of category memberships. No additional Trade Pulse section or duplicated aggregate is shown below the KPIs.

All 65 Priority entities remain intact. To fulfill the required vegetable coverage, three existing-master commercial uses are additionally represented: carrot (*Daucus carota*), sugar beet (*Beta vulgaris*) and seed potatoes (*Solanum tuberosum*). These reuse existing biological IDs and do not change the master, global biological KPI or observation datasets. Their unsupported trade and production amounts remain null. Carrot's broad vegetable-seed CN 12099180 remains group-level and is not allocated to carrot. Sugar-beet CN 12091000 is documented as a commercial customs scope, with no invented quantity. Seed-potato customs attribution remains unconfirmed.

There are 68 catalogue cards/detail routes, 65 of which are the preserved Priority set. Thirty-nine commercial entities have more than one use category. Category membership is navigation only. Six complete category trade totals remain withheld. Eleven cards retain safe trade amounts; 34 cards disclose group customs scope and 57 have developing trade evidence.

Canonical category routes are `/market/cereals-pulses`, `/market/fodder-amenity`, `/market/catch-crops`, `/market/oil-fibre`, `/market/maize-sorghum`, and `/market/vegetables`. The former Cereals, Pulses and fodder-grasses URLs remain functional aliases. Stable V2 `/market/seeds/<slug>` detail routes are preserved and extended for the three existing vegetable entries. Existing legacy crop-detail routes remain available.

## Owner visuals

All six supplied PNG files were available, inspected and assigned by their actual contents. They were copied byte-for-byte into `public/catalogue-v3/`. There was no image generation, web search, resizing, format conversion or editing. `OWNER_VISUAL_PROVENANCE.json` records the original filenames, assigned category, bytes and SHA256. The original homepage and V2 assets remain preserved.

The owner originals total about 32 MB. This preserves the explicit no-alteration requirement; new category cards use lazy image loading. No image optimization or replacement was undertaken.

## Data safety

All protected baseline files remain byte-equivalent, including trade, production, news and the commercial/biological master. The approved homepage implementation, images, KPI and compact Market Pulse are unchanged. GlobalWits records are not exposed; Datamyne remains access-pending. No emails were sent.

V2's fail-closed treatment is preserved: common wheat (*Triticum aestivum*) amounts are withheld because the older input linked CN 10019110 to common wheat while current nomenclature assigns it to spelt (*Triticum aestivum* subsp. *spelta*). Original evidence is unchanged. Representative prices with source-scope compatibility flags, owner supply claims, broad-CN species allocation and unsafe category aggregates remain withheld.

No historical chart is manufactured from incompatible legacy corridor/country-total series, missing periods or a single latest-month observation. Existing valid YoY indicators remain available where the approved card input supports them. Unsupported history, supply and production amounts remain absent rather than zero.

## QA and limitations

268 Python tests and 43 Node tests PASS. Build PASS with the existing bundle warning. There are 122 prerendered routes, including preserved legacy routes and category aliases; initial static/client markup matches all routes. EN/DE/FR/ES/IT SSR and DOM hydration PASS across 610 combinations, including fallback, language persistence and mocked B2B validation/success/error. Targeted catalogue tests verify six tiles, exact order, retained Priority identities, memberships, null behavior, botanical names, safe customs attribution and detail routes. Deterministic validation has 28 checks and zero failures.

The desktop 3+3 grid and mobile CSS guards are structurally verified, not visually certified. Actual rendered QA is **BLOCKED_ENVIRONMENT**: the connected browser rejected the V3 preview `http://127.0.0.1:4174/market/` with `net::ERR_BLOCKED_BY_CLIENT`. No local Chromium executable is available. No installation or access-control workaround was attempted. No desktop/mobile visual PASS is claimed.

The recovery package preserves full current project source/public assets, exact V2 inputs and historical QA, V3 owner-image provenance, generated data/routes, build output, tests, scripts, QA logs, Git diff, baseline metadata, per-file SHA256 manifest and local receipt. Locked dependencies, caches, Git worktree pointers and credentials are excluded. The external archive SHA256 and Dropbox verification receipt provide independent checkpoint evidence. Full ZIP readback above 5 MiB is explicitly limited and must not be reported as PASS.

No publication. The next gate is owner review and actual rendered desktop/mobile QA in a supported preview environment, followed by explicit publication authorization.

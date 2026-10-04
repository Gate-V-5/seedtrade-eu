# Price evidence resolution and global trade KPI audit V1

Starting and final GitHub main: `8f83dd7e1f6d0f97e7f7f3fa1c70c83a4a9ec101`. Exact recovered V4 checkpoint SHA256: `19eb0fccb220587387de9e78e3a17e9b69e501cf2de87272f5f04bf2ba7a8e60`; all 1735 manifest entries matched. No commit, push, deployment or new research.

## Individual price decisions

| Commercial entity | Botanical taxon | CN8 | Decision | Latest independently valid date | Retained points |
|---|---|---|---|---|---|
| Italian ryegrass | Lolium multiflorum | 12092510 | PUBLISHABLE | 2026-06 | 21 |
| Perennial ryegrass | Lolium perenne | 12092590 | PUBLISHABLE | 2025-02 | 1 |
| Westerwold ryegrass | Lolium multiflorum var. westerwoldicum | 12092510 | NOT PUBLISHABLE | — | 0 |
| Meadow fescue | Festuca pratensis | 12092311 | PUBLISHABLE | 2026-06 | 29 |
| Pea | Pisum sativum | 07131010 | PUBLISHABLE | 2026-06 | 3 |
| Red clover | Trifolium pratense | 12092210 | PUBLISHABLE | 2026-06 | 26 |
| Alfalfa / lucerne | Medicago sativa | 12092100 | PUBLISHABLE | 2024-12 | 2 |
| Flax / linseed | Linum usitatissimum | 12040010 | PUBLISHABLE | 2026-06 | 28 |

Seven of eight candidates are publishable: 110 original representative customs export unit-value points were independently reconciled to exact held official quantities and values. These are not transaction quotes or official EU average prices. Their scope is EU27 exporter dispatch/export reports to EU and third-country destinations; no mirrored imports. This scope differs from the intra-EU quantity metric and is explicitly disclosed. Dates are independent. Alfalfa (Medicago sativa) uses December 2024 and perennial ryegrass (Lolium perenne) February 2025 because more recent old values do not reconcile to the held source vintage. All rejected source-vintage points remain in the audit; no silent repair, interpolation or missing-zero substitution.

Italian ryegrass (Lolium multiflorum) uses the biological-species CN scope, including Westerwolds. No form-specific inference is made. The Westerwold commercial form (Lolium multiflorum var. westerwoldicum) receives no price. Italian ryegrass remains without an allocated intra-EU volume. No broad multi-species CN-group price is assigned to individual species.

Cards: 7 with price, 11 with trade volume, 6 with both. Snapshot candidates are derived from the resolved catalogue and increase from 11 to 12. Remaining cards retain absent evidence rather than invented values.

## Global KPI trace and reconciliation

`EuMarketSummary` → `market_catalogue_public.eu_summary.trade_volume_t` → `trade_pulse_public.views.eu_internal_trade.latest.volume_tonnes` → multisource recalculation over the preserved official normalized COMEXT source.

Actual period: single latest completed month, **1–30 June 2026**. Forty sowing-specific CN scopes; 3246 unique reporter/partner/export-flow/CN8/month observations. Reporter and partner are EU27 country codes, self-flows excluded. Formula: sum of exporter-reported net_weight_kg / 1000. No mirror imports, species allocations, category joins or card totals enter the sum.

Exact source sum: **251015101 kg = 251015.101 t**. Canonical headline rounds to two decimals: **251015.10 t**. The **0.001 t (1 kg)** difference is within the explicit **0.005 t** tolerance. Exact statistical value sum: **EUR 400438328**. Canonical observations and KPI numerical values are unchanged.

Local presentation label: **Monthly trade volume**. Compact English display: **251.0k t**. Tooltip and accessible label expose **251,015.1 tonnes**, the preserved canonical value. Scope text is dynamically derived: **EU internal seed trade · 40 sowing CN codes · June 2026**. Broad customs groups remain explicit customs scopes, not measured trade for all 121 biological species. Category membership never implies trade attribution.

## Preservation and QA

Six categories, 3×2 layout, category counts 16/29/43/12/3/4, 68 cards, 121 species, 136 market entities, owner visuals, ranking order and all 10 external-trade entities are preserved. Existing trade/production observations, Trade Pulse calculations, homepage KPI, Daily News and all unrelated canonical datasets remain byte identical. Leading exporters and corridors are checked against official rows and remain sorted by actual volume descending with deterministic ties.

- Python: 269 passed.
- Node: 67 passed, including 9 new price/KPI tests; network/B2B use mocks, real emails 0.
- Targeted QA: 450 checks, zero failures; raw official source SHA256 and price/KPI witnesses checked.
- Build: passed with existing bundle warning; 117 public plus 4 noindex routes prerendered, 122 static-first pages.
- Initial render/hydration parity: all 122 routes matched.
- Multilingual: 610 route/language SSR combinations passed, EN/DE/FR/ES/IT and fallback.
- Resolver idempotence: passed; only exact original witnessed prices restored.
- Browser visual QA remains blocked by cloud browser localhost ERR_BLOCKED_BY_CLIENT. No rendered visual PASS is claimed. Live published /market was inspected read-only for baseline KPI trace; new local changes are not live.

Initial JS: 883520 bytes, gzip 232124 bytes; largest chunk 2426156 bytes. Production data remains route-lazy. No performance redesign was attempted.

## Reproduction and checkpoint

See REPRODUCIBILITY.json, PROVENANCE_MANIFEST.json, V4_CHANGE_MANIFEST.json, PRICE_CANDIDATE_AUDIT.json/CSV, PRICE_OBSERVATION_WITNESSES.json, GLOBAL_KPI_AUDIT.json, DOUBLE_COUNTING_AUDIT.json and QA_RESULT.json. Official documents remain under docs/market-commercial-v4/evidence.

New checkpoint: SeedTrade-price-evidence-resolution-global-trade-kpi-audit-v1-20261004.zip. ZIP hash, size, manifest and remote verification are recorded in external sidecars/verification receipt to avoid a self-referencing archive hash. Original V4 checkpoint remains untouched. Dropbox upload/readback results must be taken from that receipt, not inferred from this report.

Owner review is required before any publication. GlobalWits and Datamyne were not accessed.

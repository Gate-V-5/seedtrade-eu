# SeedTrade control review — September 13, 2026

Review gate: September 13, 2026, 21:00 Europe/Vilnius (18:00 UTC).
Status: CLOSED. Development stopped before the gate; recurring automation paused at the gate. Explicit user approval is required for another cycle. Review finalized UTC: 2026-09-13T18:00:31.2783288Z.

## Work completed and conclusions

The requested priority order was followed: read-only baseline, national seed-production evidence, Supply Engine v0.1, Trade Intelligence mapping, then Price Engine v0.1 architecture. Classifier v0.7 and the verified LT 2023 S03 PRIMARY BOUNDARY 36px audit were preserved. No classifier tuning or audit rerun was performed. No new classifier version is justified by this work.

The initial baseline captured 288 existing files and SHA256 hashes before cycle edits. No workspace-root Git repository or Git executable was found in the checked locations; no Git history is claimed and no repository was initialized. The final comparison at 17:54:04 UTC confirms all 288 original files unchanged, zero modified and zero deleted. This is a sequential file audit, not an atomic filesystem snapshot.

## Data obtained

| Country and source | Period and acquired data | Meaning and limitations |
|---|---|---|
| Germany, Bundessortenamt | 10 certification quantity totals; 2024 / marketing 2024–25 | Reported seed classes in dt, not available inventory or independently established domestic harvest. All ten totals visually verified. |
| Poland, PIORiN | 9 categories; 2024; assessed, qualified and disqualified areas | 27 related measurements in hectares, not 27 independent production observations. Includes separate Westerwolds ryegrass supplement. |
| Italy, CREA | 10 scoped entries for 2024: 6 numeric and 4 blank | Controlled hectares. Italian ryegrass includes second-cut production; flax and one vetch category are combined. Blank cells remain missing. |
| France, SEMAE | 6 provisional presented-area observations for 2025, as of August 26, 2025 | Red clover, common vetch, three forage ryegrass categories and perennial turf ryegrass. White clover and flax absent; no French 2024 data acquired. |

Total: 35 source-category entries, 31 numeric and four missing. These counts are coverage evidence, not comparable quantities to add together. Original national PDFs/workbook, source references, extraction records and visual checks were saved. The source register documents authority, definitions, periods and limitations.

France's visually verified 2025 values in hectares are red clover 3286, common vetch 2127, forage perennial ryegrass 538, Italian ryegrass 2558, hybrid ryegrass 1102 and turf perennial ryegrass 830. The chart's 1189 label belongs to dactyle, not hybrid ryegrass. No historical chart points were interpolated. Italian 2024 data were selected using the actual AG1 header, not the workbook filename; provisional 2026 applications were excluded.

## Supply Engine v0.1

Implemented local normalization with exact decimal dt-to-tonne conversion, distinct area metrics, duplicate/value/unit validation, explicit missing values and country/crop coverage. Source hashes, locators, use category, provisional status and as-of dates are retained. Demonstrated metadata-loss and provisional/date-validation defects were corrected.

Preferred 2024 output: data/seed_production/supply_v01_2024_r02.json, containing 47 unique measurements: 43 numeric and four missing. It incorporates the Polish supplement and visual verification references. The historical 44-record output is preserved and must not be added to the revision. Its metadata predates the fixes; use the revised output for review.

The separate 2025 output contains six provisional French measurements. French 2025 records do not fill the 2024 coverage gap. Hectares never become mass. Available inventory and cross-country supply totals remain null. Coverage flags mean observations exist, not complete national coverage.

## Trade Intelligence and Price Engine

Six CN8 relationships were checked against the original official CN2026 annex (Regulation 2025/1926): red clover 12092210; white clover within mixed 12092280; Italian ryegrass 12092510; perennial ryegrass 12092590; vetch within mixed 12092945; sowing flax 12040010. The implementation rejects mixed-category attribution and unsupported years/targets. Hybrid ryegrass is unresolved. HS6 flax is broader than sowing seed. Original EU PDF and checksum were saved. Later-amendment completeness and historical editions are not verified; this is not a customs ruling.

Price Engine v0.1 is an architecture document only. It separates quotes, transactions, survey averages, trade unit values and forecasts; requires matched periods/units/currency and trade value/net mass; and prohibits invented prices from area or certification observations. No trade values, net masses, market prices, forecasts or live integrations were acquired or implemented.

## Tests and validation results

- Supply Engine: 14 test methods passed in the latest run at approximately 09:42 UTC. Regression defects were reproduced before correction, including 11 invalid provisional/as-of subcases.
- Trade mapping: seven test methods passed in its separate run at approximately 02:28 UTC; code unchanged afterward. Total: 21 passing methods across the two suites, not a claim of a fresh combined run.
- Revised-output integration checks passed: 47 unique measurements, four missing values, missing French 2024 coverage, area never treated as mass, German/Polish verification status, source hashes and Italian sheet metadata, and six unchanged input hashes.
- Arithmetic: 10/10 German class-total checks and 9/9 Polish assessed = qualified + disqualified checks passed.
- Visual checks: ten German totals and eight original Polish triplets matched with zero discrepancies; the supplementary Polish triplet and six French chart endpoints were separately visually checked. PDF renderer font warnings did not obscure the relevant values.
- Existing French output reproduced exactly in memory after validation fixes. No unchanged tests were rerun solely for this review.

## Risks and unresolved issues

National definitions, years, certification stages and category boundaries differ. Current evidence cannot support an EU supply total, inventory estimate, market share, price signal or model-accuracy claim. Botanical/category harmonization remains incomplete, especially combined vetch/flax and forage versus turf. France 2024, French white clover/flax, four Italian blanks, historical CN mappings and actual trade/price observations remain unresolved. Source metadata validation is not exhaustive.

Commercial reuse has not been qualified for every source. ESCAA noncommercial restrictions were documented and no ESCAA numeric dataset imported. The French full-report download failed; the browser saved one page image to C:/Users/WDAGUtilityAccount/Downloads/1.jpg outside the project as a download side effect. The useful direct national note was subsequently acquired locally. No email account was accessed or signed into. No Git push, deployment, publication, provider contact or production/external-system mutation was made.

## Recommended next cycle — requires approval

1. Close the French missing crop/year gaps using concrete official source leads and qualify source reuse.
2. Establish comparable period/metric and botanical mappings with explicit uncertainty; do not aggregate incompatible measures.
3. Verify historical CN editions/concordances and acquire matched official trade value/net-mass observations with provenance.
4. Extend Supply Engine only for demonstrated evidence requirements. Implement price calculations only when supporting data and definitions exist.
5. Keep v0.7 and the verified boundary audit frozen; no evidence from this cycle warrants a new classifier version.

## Exact files changed

All paths below are new relative to the initial 288-file baseline; none of those baseline files was modified or deleted. Files created and edited during this cycle are listed once as additions. The machine-readable inventory is FINAL_FILE_DIFF_2026-09-13.json. It includes itself and this report; new-file hashes are omitted to avoid self-reference while finalizing review documents.
- `C:/SeedTrade/collectors/supply/build_reviewed_2024.py`
- `C:/SeedTrade/collectors/supply/supply_v01.py`
- `C:/SeedTrade/collectors/supply/test_supply_v01.py`
- `C:/SeedTrade/collectors/trade/cn_mapping_v01.py`
- `C:/SeedTrade/collectors/trade/test_cn_mapping_v01.py`
- `C:/SeedTrade/data/seed_production/DE_BSA_2024_quantities_v01.json`
- `C:/SeedTrade/data/seed_production/DE_BSA_2024_source.pdf`
- `C:/SeedTrade/data/seed_production/DE_verify-32.png`
- `C:/SeedTrade/data/seed_production/DE_verify-33.png`
- `C:/SeedTrade/data/seed_production/DE_visual_verification_v01.json`
- `C:/SeedTrade/data/seed_production/FR_chart_check.png`
- `C:/SeedTrade/data/seed_production/FR_SEMAE_2025_note.pdf`
- `C:/SeedTrade/data/seed_production/FR_SEMAE_2025_provisional_areas_v01.json`
- `C:/SeedTrade/data/seed_production/IT_CREA_2024_areas_v01.json`
- `C:/SeedTrade/data/seed_production/IT_CREA_history_source.xlsx`
- `C:/SeedTrade/data/seed_production/PL_PIORIN_2024_areas_v01.json`
- `C:/SeedTrade/data/seed_production/PL_PIORIN_2024_source.pdf`
- `C:/SeedTrade/data/seed_production/PL_PIORIN_2024_westerwolds_supplement.json`
- `C:/SeedTrade/data/seed_production/PL_verify_1.png`
- `C:/SeedTrade/data/seed_production/PL_verify_11.png`
- `C:/SeedTrade/data/seed_production/PL_verify_12.png`
- `C:/SeedTrade/data/seed_production/PL_verify_2.png`
- `C:/SeedTrade/data/seed_production/PL_verify_3.png`
- `C:/SeedTrade/data/seed_production/PL_verify_4.png`
- `C:/SeedTrade/data/seed_production/PL_verify_7.png`
- `C:/SeedTrade/data/seed_production/PL_visual_verification_v01.json`
- `C:/SeedTrade/data/seed_production/supply_v01_2024_r02.json`
- `C:/SeedTrade/data/seed_production/supply_v01_2024.json`
- `C:/SeedTrade/data/seed_production/supply_v01_2025.json`
- `C:/SeedTrade/data/trade/CN_2026_official.pdf`
- `C:/SeedTrade/data/trade/CN_2026_source_hash.json`
- `C:/SeedTrade/docs/control/BASELINE_2026-09-12_cycle.json`
- `C:/SeedTrade/docs/control/CONTROL_REVIEW_2026-09-13.md`
- `C:/SeedTrade/docs/control/CYCLE_2026-09-13.md`
- `C:/SeedTrade/docs/control/FINAL_FILE_DIFF_2026-09-13.json`
- `C:/SeedTrade/docs/control/INTERIM_FILE_DIFF_2026-09-13.json`
- `C:/SeedTrade/docs/control/PRICE_ENGINE_V01_ARCHITECTURE.md`
- `C:/SeedTrade/docs/control/SEED_SOURCE_REGISTER.md`
- `C:/SeedTrade/docs/control/SUPPLY_ENGINE_V01.md`
- `C:/SeedTrade/docs/control/TRADE_MAPPING_CN2026.md`



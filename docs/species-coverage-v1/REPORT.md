# SeedTrade 121-species data coverage V1

Starting GitHub main: ee84c92729f99a9d38ea1daa232a322e59cbfcb4. Fresh clone; canonical Crop Master and immutable V5 baseline verified.

## Results

All 121 biological seed species are audited once. The 136 market entities, 10 categories and 52 catch-crop identities are preserved. 46 new official observations cover eight previously unsupported species. Production coverage rises 74→82; gaps fall 47→39. Trade coverage stays at nine species; no broader CN trade category has been allocated to individual species.

Original V5: 1,669 records, byte-preserved. Additive live model: 1,715 records. Added sources: SOCFrance/SEMAE national presented vegetable-seed areas; LELF Brandenburg registered seed-multiplication area; WIORiN Mazowieckie inspected versus field-approved seed areas. German/Polish regional values are clearly identified and never treated as national totals. Seed production, certified area and certified quantity remain separate.

## Evidence limits and anomalies

France PDF p.75: Coriandre (Coriandrum sativum), Chicorées (Cichorium intybus) and Oignon (Allium cepa) have conflicts against maps pp.78–79 or the earlier official table. Fifteen original values retained in WITHHELD_SOURCE_ROWS, never corrected or activated. Protected-cultivation rows for Leek (Allium porrum), Melon (Cucumis melo), Tomato (Solanum lycopersicum), Lettuce (Lactuca sativa): twenty SEMAE sector values retained but not activated because explicit SOCFrance lineage/stage requires confirmation. Mixed crop types, vegetative plant production and generic totals are not converted into species seed data.

LELF repeats tables in HTML; repeated rows deduplicated at extraction. A one-hectare aggregate discrepancy in its rounded grass totals and inconsistent narrative totals are retained as source limitations; no regional or national totals are calculated. WIORiN overall totals contain inconsistencies; the four selected species rows were individually checked for inspected = qualified + disqualified.

2026 CN evidence: recovered mappings audited for resolution/sowing scope, not upgraded. Current EUR-Lex PDF extraction exceeded web-tool content limit; terminal download returned an empty payload. This is recorded as failed evidence, not confirmation. BSA official species vocabulary was located. Poland Mazowieckie report explicitly states standard vegetable seed fields are not submitted for official field assessment; this limits the utility of certification-only vegetable searches. ESCAA restrictions were not bypassed. No CY/LU/MT research, Globalwits, private data or real emails.

## Completeness and research scope

The matrix is a complete inventory audit of all 121 species, not a claim that all EU national sources have been exhaustively searched per species. Existing public national datasets were checked across all species; new targeted extraction prioritized gaps in CORE France, Germany and Poland. Remaining DATA_GAP means no usable numeric evidence in this bounded review. Source-confirmed but withheld evidence stays explicitly separate. Every matrix row includes production metrics, CN scope, trade resolution, years, compatible series, provenance and limitations.

## B2B use

Strong combined coverage remains the nine directly resolved trade species below. History is descriptive within one source grain. HISTORICAL_DIRECTION contains compatible consecutive histories of at least three years; endpoint direction is not a supply forecast or bullish/bearish signal. France presented area, regional registration and certified field area cannot be pooled.

- Meadow fescue (Festuca pratensis): 5 years maximum source-compatible history; AT, CZ, LV.
- Red fescue (Festuca rubra): 5 years maximum source-compatible history; CZ, ES, LV, SK.
- Flax (Linum usitatissimum): 4 years maximum source-compatible history; AT, BE, BG, CZ, ES, FR, LT, LV, NL, PT, SK.
- Italian ryegrass (Lolium multiflorum): 5 years maximum source-compatible history; AT, CZ, ES, LV, PT, SI, SK.
- Perennial ryegrass (Lolium perenne): 5 years maximum source-compatible history; AT, CZ, ES, LV, SK.
- Alfalfa / lucerne (Medicago sativa): 5 years maximum source-compatible history; AT, CZ, ES, LT, LV, SK.
- Field peas (Pisum sativum): 4 years maximum source-compatible history; AT, CZ, ES, LV, PT, SK.
- Kentucky bluegrass (Poa pratensis): 3 years maximum source-compatible history; CZ, LV.
- Red clover (Trifolium pratense): 5 years maximum source-compatible history; AT, CZ, ES, LT, LV, SI, SK.

## Next research priorities

1. Resolve explicit SOCFrance lineage for the 20 protected-cultivation values already collected, and obtain corrected France rows for the 15 conflicting values.
2. Obtain national species-specific tables for the newly evidenced German/Polish crops without summing regions into a fabricated national total.
3. Check the 39 remaining gaps using official vegetable seed sector and certification sources, especially data beyond mandatory field certification.
4. Resolve CN REVIEW_REQUIRED/PARTIAL relationships from the official nomenclature; preserve group limitations. A new species-specific trade count requires usable numeric evidence and safe historical concordance.

## UI and QA

Only the homepage Market Pulse highlighted date block is removed. Data-driven trade tonnage, internal-page date context, images, CSS, Weather and Daily News remain unchanged. A methodology download provides the new coverage audit. Production additions stay within the lazy route import. QA results, raw documents, extracted page text, scripts and checksums accompany the recovery checkpoint. Rendered checks report only observed viewport results; no fabricated mobile PASS.

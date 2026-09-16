# Crop Trade Basket v0.1 — proposed architecture

2026-09-14. Local mapping-semantics prototype implemented; provider integration and numerical signals not implemented. Evidence source: existing verified original CN2026 annex and docs/control/TRADE_MAPPING_CN2026.md; https://eur-lex.europa.eu/eli/reg_impl/2025/1926/oj/eng. Prior files and seven legacy tests remain unchanged. No Globalwits crop query completed; provider code definitions have not yet been independently checked.

## Relationship model

Crop -> versioned relationship[] -> classification system/edition/jurisdiction/code -> DIRECT | PROXY | CONTEXT -> evidence confidence -> evidence reference and limitations.

Fields: relationship_id, crop_id, use_category, classification_system, edition, jurisdiction, code (string), valid_period, role, evidence_level, evidence_refs, scope_description, exclusions, species_share (nullable), unresolved_questions, supersedes. Confidence is qualitative evidence status (DOCUMENT_VERIFIED_SCOPED, PROVIDER_CONFIRMED, UNVERIFIED), not invented numerical probability. Store botanical scope separately from provider availability, period completeness and licence readiness.

DIRECT: crop sufficiently isolated for scoped quantity/value use, subject to coverage and definition checks. PROXY: includes target with other species/products; retain full code series under its own code label for trend/direction, never report its full quantity as crop quantity. CONTEXT: broader market support only. Missing species_share remains null; DIRECT does not itself prove complete crop coverage.

## Initial candidate relationships

| Crop | CN2026 | Role | Evidence level | Limitation |
|---|---|---|---|---|
| Red clover | 12092210 | DIRECT | DOCUMENT_VERIFIED_SCOPED | Original annex only |
| White clover | 12092280 | PROXY | DOCUMENT_VERIFIED_SCOPED | Other clovers; share unknown |
| Italian/Westerwolds ryegrass | 12092510 | DIRECT | DOCUMENT_VERIFIED_SCOPED | Retain combined botanical scope |
| Perennial ryegrass | 12092590 | DIRECT | DOCUMENT_VERIFIED_SCOPED | Original annex only |
| Vetch | 12092945 | PROXY | DOCUMENT_VERIFIED_SCOPED | Mixed with grasses; share unknown |
| Flax for sowing | 12040010 | DIRECT | DOCUMENT_VERIFIED_SCOPED | Sowing condition; not all linseed |

Candidate CONTEXT parents from existing recorded hierarchy: HS6 120922 for red/white clover, 120925 for Italian/perennial ryegrass, 120929 for vetch, 120400 for sowing flax. Parent prefixes are known from prior work, but applicability to a particular independently reported HS edition/year must be verified before using data. No hybrid ryegrass assignment guessed. Additional codes require evidence; basket is extensible, not declared exhaustive.

## Compatibility with prior safety checks

Legacy assess() answers eligibility for target-specific quantitative statistics and correctly rejects mixed species. Preserve it and all tests. A separate basket assessment should expose eligible_for_code_trend and eligible_for_crop_quantity separately. PROXY can be retained for trend while eligible_for_crop_quantity remains false. Never weaken the old tests to make proxy quantities count as crop quantities.

## Overlap and versioning

Parent and child code observations are alternatives/contexts, not additive. Shared codes can inform multiple crop baskets without duplicating their volume in a combined total. Before any aggregate, verify disjoint code scope, same reporter/flow/period/partner coverage, currency/units and classification edition. Store provider-native code/description as received and link to a separately versioned mapping. Historical code continuity requires concordances, not 2026 extrapolation.

## Required tests before executable implementation

One crop accepts multiple relationships; PROXY retained for code trend but crop mass null; CONTEXT cannot produce crop mass; unknown shares remain null; wrong/unverified editions blocked; parent-child overlap not summed; duplicated relationships rejected; confidence cannot imply numeric weights; raw observations immutable; legacy seven tests still pass. No tests executed for this design-only document.

## Implementation and executed tests — September 14

collectors/trade/crop_basket_v01.py adds immutable relationships and separate mapping eligibility for code trend, crop quantity and context. Six initial baskets each retain a CN8 relationship plus its six-digit CN parent. These parents are scoped to the original CN2026 hierarchy, not represented as independently verified historical HS mappings. PROXY supports code trend but cannot authorize crop quantity. Parent-child overlaps are reported; no aggregate quantity, species share, numerical weight or signal is generated. Licence permission is explicitly NOT_ASSESSED.

This is a trusted curated-mapping contract, not an independent verifier of every supplied evidence assertion. Evidence URLs and role labels supplied by a caller require separate review. It supports only original CN2026/EU/year2026. Full proposed provenance/versioning fields and raw-observation processing are not implemented.

Executed command: bundled Python -B -m unittest discover -s collectors/trade -p 'test_*.py' -v. Result: 18 tests in 0.007s, OK, exit 0. Eleven new tests plus all seven unchanged legacy tests. No failure observed in this initial run. No live/provider records used.

New methods (all PASS): test_multiple_codes_retained; test_proxy_trend_without_crop_quantity; test_context_not_crop_quantity_or_direct_trend; test_wrong_year_edition_jurisdiction_fail_closed; test_unknown_evidence_does_not_authorize; test_parent_child_overlap_not_aggregated; test_duplicate_and_cross_crop_rejected; test_no_invented_share_weight_signal_or_permission; test_invalid_relationships_rejected; test_inputs_immutable; test_unmapped_crop_not_guessed.

Legacy methods (all PASS): test_exact_code_required; test_historical_year_not_assumed; test_hybrid_and_unknown_not_guessed; test_mixed_species; test_non_sowing_flax_rejected; test_specific_codes; test_wrong_species_rejected. Supply/classifier tests were not rerun; their files are unchanged.

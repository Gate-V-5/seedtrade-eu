# Trade Signal v0.1 and Supply integration — proposed design

2026-09-14. No signal calculated or production engine implemented. Globalwits licence, crop samples and core definitions are unresolved. All signal weights UNKNOWN. This is a design to guide validation, not evidence of predictive skill.

## Separate layers

Raw observation: provider/dataset, reporter, flow, partner and partner semantics, period start/end/granularity, code/system/edition, value/currency/scale, weight/weight definition, supplementary quantity/unit, suppression/missingness, source date, retrieval date, revision, licence status. Preserve original field names and source values.

Derived indicator: raw observation IDs, mapping version/role, calculation version, exact period window, unit/basis, value or explicit reason missing, completeness flags, publication lag, confidence evidence. Never replace observations with derived numbers.

Basket -> comparable code flows -> MoM/YoY/rolling 12 months -> trade balance, partner concentration, unit-value movement -> separate DIRECT/PROXY/CONTEXT evidence -> Trade Signal (not yet specified).

MoM/YoY percentage: (current / comparable prior - 1) * 100 only for nonzero positive prior and valid comparable observations. Prior zero yields undefined percentage plus optional absolute change, not infinity. Rolling 12M requires 12 complete consecutive months; missing/suppressed is not zero. Seasonal interpretation remains distinct from raw MoM.

Balance convention: exports minus imports, labelled by quantity or value basis. CIF import versus FOB export valuation can impede comparison. Partner concentration requires complete nonduplicated partner coverage and known partner meaning; partial top-N lists cannot establish whole-market concentration. Unit value requires matched positive net mass and value basis; current Globalwits label WEIGHT(KG) is not yet verified as net. No unit-value calculation until definitions qualified. Exchange-rate movements and product mix can shift USD unit values without a pure price change.

No arbitrary role weights, confidence probabilities, thresholds, directional buy/sell alerts or composite score. Keep separate code indicators until weighting is justified by a specified validation protocol, sufficient history, out-of-sample evaluation and intended use. Unknown species shares preclude attributing PROXY volume to crop even if its trend is useful.

## Integration with Supply Engine

Seed production/certification evidence + Weather/Phenology + Trade + RFQ demand + observed prices may later inform price pressure and indicative price range. They do not currently establish a numerical model.

Supply Engine v0.1 currently retains incompatible quantity/area metrics and missing inventory. Keep it unchanged. Join context by explicit species/use, geography, period and evidence IDs; do not add certified quantities, hectares and net trade as available stock. Weather/phenology v0.7 remains frozen. RFQs in current UI are demo data and cannot count as real demand. Observed prices need qualified source/grade/currency/delivery basis. Report each missing prerequisite; no fabricated range.

Future tests: denominator zero/missing; absent rolling month; revision consistency; partner overlap; CIF/FOB warning; net/gross mismatch; parent-child duplication; proxy crop-mass prohibition; classifier isolation; demo RFQ exclusion; no output when licence/evidence gate is unresolved. No executable tests run for this document.

# Trade refresh, revisions and signals v0.1

Status: DESIGN, September 15 cycle. No scheduler, external integration or production price calculation is implemented by this document. Provider permissions remain an independent prerequisite. UNKNOWN is an analytical result, not zero.

## Seven-day source refresh

Measure seven days from the last successful metadata check for each source. A failed check must not advance that timestamp. The hourly development heartbeat is unrelated to source refresh frequency. Check provider catalogue/publication metadata first, within documented limits; request only approved reporter/partner/product/period slices. No daily-customs assumption.

Keep immutable raw response bytes and a manifest containing request without secrets, retrieval timestamp, response hash, source publication date if available, dataset edition, adapter version and applicable permission evidence. Missing publication metadata remains UNKNOWN. A retrieval timestamp alone is not a provider revision date.

Compare the catalogue against the previous successful manifest. Distinguish NEW_PERIOD, REVISION_CANDIDATE, UNCHANGED and CHECK_FAILED. Where the source supplies no revision feed, a bounded recent-period recheck may be configured explicitly; it cannot establish that older periods are unchanged. Document that detection window. Do not claim reliable delta coverage from publication timestamps alone.

After a permitted delta retrieval, parse to a staging set. Validate dimensions, code editions, units, duplicate keys, confidential/missing statuses and expected coverage before acceptance. Preserve the previous accepted snapshot on parsing or validation failure. An empty response is not evidence that previous records were deleted or trade was zero. Require documented source semantics before applying a tombstone.

Raw response hash identifies a capture, not a semantic revision: JSON ordering or header changes may alter bytes without changing trade. Compare normalized payloads by a stable identity excluding retrieval date and vintage, but including source/dataset, reporter, partner, flow, period, product system/edition/code and all secondary scopes. Separately preserve the immutable observation key including vintage. A changed value, status, definition or scope is recorded explicitly; scope changes are not treated as simple numerical revisions.

An accepted change creates a new version linked to its predecessor, never overwrites it. The audit event retains before/after references, changed fields, reason, source and code versions, review status and affected derived outputs. Repeating the same accepted input is idempotent. Interrupted ingestion must not expose a partial snapshot; stage first and commit the local manifest only after all checks pass. No executable transaction mechanism has yet been implemented.

## Recalculation dependencies

Index derived outputs by their exact input observation versions and mapping version. A revised month invalidates its MoM comparison and the next month, its YoY comparison and the corresponding month next year, and every rolling window containing it. Recompute relevant partner totals/concentrations and flow balances for that period. Re-run cross-source comparisons against explicit counterpart vintages. Retain old results with superseded status for reproducibility.

Revision status distinguishes source-reported revision, locally detected changed payload, first capture and UNKNOWN. A source may revise without notice; unchanged catalogue metadata does not prove unchanged values.

## Defensible indicators

These are proposed calculations, not measurements already obtained. Require equivalent reporter/partner scope, flow, product coverage/edition, units and methodology across inputs. Never pool multiple providers as additional trade. Select a documented reference series and attach other-source agreement separately.

| Indicator | Rule and refusal condition |
|---|---|
| MoM / YoY | 100 × (current/prior − 1), with exact prior month or same month one year earlier. Missing or zero prior denominator returns UNKNOWN; retain absolute change separately. |
| Rolling 12-month change | Compare two complete, non-overlapping 12-month totals. Missing months prevent a total unless explicitly reported as a partial sum, never a complete indicator. |
| Import / export trend | Expose the selected period-change measure and coverage; no unsupported trend label from one point. |
| Trade balance | Exports minus imports in the same measure and coverage. State that FOB exports minus CIF imports is a conventional statistical value balance with valuation differences, not a like-for-like price measure. |
| Partner concentration | Shares and sum of squared shares only for a complete, disjoint partner partition and positive total. Exclude world/regional aggregates when their children are included. Confidential residuals must remain explicit; incomplete coverage yields UNKNOWN for full-market concentration. |
| Unit value | Value divided by compatible positive net mass; retain currency per kg, valuation and product basket. Zero/missing mass yields UNKNOWN. This is a trade unit value, not an observed seed offer price. |
| Completeness | Report returned, missing, suppressed and expected cells separately. Establish expected cells from query scope and source semantics; absence is not zero. |
| Cross-source agreement | Retain each metric's comparison result and reasons, source vintages and common upstream lineage. Agreement does not prove independent measurement. |

Raw observations, calculated indicators and a final Trade Signal are separate versioned objects. A signal may expose evidence and UNKNOWN pressure without a numerical score. PROXY codes may support code-level trends but their entire volume cannot become target-species supply. CONTEXT parents and DIRECT children must not be added together. Do not assign invented confidence percentages or basket weights.

## Supply integration and qualitative quality

The first prototype should present side-by-side production/certification evidence, weather/phenology evidence, trade indicators, RFQ coverage and observed price evidence with their periods and limitations. Hectares, certified seed tonnes and trade tonnes are distinct quantities; imports can include re-exports, stocks and different seed uses. No subtraction from production or conversion to domestic availability without a documented material-balance scope and stock information.

Pressure remains UNKNOWN when direction is unsupported or evidence conflicts. No production Price Engine or indicative price range is justified by the current small sample. A future pressure conclusion must cite the exact evidence and explicit inference, with alternative explanations such as inventory movements or reporting revisions.

Represent quality as an evidence profile: institutional source type; direct/derived status; species specificity; known lag and its observation date; revision state; missing dimensions; cross-source comparison; upstream dependence; and historical consistency. Each item is VERIFIED, LIMITED or UNKNOWN with a reason and source reference, rather than a summed score. Official status alone does not resolve missing scope or validate species attribution.

## Implementation acceptance tests still required

Before enabling any refresh adapter: idempotent repeated captures; changed payload under unchanged publication date; byte-only changes; failed/empty fetch preserving the accepted snapshot; revised confidential status; explicit deletion semantics; scope changes; vintage retention; interrupted staging; and complete dependency invalidation. Before numerical indicators: missing months, zero denominators, overlapping partners/codes, mixed vintages, incompatible units/editions, and PROXY restrictions. No such implementation or test execution is claimed here.

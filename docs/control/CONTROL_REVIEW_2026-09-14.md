# SeedTrade final control review — September 14, 2026

Status: CLOSED; development stopped and recurring task PAUSED. Approval deadline was 21:00 Europe/Vilnius / 18:00 UTC. Closure began at 18:07 UTC because the scheduled check arrived seven minutes after the gate. No development occurred after the deadline; substantive implementation was completed in the morning, with documentation reconciled at 09:02 UTC. No further cycle may start without explicit user approval.

## Outcome by priority

| Priority | Outcome |
|---|---|
| P0 Globalwits integration audit | Partial. Authenticated read-only interface and dataset metadata inspected; subscription licence, supported integration, full coverage/history and several definitions remain unresolved. |
| P1 Crop Trade Basket | Local mapping-semantics prototype implemented and tested; six initial baskets with DIRECT/PROXY CN8 relationships and CONTEXT CN parents. |
| P2 small-scale Globalwits validation | Not performed. Applicable licence/interface permissions for extraction not established. No crop queries or exports submitted. |
| P3 Trade Signal | Architecture documented. No numerical signal, weights or forecast generated. |
| P4 Supply integration | Design implications documented. Existing Supply Engine, classifier and price architecture preserved; no production Price Engine implemented. |

The user manually authenticated. No credentials, cookies or authentication secrets were requested, copied or stored. Home UI contained account identifiers incidentally, but these were not copied into project artifacts. No email, messages, alerts, account-setting changes, provider contact, push, deployment or publication was performed. Query-screen entry automatically displayed unrelated preview rows; no preview trade values were saved as project observations. Read-only navigation may have normal provider usage logging; no claim that browsing leaves no server logs.

## Globalwits evidence

Sources inspected September 14: authenticated Home https://gs5.globalwits.cn/home; Trade Search https://gs5.globalwits.cn/tradesearch/index; Data Update https://gs5.globalwits.cn/smartservice/DataUpdate; linked privacy policy https://gs5.globalwits.cn/privacyPolicy, title 环球慧思隐私权政策, updated 2025-06-30. Detailed evidence and qualifiers: GLOBALWITS_AUDIT_2026-09-14.md.

OBSERVED DATA: Home exposes regional country/product tiles, EU imports and exports; monthly country filter includes Germany, France, Poland, Italy, Lithuania and other EU/non-EU countries. This does not establish all subscribed countries or complete historical coverage. Total 292 monthly catalogue rows is not a country count. Universal, monthly and annual catalogues are distinct. All-country coverage and queryable start dates remain incomplete.

| Global Stats(Monthly), both flows | Latest listed period | Displayed update date | Period-end to listed update | Period-end to audit date |
|---|---|---|---:|---:|
| Germany | June 2026 | September 9, 2026 | 71 days | 76 days |
| France | December 2025 | June 18, 2026 | 169 days | 257 days |
| Poland | June 2026 | August 31, 2026 | 62 days | 76 days |
| Italy | May 2026 | August 25, 2026 | 86 days | 106 days |

Periods/dates are OBSERVED DATA; day differences are DERIVED RESULT using month-end and calendar dates. Timestamp timezone unspecified. Listed updates may be revisions, so first-publication lag is UNKNOWN. Italy history shows February/March released together June 25, April August 5, May August 25. Earliest visible last-page entry is January 2023, not demonstrated earliest queryable data. No fixed or daily publication cadence established.

The alternative European Union(Stats) and European Union(Stats EXP) catalogues show May 2026 with remark Final and June 2026 with remark 01, both updated September 2 (imports 11:06:22; exports 11:06:21). Meaning of 01 UNKNOWN. This is distinct from individual country Global Stats(Monthly): country-series lag cannot be transferred to the EU-wide dataset. EU June metadata does not prove complete June data for each reporter/crop. June period-end to listed update is 64 days.

OBSERVED DATA: EU import interface exposes eight-digit commodity codes, import date/monthly range, code description, SITC, purchasing country, country of origin, transaction terms, TOTAL VALUE(USD) and WEIGHT(KG). Formal CN edition and maximum provider-wide granularity UNKNOWN. Weight is not explicitly labelled net; net/gross definition UNKNOWN. Supplementary quantity/unit, original currency, USD conversion basis, unit-value field and company-level fields remain unverified. Missing columns in an initial view do not prove field absence.

Export menu exposes Export, Export(show columns), Export Times. No option executed. Formats (CSV/XLSX), row/query limits, download restrictions, scheduled-export capability and official API/feed remain UNKNOWN. No private endpoint probing or bulk scraping was attempted. Public searches returned unrelated WITS/Global Trade Alert/Global Trade Tracker APIs, which were excluded as evidence.

FACT: linked privacy policy concerns personal information and refers to service terms; it is not proof of trade-data rights. All requested subscription permissions remain UNKNOWN: automated/scheduled retrieval, local data storage, database integration, transformation/aggregation, internal analytics, derived indicators, commercial SeedTrade use, publication of derived statistics/signals. Non-secret subscription terms were requested from the user; no answer was received during this cycle. No assumption of permission from silence or UI export availability.

## Crop baskets and prototype

| Crop | CN2026 relationship | Role | Additional context |
|---|---|---|---|
| Red clover | 12092210 | DIRECT | CN parent 120922 |
| White clover | 12092280 | PROXY | CN parent 120922 |
| Italian/Westerwolds ryegrass | 12092510 | DIRECT | CN parent 120925 |
| Perennial ryegrass | 12092590 | DIRECT | CN parent 120925 |
| Vetch | 12092945 | PROXY | CN parent 120929 |
| Flax for sowing | 12040010 | DIRECT | CN parent 120400 |

Evidence level DOCUMENT_VERIFIED_SCOPED refers to the previously verified original CN2026 annex, not new Globalwits verification. Six-digit parents are CONTEXT within that CN hierarchy, not independent historical HS concordances. Unknown hybrids are rejected. Provider crop-code coverage was not tested.

Local implementation separates mapping_allows_code_trend, mapping_allows_crop_quantity and mapping_allows_context. PROXY remains available for code trend without attributing full volume to the crop. Relationships are immutable, duplicates/mismatched crops rejected, parent-child overlaps reported. Species shares, numerical weights, aggregate quantity and signal remain null; retrieval permission NOT_ASSESSED. Legacy quantitative eligibility and seven tests remain unchanged.

Limitation: this is a trusted curated-mapping contract. It does not independently authenticate caller-supplied role/evidence assertions. Full proposed provenance/versioning, provider connectors and raw-observation calculations are not implemented. No live data or numerical sample trade findings exist.

## Exact test execution

One combined Trade-suite invocation during implementation:

Bundled Python -B -m unittest discover -s collectors/trade -p 'test_*.py' -v

Result: Ran 18 tests in 0.007s; OK; exit code 0. Eleven new plus seven legacy methods. No failures in that initial run. Tests were not rerun solely for closure. Supply/classifier/price tests were not run this cycle because those implementations were unchanged or design-only.

New tests, all PASS:
- test_multiple_codes_retained
- test_proxy_trend_without_crop_quantity
- test_context_not_crop_quantity_or_direct_trend
- test_wrong_year_edition_jurisdiction_fail_closed
- test_unknown_evidence_does_not_authorize
- test_parent_child_overlap_not_aggregated
- test_duplicate_and_cross_crop_rejected
- test_no_invented_share_weight_signal_or_permission
- test_invalid_relationships_rejected
- test_inputs_immutable
- test_unmapped_crop_not_guessed

Legacy tests, all PASS:
- test_exact_code_required
- test_historical_year_not_assumed
- test_hybrid_and_unknown_not_guessed
- test_mixed_species
- test_non_sowing_flax_rejected
- test_specific_codes
- test_wrong_species_rejected

No standalone raw test transcript file was saved; exact result is retained in task tool output and cycle documentation. Date-lag arithmetic was computed locally; one PowerShell parser error occurred before execution, corrected successfully. This was not an additional unit-test suite.

## Trade Signal and Supply implications

Architecture separates raw observations from derived MoM/YoY/rolling-12M, balance, partner concentration and unit-value movement. Missing months, zero denominators, revisions, partner overlap, CIF/FOB valuation and net/gross definitions must be handled before calculations. No arbitrary DIRECT/PROXY/CONTEXT weights, confidence probabilities or composite score were chosen.

Supply certification quantities and hectares cannot simply be added to net trade to estimate inventory. Weather/phenology remains frozen; demo RFQs cannot represent observed demand. Real prices require qualified grade, currency, delivery basis and source. Evidence is insufficient for numerical price pressure or indicative price ranges. No frontend integration or production model built.

## Errors, risks and unfinished work

Browser controls produced read-only-field, stale-element and non-settable-field errors; recovered through current accessibility state and dropdowns. Public web privacy retrieval failed, while linked browser page worked. Some large accessibility outputs were truncated; targeted state inspection was used. These do not establish missing platform functionality.

Primary unresolved issues: subscription rights; official API/export terms; all reporter histories and entitlements; source data definitions; currency conversion; supplementary/company fields; meaning of 01; country/crop completeness; later CN amendments and historical concordances. P0 is partial and P2 unperformed. Do not present metadata discovery or synthetic tests as empirical crop-trade validation or predictive accuracy.

## Recommended next cycle — approval required

Obtain applicable non-secret subscription/data licence and supported integration documentation. Complete permitted dataset definitions and coverage audit. If permitted, validate a tightly scoped reporter/period/code sample with explicit role labels and provenance. Only then implement raw/derived indicator processing with completeness and revision controls. Keep classifier v0.7 and the verified boundary audit frozen. Do not create a production Price Engine from current evidence.

## File integrity and exact inventory

See FINAL_FILE_DIFF_2026-09-14.json for the final SHA256 comparison against the 328-file baseline. All cycle files are additions relative to that baseline; edits to those additions are included once. No usable Git history was established, so no Git diff or clean-status claim is made. Final report and inventory are review artifacts produced after the gate, not further development. New-file self hashes are omitted; baseline comparison is sequential, not atomic.

Final comparison at 09/14/2026 18:08:23: 328 baseline files unchanged; zero modified; zero deleted; ten additions listed below.

- `C:/SeedTrade/collectors/trade/crop_basket_v01.py`
- `C:/SeedTrade/collectors/trade/test_crop_basket_v01.py`
- `C:/SeedTrade/docs/control/BASELINE_2026-09-14_cycle.json`
- `C:/SeedTrade/docs/control/CONTROL_REVIEW_2026-09-14.md`
- `C:/SeedTrade/docs/control/CROP_TRADE_BASKET_V01.md`
- `C:/SeedTrade/docs/control/CYCLE_2026-09-14.md`
- `C:/SeedTrade/docs/control/FILE_INVENTORY_2026-09-14.json`
- `C:/SeedTrade/docs/control/FINAL_FILE_DIFF_2026-09-14.json`
- `C:/SeedTrade/docs/control/GLOBALWITS_AUDIT_2026-09-14.md`
- `C:/SeedTrade/docs/control/TRADE_SIGNAL_SUPPLY_DESIGN_V01.md`

Review finalized UTC: 2026-09-14T18:10:01.4304538Z. Recurring automation confirmed PAUSED. Await explicit user approval.


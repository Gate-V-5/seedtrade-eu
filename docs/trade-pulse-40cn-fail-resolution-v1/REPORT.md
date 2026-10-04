# 40-CN FAIL resolution — methodology candidate

Decision: **PASS_CORE_ONLY / MODEL_A**, for the corrected methodology model only. No website implementation or publication was performed. The original audit RELEASE_GATE=FAIL is preserved unchanged. The existing unpublished implementation must consume these corrected attribution rules before it may be released.

## Recovered evidence

Used exact final r2 audit checkpoint SHA256 a3378ef7db11c4c5fc8f8e2a3be71f4435c437f0be384dfc3c1696c243952a30, 43,001,594 bytes, 1,532 archive entries. All current recovered audit bytes match that checkpoint. Dropbox search confirms both original and r2; original retained. r2 metadata, manifest and SHA256 sidecars are byte-confirmed. Source dataset has 153,838 rows; prior retained source audit verified every value/quantity pair against raw JSONstat and 1,080 request hashes. No COMEXT requests were repeated. Official CN2026 XLSX evidence, annual concordances, official raw responses and the original implementation are inside the nested recovered archive included in this checkpoint.

## Why one aggregate is safe

All 40 official descriptions explicitly restrict goods to seed for sowing. None contains a non-sowing commodity scope. A biological group code does not become non-seed trade because it is broader than one species. CORE means safe for a **CN-defined seed-for-sowing headline**, not species-specific. The headline must say 40 CN codes and expose the period and gross internal-EU exporter-dispatch methodology. It is not all EU seed-sector commerce, production, or a measured aggregate of 121 biological species. MODEL_B is unnecessary for this recovered universe: there is no additional ambiguous-use/commodity scope requiring a second monetary universe. Partial and group precision remain explicit on every figure. No group values are allocated to constituent species.

The classification separates sowing-use specificity (all 40 confirmed) from botanical granularity (16 specific, 11 partial, 13 group). This resolves the ambiguity of the earlier `sowing_specificity` field, which also described botanical precision. The original field is preserved in the recovered original audit.

## Exact prior FAIL resolution

| CN | Previous blocker | Resolved model rule |
|---|---|---|
|10019110|Missing separate commercial Spelt link|Directly link the existing `spelt` entity, *Triticum aestivum* subsp. *spelta*. The biological parent *Triticum aestivum* remains partial scope; no new species or entity.|
|10019120|Common wheat/meslin under-labelled as partial single-species scope|Keep CN-10019120 as GROUP_LEVEL common wheat or meslin; *Triticum aestivum* is a scope candidate, not the owner of the whole code volume.|
|12091000|Sugar-beet *Beta vulgaris* crop type inherited vegetable primary category|Keep CN crop-type evidence and partial biological scope. Explicitly unallocated commercial category.|
|12092960|Fodder-beet *Beta vulgaris* crop type inherited vegetable primary category|Same explicit unallocated rule; retain official *Beta vulgaris* var. *alba* wording separately without asserting a new accepted taxon.|

Withholding category allocation is a final safe model decision, not a missing decision about headline inclusion. No eleventh category is created. Cross-category codes 12092945, 12092980 and 12099180 also remain unallocated. CN12099180's vegetable customs label is retained, while its scope candidates span approved vegetable and brassica commercial categories: no forced primary-category transfer.

## Reconciliation and units

CORE40 = 251,015,101 kg = 251,015.101 t, display251,015.10t; EUR400,438,328.
EXTENDED0 / REVIEW_REQUIRED0 / EXCLUDE0 are empty, explicitly classified universes, not substituted missing observations.
Old11 = 30,932,074 kg / EUR35,685,420. Added29 = 220,083,027 kg / EUR364,752,908. Exact residuals zero.
Quantity source QUANTITY_IN_100KG converted ×100 tokg, /1000 totonnes. Value source VALUE_IN_EUROS. No supplementary-quantity mixture.
Tolerance per displayed two-decimal tonne figure ≤0.005t; four rounded partition values may differ by ≤0.02t, but exact kg/EUR reconciliation is required and passes.
The before/after change is **same-month customs scope expansion**, not temporal growth.

## Category and species precision

10 category rows include explicit DATA_GAP/null where no measured category scope exists. Disjoint category totals plus unallocated reconcile exactly to CORE. Unallocated five codes retain 11,816.67t / EUR199,385,215 (49.791741% of value), without forcing commercial allocation. Cereals/pseudocereals is largest **among safely allocated categories**, not an unqualified winner over unallocated scope.
Species partition: 20 direct (16 full botanical scope +4 restricted crop-type/infraspecific scope), 78 group-only,23 no compatible evidence =121. Direct partial evidence is not whole-species trade. Group links show possible scope, not proven contributors or allocated amounts. The121 biological KPI and136 commercial entities are different counts. Separate commercial Spelt remains searchable/filterable in the recommended model without increasing the biological KPI. Category files count actual contributing CNs, direct commercial links, candidate entity links and directly supported species separately.

## Internal market model

Each figure carries source/period/flow/unit, CN measurement entity, botanical granularity and display precision SPECIES_SPECIFIC/MARKET_ENTITY_SPECIFIC/GROUP_LEVEL/CATEGORY_LEVEL. The base measurement remains the customs grain. Species filters reveal group evidence with full customs label and no species amount. Category and species views overlap the same base data and must not be summed with the headline or each other. Missing is null/absent, not zero; observed source zero stays flagged. No interpolation or inferred years.

## Flow and providers

Intra-EU headline uses exporter dispatches only; mirror imports are excluded. Extra-EU imports/exports are separate. Full reporter/partner/month/CN/FLOW grain duplicates=0. The5,900 repeated keys without FLOW are legitimate separate import/export flows, not duplicates. No claim is made that gross customs dispatches represent unique physical seed lots; a lot may move across multiple commercial legs. EU code scope, source provisional statuses and vintage limitations remain inherited from the recovered audit. The6,962 observed zero-weight historical rows are not absent-data fills.
COMEXT remains primary official aggregate. GlobalWits owner workbook is retained only as internal license-review evidence, contributes zero public aggregate values and was not newly researched. Datamyne ACCESS_PENDING, no fabricated records and no silent official-source replacement.

## QA and release boundary

11 targeted tests pass (8 resolution +3 original-audit guards), including all40/29/11 counts, exact totals, original FAIL preservation, group safety, category partition,121/136/10/52 and CSV/JSON parity. All365 pre-existing project files are SHA256 unchanged. No website, Production, Daily News, trade source observations, taxonomy or provider architecture was modified. Prior raw-cell/source audit is retained; it is not represented as a freshly repeated153,838-row extraction.
No build or rendered visual QA was rerun because this task is methodology-only and no application files changed. Previous build/prerender/hydration results remain historical evidence, not new PASS claims.
Release decision approves the **corrected model**; it does not approve publishing the currently unmodified old attribution presentation. No commit, push, deployment or real emails. Remaining category unallocation is an exposed coverage limitation and not a headline CN blocker.

## Reproduction and backup

Run `python scripts/resolve_trade_pulse_40cn.py` then `python -m unittest discover -s tests -p 'test_trade_pulse_40cn*.py' -v` from recovered implementation. No network collection required. New checkpoint includes this corrected model, scripts/tests, QA and the exact recovered r2 archive. Prior checkpoints are not overwritten. Full Dropbox ZIP readback is expected to exceed5MB (5,242,880 bytes); report the actual connector response and verify metadata/provider hash and small sidecars instead. External verification receipt records final upload/readback outcome. Internal local-verification receipt must not be mistaken for full remote readback.

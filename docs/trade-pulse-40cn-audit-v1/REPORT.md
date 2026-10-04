# SeedTrade EU Trade Pulse 40-CN expansion audit

RELEASE_GATE=FAIL. The numerical 40-code sowing-seed aggregate passes, but four current attribution/category decisions block publication. This is an audit of the exactly recovered candidate; source observations, headline values, taxonomy, Production data and UI were not altered. No push/deploy.

Starting remote/main: dbfd99350479044794837269ed7ef2e7b6c2d4ab. Previous checkpoint SHA256 c5fe73a45f179329c801a52dabfb205a1b8729ca43d8d6ede37250f539cfa011. Every implementation file matched the previous checkpoint; 1089 raw/normalized evidence files also matched. All 1080 raw COMEXT request hashes and all 153838 accepted normalized quantity/value pairs were checked against original JSONstat cells. No broad extraction was repeated. The audit cutoff remains June 2026, preserved history January 2024–June 2026, official source vintage September 15, 2026. This task does not claim no newer data exist or advance the approved cutoff.

## Reconciliation

| Intra-EU June 2026 | Exact tonnes | EUR |
|---|---:|---:|
| Old 11 codes | 30932.074 | 35685420 |
| New 29 codes | 220083.027 | 364752908 |
| All 40 | 251015.101 | 400438328 |

Decimal quantity and value residuals are exactly zero. Displayed tonnes: 30932.07 + 220083.03 = 251015.10. Single-display tolerance is 0.005 tonne; independently rounded components may differ by at most 0.01 tonne. No correction was applied. Same eleven-code baseline matches. The entire June intra-EU increase is the contribution of 29 additional approved sowing codes, not multiplying records by species mappings. The all-history universe replaces overlapping prior observations; counts are not added to older manifest totals.

Zero duplicate reporter/partner/month/CN/flow grains. Omitting flow creates 5900 repeated four-dimensional keys: distinct extra-EU imports/exports, not duplicates. Internal trade counts exporter dispatches once; mirror imports are excluded. Extra-EU imports and exports remain separate. Source 100 kg is multiplied by 100 for kg and by 0.1 for tonnes; value is EUR. Supplementary quantities and GlobalWits USD are not mixed in. Missing cells are absent, not zero; 6962 officially reported zero-weight rows remain flagged with no representative price.

## Seed-market semantic decision

All forty codes explicitly concern sowing in preserved official yearly classifications. No non-sowing/commodity code was found. Large volume or low unit value alone does not prove misclassification. The headline is a BOUNDED 40-code declared sowing-seed customs indicator, not exhaustive EU seed trade, certified production or 121 measured botanical species. No artificial CORE/EXTENDED split is necessary merely because some sowing codes are groups.

Release blockers:

- CN10019110: official spelt seed (Triticum aestivum subsp. spelta) correctly supplies partial infraspecific evidence to biological parent Triticum aestivum, but its separate approved commercial spelt entity lacks a direct CN link. Re-link to that existing entity; no taxonomy expansion or silent activation. Kew confirms the accepted subspecies. Its biological parent relationship does not justify losing a separate approved commercial entity.
- CN10019120: common wheat OR meslin is mixed customs scope. Relabel GROUP_LEVEL; Triticum aestivum is a scope candidate, not the sole measured contributor. Do not allocate the full value to that species.
- CN12091000: sugar-beet seed is a crop-type scope within Beta vulgaris. A beet/chard species link does not establish commercial vegetable-category equivalence. Withhold this category allocation pending an explicit crop-type decision.
- CN12092960: fodder-beet seed, likewise within Beta vulgaris, needs the same category-scope decision. Do not silently classify all its trade as vegetable seed.

No headline code is removed: numeric/sowing scope passes. The package as currently attributed is BLOCKED; recommendations are recorded without modifying the recovered implementation. Four semantic decisions, rather than source-number failures, prevent release.

## New-code concentration

Shares below are of the 29-code expansion; CN_AUDIT_40 also includes full-total shares. Concentration is a disclosure flag, not a deletion rule for valid codes.

### Top ten new CN by volume

| CN | tonnes | EUR | expansion volume % | expansion value % |
|---|---:|---:|---:|---:|
| 10019120 | 61,878.779 | 13,126,731 | 28.116 | 3.599 |
| 10051090 | 61,812.981 | 19,215,270 | 28.086 | 5.268 |
| 10051015 | 13,272.188 | 35,559,173 | 6.031 | 9.749 |
| 10011100 | 12,173.984 | 3,022,037 | 5.532 | 0.829 |
| 12051010 | 10,692.473 | 40,375,382 | 4.858 | 11.069 |
| 10031000 | 9,026.811 | 2,272,920 | 4.102 | 0.623 |
| 10021000 | 8,192.448 | 2,137,115 | 3.722 | 0.586 |
| 10041000 | 7,030.460 | 2,386,749 | 3.194 | 0.654 |
| 12092980 | 6,168.684 | 15,939,499 | 2.803 | 4.370 |
| 10051018 | 4,469.335 | 1,556,223 | 2.031 | 0.427 |

### Top ten new CN by value

| CN | tonnes | EUR | expansion volume % | expansion value % |
|---|---:|---:|---:|---:|
| 12099180 | 2,701.406 | 162,886,710 | 1.227 | 44.657 |
| 12051010 | 10,692.473 | 40,375,382 | 4.858 | 11.069 |
| 10051015 | 13,272.188 | 35,559,173 | 6.031 | 9.749 |
| 10051090 | 61,812.981 | 19,215,270 | 28.086 | 5.268 |
| 12091000 | 921.317 | 17,575,120 | 0.419 | 4.818 |
| 12092980 | 6,168.684 | 15,939,499 | 2.803 | 4.370 |
| 10019120 | 61,878.779 | 13,126,731 | 28.116 | 3.599 |
| 12060010 | 2,599.542 | 13,089,806 | 1.181 | 3.589 |
| 07133310 | 1,676.397 | 7,788,047 | 0.762 | 2.135 |
| 12092280 | 2,203.134 | 6,311,866 | 1.001 | 1.730 |

Concentration: {"denominator": "29-code expansion only; distinct from 40-code total shares", "volume": {"top_1_cn": "10019120", "top_1_share_percent": 28.116107, "top_3_share_percent": 62.232854, "top_5_share_percent": 72.622777, "top_10_share_percent": 88.474857}, "value": {"top_1_cn": "12099180", "top_1_share_percent": 44.656727, "top_3_share_percent": 65.474808, "top_5_share_percent": 75.561195, "top_10_share_percent": 90.984224}, "flags": ["CONCENTRATED_NEW_CODE_VOLUME_TOP3_OVER_50_PERCENT", "CONCENTRATED_NEW_CODE_VALUE_TOP3_OVER_50_PERCENT"]}

## Category analysis

Single-category customs scope is assigned once where supported. Cross-category CN12092945/12092980/12099180 and the two unresolved beet crop types stay unallocated. No proportional allocation; linked species/entities are scope candidates, not proven contributors. No observed category coverage is DATA_GAP, not zero.

| Category | tonnes | EUR | full-total volume % | full-total value % | CN | linked seed species |
|---|---:|---:|---:|---:|---:|---:|
| Cereals and pseudocereals | 185721.887 | 89147327.0 | 73.988332 | 22.262436 | 15 | 12 |
| Grain legumes and protein crops | 15999.439 | 7261629.0 | 6.373895 | 1.81342 | 3 | 5 |
| Forage legumes | 3583.73 | 11426084.0 | 1.427695 | 2.853394 | 3 | 14 |
| Grass seeds | 12488.184 | 21728189.0 | 4.975073 | 5.426101 | 6 | 6 |
| Oilseed and fibre crops | 16653.404 | 59269178.0 | 6.634423 | 14.801075 | 5 | 8 |
| Mustard and radish seeds | 3048.162 | 4128117.0 | 1.214334 | 1.0309 | 1 | 3 |
| Vegetable seeds | 1703.625 | 8092589.0 | 0.678694 | 2.020933 | 2 | 2 |
| Herbs and specialty flowering crops | DATA_GAP | DATA_GAP | None | None | 0 | 0 |
| Seed potatoes | DATA_GAP | DATA_GAP | None | None | 0 | 0 |
| Other propagation material | DATA_GAP | DATA_GAP | None | None | 0 | 0 |

Unallocated: 11,816.670 t / EUR199,385,215; 49.792% of full value. Cereals/pseudocereals are largest only among SAFELY ALLOCATED categories, not unconditionally across the whole universe.

## 121-species safety

Conservative validated CURRENT mappings: 16 full species-specific, 4 partial botanical/crop-type scopes, 78 group-only and 23 without compatible data; mutually exclusive and total 121. Spelt is an accepted subspecies within Triticum aestivum and contributes partial biological evidence to that parent; it is not a 122nd species. Its separate commercial entity needs a direct link. Botanical coverage and commercial-entry activation are distinct. No constituent group volume is assigned to a species. Code granularity: 16 species-specific, 11 partial, 13 group-level; sowing ambiguity zero. Mapping blockers are separately disclosed. Preserve all 121 true-seed species, 136 market entities, ten categories and 52 catch-crop species. All Production observations and source evidence remain unchanged.

## Commercial isolation

Original GlobalWits workbook/cells remain internal checkpoint research; no new research, platform access, values or contacts are used in public aggregates. HS090961 is a non-sowing spice group, not Carum carvi-only data. Datamyne stays architecture-ready/access-pending; no fabricated data. Licensing and future provider reconciliation remain separate release gates.

## Sources / reproduction / QA

Official classifications: preserved KSH CN2026 and Spanish national customs CN2024/CN2025 workbooks, their original URLs, hashes and retrieval dates; full raw requests are retained. Official Eurostat quantity/value unit reference: https://ec.europa.eu/eurostat/documents/3859598/12137783/KS-GQ-20-012-EN-N.pdf/f982fc06-3ff8-d37b-298f-9c76c843ae52 . Targeted botanical confirmation: https://powo.science.kew.org/taxon/urn%3Alsid%3Aipni.org%3Anames%3A77189305-1 . No new trade dataset was collected.

Reproduce: `python scripts/audit_trade_pulse_40cn.py --work RECOVERED_RESEARCH_DIRECTORY`. Audit JSON/CSV tables include all forty codes, twenty-nine contribution rows, top tens, category rows, 121-species coverage and release decision. The unallocated bucket is not an invented eleventh category. Full source/numerical checks pass; four semantic blockers remain. Automated implementation PASS does not override release FAIL. Current rendered browser QA is not claimed; this task changed no product UI. No real emails, commit, push, deployment or Hostinger action.

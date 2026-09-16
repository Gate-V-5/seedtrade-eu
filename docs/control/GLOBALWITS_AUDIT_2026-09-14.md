# Globalwits GTIS6.0 integration audit — in progress

Access date: 2026-09-14. Evidence labels: FACT (document statement), OBSERVED DATA (visible UI metadata), DERIVED RESULT (explicit calculation), ASSUMPTION, UNKNOWN. No numerical crop observations collected.

## Sources and scope

- OBSERVED DATA: authenticated Home https://gs5.globalwits.cn/home, EU Trade Search https://gs5.globalwits.cn/tradesearch/index and Data Update https://gs5.globalwits.cn/smartservice/DataUpdate, inspected approximately 03:44–03:50 UTC.
- FACT: linked privacy policy, title 环球慧思隐私权政策, updated 2025-06-30, https://gs5.globalwits.cn/privacyPolicy. Describes personal information and references service terms; does not establish requested trade-data licensing permissions.
- Public official website https://www.globalwits.com/ produced no usable documentation through web reader; public privacy retrieval failed in web reader but browser successfully displayed linked policy.

## P0 coverage and periods

OBSERVED DATA: Home lists regional country/product tiles, including EU, Spain, Britain, Ukraine and Russia; tiles alone are not proof of subscription entitlement or complete reporter coverage. EU tile exposes imports European Union(Stats) and exports European Union(Stats EXP). Update catalogue has Universal Data Source, Global Stats(Monthly), Global Stats(Annual). Monthly country selector includes all four priority countries, Lithuania and other EU/non-EU reporters. Count Total 292 is update rows, not 292 countries. All-country histories are not yet audited.

With Recent Update selected, Global Stats(Monthly) and Global Stats(Monthly EXP) show:

| Reporter | Date of data, both flows | Displayed update timestamp, timezone unspecified |
|---|---|---|
| Germany | 202606 | 2026-09-09 14:16:02 |
| France | 202512 | 2026-06-18 09:10:29 |
| Poland | 202606 | 2026-08-31 09:38:28 |
| Italy | 202605 | 2026-08-25 09:05:10 |

These are catalogue observations for these named datasets, not proof of the newest period in every alternative EU dataset. Historical start dates and completeness UNKNOWN. EU(Stats) query defaults to 2026-06, independently observed; default alone does not establish maximum available period. Daily update notices on other datasets do not mean daily reporting for EU datasets. Publication cadence needs multiple release observations; publication lag must distinguish reference-period end, listed update date and audit date. Do not infer transaction dates from a monthly date displayed as first day of month.

## Fields and granularity

OBSERVED DATA: EU import screen has date range, HS CODE, SITC, HSCODE DESCRIPTION, COUNTRY OF ORIGIN, PURCHASING COUNTRY, TOTAL VALUE(USD), WEIGHT(KG) filters. Visible table additionally has IMPORT DATE and TRANSACTION TERMS. Eight-digit codes appear in automatically populated preview, supporting at least eight-digit display in this dataset; formal CN edition and global maximum detail UNKNOWN. Weight is labelled KG, not explicitly net weight: net/gross definition UNKNOWN. USD conversion basis, original currency, supplementary quantities, unit value and company fields UNKNOWN for EU dataset. Absence from initial visible columns is not proof of unavailability.

## Export and integration

OBSERVED DATA: export dropdown contains Export, Export(show columns), Export Times. No option executed. CSV/XLSX formats, row/query/download limits and whether clicking initiates server-side export remain UNKNOWN. Official API, developer interface, scheduled exports and feed entitlement UNKNOWN. Do not probe private network endpoints, copy cookies, inspect credentials or reverse-engineer hidden APIs.

## Permission matrix

All UNKNOWN for this subscription: automated retrieval; scheduled retrieval; local data storage; database integration; transformation/aggregation; internal analytics; derived indicators; commercial SeedTrade use; derived-statistic/signal publication. UI button availability is not a licence grant. Privacy policy is not a trade-data licence. No bulk scraping or downloading; small crop validation remains gated until applicable permission established. No messages/provider contact permitted.

## Errors and limits

One read-only selector click returned Cannot focus a read-only element; another stale accessibility element error; an attempted filter text edit reported no settable value. Recovered with current UI state and dropdown selection. No account data changed. Browser's auto-preview is not a user-submitted crop validation and its unrelated trade values are not retained in project data. No raw credentials/account identifiers saved. No tests yet because no executable code changed.

## History and calculated lag — September 14 04:54 UTC

OBSERVED DATA: Italy Global Stats(Monthly) update history, Recent Update unchecked, lists both import/export February and March 2026 at 2026-06-25 11:17:46, April at 2026-08-05 15:21:42, May at 2026-08-25 09:05:10; December 2025 at 2026-05-15 09:06:03. Total 182 history entries; last page 19 shows January 2023 for both flows, update 2023-12-13 11:51:51. This is the earliest visible catalogue entry, not demonstrated earliest queryable trade period or proof of continuous history. Multiple months can be released together; no daily or fixed monthly publication cadence established.

DERIVED RESULT: calendar-day differences using reference-month end and displayed update date (ignoring time-of-day because timezone unspecified), as of audit date 2026-09-14:

| Reporter | Period end to listed update | Period end to audit date |
|---|---:|---:|
| Germany | 71 days | 76 days |
| France | 169 days | 257 days |
| Poland | 62 days | 76 days |
| Italy | 86 days | 106 days |

These measure listed release lag and age of latest listed period for the audited monthly dataset only. Listed update may be a revision rather than first publication; first-publication lag remains UNKNOWN. Not a Globalwits-wide freshness score. One local PowerShell arithmetic command had a parser error before execution; corrected command returned the figures. No executable project code or tests changed.

## Alternative EU dataset revision evidence — September 14 05:59 UTC

OBSERVED DATA: Data Update > Universal Data Source > Country > Importing Country > European Union(Stats), Recent Update selected, returns two entries: period 202605, update 2026-09-02 11:06:22, remark Final; period 202606, same update timestamp, remark 01. No crop query/export executed. The meaning of 01 is UNKNOWN; do not relabel it provisional or final without definition. The UI explicitly labels May Final, but this does not independently validate data accuracy.

This alternate dataset differs from country-level Global Stats(Monthly). Store dataset_id in every coverage/freshness/observation key. Do not apply the French country-series December 2025 limit to the EU-wide dataset without reporter-specific checking. Conversely, June in the EU-wide catalogue does not prove each requested reporter/crop has complete June records. Its company fields, net-weight definition and subscription rights remain UNKNOWN. June period-end to listed September 2 update is 64 calendar days (DERIVED RESULT; timezone unspecified). No assumption about first publication versus revision.

## EU export comparison — September 14 06:59 UTC

OBSERVED DATA: Universal Data Source with EU import and export catalogue filters returns four entries. European Union(Stats EXP) has 202605 / Final and 202606 / 01, both updated 2026-09-02 11:06:21. Import timestamps are one second later. Thus month/remark labels match across these two catalogue flows; completeness, crop availability and meaning of 01 remain unverified. No crop query or export job initiated. Filter selection is UI navigation, not account configuration.

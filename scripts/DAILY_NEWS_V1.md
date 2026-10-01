# Daily News V1: reviewed editorial publication

Four permanent streams appear in a fixed order: EU Weather, EU Agronomist,
EU Trade Market, EU Events. Source checking does not promise daily stories.
This version has no automatic fetching, generation, publication or email.

## Public model and review

Keep canonical English, IDs, slugs, source attribution and factual metadata on
one record. Add only headline, summary, why_it_matters and matching content
sections under localizations.de/fr/es/it. Preserve section IDs and array order;
a missing individual translated field falls back to its canonical English
field through the existing V1-B resolver. Official source names stay unchanged.

The four pre-V1 News records retain their objects and permanent URLs. New
records use schema_version 2. Identity, geography, species, publication and
observation dates, continuity, sources, claims, corrections and review status
are validated by src/news.mjs and scripts/validate_daily_news.mjs.

Before approving a new record:

1. Read the public source and record its exact URL, visible publication date
   (null if genuinely unavailable), checked_at, scope and evidence locator.
   Do not bypass restricted access. An accessible landing page does not prove
   that a restricted report's contents were read.
2. Classify each claim: CONFIRMED for direct appropriate evidence; SUPPORTED
   for appropriate research or independent corroboration; INDICATIVE for
   limited observations; SCENARIO for explicitly conditional interpretation;
   INSUFFICIENT when the conclusion is unsupported. INSUFFICIENT may document
   a limitation, but publish_conclusion must be false. Do not render its
   unsupported proposition as an affirmative claim. Sources sharing an
   original press release are not independent corroboration.
3. Write original synthesis and map each section to its claim_ids. Distinguish
   seed from commodity crops, forecasts from final statistics, certification
   results from total supply, offers from market prices and trade unit values
   from quotations. Identify material species with their Latin names.
4. Approve PUBLIC_SAFE, publication_eligible=true, review_status=APPROVED and
   market_engine_input=false only after factual and translation review. No
   private material, credentials or personal contacts belong in these files.
5. Set publication_date once. Use updated_at for a substantive revision,
   checked_at for source verification, revision/corrections for changes.
   Set valid_until as an editorial homepage review deadline, not a source's
   forecast expiry. Extend it only after review; never silently redate a story.
6. Recompute fingerprint using the exported fingerprint(record) function in
   scripts/validate_daily_news.mjs. It covers canonical content and metadata,
   excluding fingerprint itself and translations. Refresh the News and source
   registry SHA256 values in public_data_manifest.json. Advance news.as_of to
   the reviewed publication snapshot and add eligible canonical News URLs to
   the existing sitemap. Do not introduce localized route trees.
7. Run node scripts/validate_daily_news.mjs, npm run build and npm test.
   Inspect the content, translations, final diff and production preview before
   authorizing publication. Structural checks cannot replace reading evidence.

The registry contains 20 source families, with 19 active. DWD retrieval returned
HTTP 403 on 2026-10-01 and is inactive pending verifiable public access. No DWD
report was used or claimed to have been read.

Registry active means a priority source family for manual monitoring, not
permission to auto-publish. Article sources must use the family's registered
public host or explicitly approved_hosts. A source-type label alone does not
prove a claim. Deactivating monitoring does not erase valid historical evidence.

## Selection, archive and date handling

The homepage selects the latest eligible, still-valid record independently for
each stream. Missing evidence or an expired assessment leaves a localized
"No new verified assessment" slot. No slice(0,4) selection or publication quota.

The permanent archive defaults to All history. Recent covers the inclusive last
20 calendar dates; filters combine stream, country, crop, date range and period.
Upcoming events use event dates and exclude CANCELLED/COMPLETED. Expired
assessments and completed events remain accessible as dated historical records.

Initial server/client output uses news.as_of consistently. After hydration the
browser applies the current Europe/Vilnius date and checks it every minute,
removing expired highlights and completed events. Static HTML is explicitly a
publication snapshot: rebuild when publishing/reviewing content, and before an
assessment deadline or event completion if current no-JavaScript highlights
are required. V1 does not add a scheduled deployment service. The article keeps
its event dates and checked date visible; no published date is advanced on load.

## Weather continuity and limits

The first Weather item is a baseline, with previous_item_id=null. Future
assessments keep series_id, refer to an earlier PUBLIC_SAFE assessment and use
related_item_ids, observation_period, assessment_outcome, what changed and
what to watch next. Never fabricate the first predecessor.

The existing 23 monitoring regions are in France, Germany, Italy, Lithuania,
Poland and Spain. They are not a statistically representative EU sample.
analysis_count, region existence and the calendar are not crop-stage or weather
measurements. Broader JRC/Copernicus evidence supplies EU context; their common
EC/JRC origin is recorded, not counted as independent confirmation. Summer
commodity-yield forecasts cannot alone establish autumn area changes, seed
shortages or spring seed demand.

## Initial evidence review: 2026-10-01

- Weather: JRC announcement dated 2026-09-28 and Copernicus EDO's mid-September
  overview, publicly read. Forecast reductions remain forecasts. EDO does not
  display a separate publication date; published_at is null, checked_at dated.
- Agronomist: LLKC field/farm assessment dated 2026-09-29, publicly read.
  Wet-field establishment delays are a limited Latvian advisory signal.
  Practical decisions are conditional; no national area/demand estimate.
- Trade Market: NAK update dated 2026-09-25, publicly read. The denominator of
  its >28% downgrade observation is the available early results, not all Dutch
  production. End-week-38 result coverage was 15%. No EU shortage conclusion.
- Events: official Euroseeds Congress invitation and practical-information
  pages publicly read on 2026-10-01. Event dates are 2026-10-25 to 2026-10-28,
  Valencia, Spain. Undated source pages remain null-dated; participation and
  closed-meeting access restrictions are preserved.

Suggested manual cycle: daily source/event checks, weekly Weather assessment
with evidence-driven interim updates, regional agronomic rotation, meaningful
trade releases and event changes. Retain original dates when nothing changes.
Autonomous publishing, SEO V2, Vegetable & Potato Insights and the unidentified
GENT source remain deferred.

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
each stream. Missing evidence or an expired assessment omits the card. Category links remain
available even when a stream has no eligible highlight. An older article is used
only while it still passes the unchanged review/provenance and valid_until gates.
Duplicate article identities cannot appear in the same selection. Remaining cards
rebalance across desktop/tablet tracks; mobile keeps one column. No slice(0,4) selection or publication quota.

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

## Homepage restoration review: 2026-10-16

Two new original syntheses restore Weather and Agronomist; the eight prior
records remain unchanged. Publication dates of new editorial work are distinct
from source dates and observation periods. The September climate review is
retrospective, not an October forecast. Both new records require homepage review
by 2026-10-30; expiry hides cards, never bypasses verification.

New visuals may be licensed photographs or attributed original static SVG
illustrations. Original illustrations must contain no third-party imagery,
scripts, external resources or documentary-evidence claims. Existing photo
licence requirements and immutable owner-approved images are unchanged.

Run node --test tests/homepageNewsRestoration.test.mjs and
node scripts/check_homepage_restoration.mjs (also included through npm test).
DOM/CSS checks do not establish actual browser pixel rendering.

## Mandatory image review — News Photography Standard V1

Before approving any future News item, complete all eight steps in
[the permanent image policy](../docs/realistic-visuals/EDITORIAL_IMAGE_POLICY.md).
Use a unique real photograph with independently verified commercial reuse and
redistribution rights, unmodified local original, hashed optimized derivative,
visible compliant credit and EN/DE/FR/ES/IT descriptions. Run the image validator
as part of build; do not add new stories to the legacy exceptions. Desktop and
mobile browser evidence is required for final sign-off; record a blocked check
honestly. No verified photo means hold publication, not add a schematic fallback.

## News Experience V3 presentation gate

Follow docs/news-experience-v3/NEWS_PRESENTATION_POLICY.md. Shared16:9 cards carry
only discovery fields; compliant credits and reviewed human-readable references
are on articles. New reference URLs require a reviewed news_presentation entry.
Build includes validate_news_presentation.mjs after prerender and fails closed
on internal editorial UI codes. Never alter immutable article content merely to
pass this check; resolve any contradictory editorial requirements first.


## Stage 2 local operating procedure (not activated in production)

Run `python scripts/news_pipeline.py collect` for bounded source discovery or
`python scripts/news_pipeline.py tick` for due daily/Sunday/Wednesday processing.
The private queue defaults to the existing workspace private/stage2-news-v1.
`status` reports actual collection, pending candidates, source failures and real
review/publication timestamps; null means no such action occurred. A scheduled
cycle prepares review drafts; it never grants editorial or language approval.
Source dates missing from accessible evidence remain unknown. Date ambiguity,
seed relevance and commercial implications require human review.

The timer/service files are LOCAL TEMPLATES ONLY. They are not installed. The
existing authorized execution account and private paths must be bound during a
separately authorized production deployment. The due checker uses Europe/Vilnius
IANA rules, daily checks after07:00 and Wednesday/Sunday18:00 editorial windows;
missed windows are caught up without running the same window twice.

An actual owner-controlled review supplies a private package, editorial receipt
and separate exact publication authorization. Receipt covers the entire package,
all five language versions, claim review and real-photo rights review. Codex must
not fabricate these inputs. `prepare-publication --package ... --receipt ...
--authorization ...` reuses existing validation, builds an isolated private copy
and records an approved handoff. It does not push, deploy or mutate the canonical
news snapshot. Approved-content digest receipts contain no private reviewer IDs.
A future authorized deployment uses the existing managed Git/Hostinger process,
stopping on drift and preserving COMEXT. Never copy candidate/draft queues into
GitHub public artifacts or the public website. Legacy narrative/image exceptions
remain immutable. A seven-day highlight cannot be renewed by changing checked_at.
Daily render-refresh handoffs remove expired selections but cannot approve claims.


New article packages carry an explicit editorial_type selected by the reviewer:
OFFICIAL_UPDATE, RESEARCH_BRIEFING, PRELIMINARY_RESEARCH,
COMPANY_ANNOUNCEMENT or EDITORIAL_ANALYSIS. This is a public descriptive label,
not a substitute for individual claim evidence or independent corroboration.

Stage 2 content readiness: `node scripts/validate_news_package.mjs --draft <file>`
checks the complete pending package without granting approval. Its persisted
article remains PENDING_OWNER_APPROVAL, DRAFT and publication_eligible=false.
The pure in-memory publication projection is for structural/selection checks;
the existing build gate still rejects it without a genuine content-bound receipt.
Only after exact draft-hash editorial approval (including all languages and image
rights) AND separate publication authorization does prepare-publication persist
the approved projection in its private build copy. That copy records both draft
and projected-content hashes and propagates the reviewed image evidence into the
existing photography register. Canonical snapshots and historical rights remain
unchanged until a separately authorized publication.

Do not invent measurement dates for retrospective or procurement analysis.
Such EDITORIAL_ANALYSIS may carry observation_period=null only with the explicit
SOURCE_OBSERVATION_WINDOW_NOT_VERIFIED or NO_MEASURED_PERIOD_PROCUREMENT_GUIDANCE
basis. Dated official observations still require a valid measured range. Source
publication dates, proposed editorial dates and retrieval dates stay distinct.


## Mandatory four-stream coverage (local implementation)

The editorial target is four distinct articles on Wednesday and four on Sunday,
at 18:00 Europe/Vilnius: one per EU Weather, EU Agronomist, EU Trade Market and
EU Events. Eight weekly targets are not a guarantee of eight publications.
Daily discovery maintains separate private, independently ranked shortlists.
Source-family scope alone cannot establish an article's category. Previously
screened navigation/background links are skipped before the bounded detail budget.

`python scripts/news_pipeline.py coverage` refreshes private shortlists.json and
editorial_slots.json without collection or publication. Future targets have
status SCHEDULED and readiness UNFILLED until actual authorized publication;
cycle checks record UNFILLED with a concrete missing-topic/package/approval
reason. Planned slots missed while offline remain in the rolling ledger as
UNFILLED, never silently disappear or receive backdated filler. Slot UTC instants
use the IANA offset for each scheduled date, including DST-transition weeks.

One topic cannot supply two categories within a cycle. Pending package presence
is reported separately from approval, and proposed dates must match the intended
slot before an authorized local build. Completed/cancelled events cannot satisfy
an upcoming-event slot. A local approved build is not a published article and
never marks a slot filled. Missing evidence or approval preserves the public
archive fallback. The existing two pending packages are not rewritten to meet
this schedule. Rebinding their dates would change hashes and require exact review.
Production deployment and scheduler installation remain unauthorized.


## Owner's simplified short-news standard

Ordinary verified announcements do not need academic research, multiple
independent sources, a market forecast, quantified commercial impact or an
analytical essay. One genuine suitable primary source may support a clearly
attributed factual brief. Existing evidence-class restrictions still prevent a
company's performance claim from being presented as an independently proven fact.
National and regional stories are eligible; EU-wide coverage is not mandatory.

SHORT_NEWS_BRIEF uses an interesting headline, country/region, original source,
real licensed photograph, accurate proposed/actual publication date and two or
three paragraphs totalling 500-1000 main-text characters in each of EN/DE/FR/ES/IT.
No extra public analysis/Why it matters box or paragraph headings are required.
The legacy article schema/history and approval evidence remain supported.

Prefer a source published within seven days. Retrieval is not publication. A
future event may instead use documented current programme/visitor relevance
checked within seven days; its original announcement date may remain unknown.
Older existing drafts remain intact as backlog, not current short-news slots.

`python scripts/news_pipeline.py prepare-briefs` automatically composes and
validates one best eligible private package per stream from source-checked
multilingual editorial inputs. It also runs during Wednesday/Sunday cycles.
This is template assembly, not an invented automatic translation service:
new raw candidates missing verified multilingual wording or image evidence are
held for completion. The four actual input sets were prepared in the current
editorial task. Date rebinding creates a new dated package/hash; it never rewrites
the two earlier pending drafts. Packages always remain DRAFT/ineligible until
real content-bound language/image approval and separate publication authorization.


## Permanent owner-approved selection rules

EU Trade Market is an agricultural-seed stream. A commodity-grain price or energy
bulletin cannot become seed news merely by saying it is useful to seed businesses.
Discovery retains direct seed-topic leads for verification; automatic selection
requires a substantiated source-backed seed connection. Publication validation
requires verified seed-specific source scope/locator, or a seed_sector_connection
with an explained direct/wider-agriculture link, source IDs, actual seed-related
source evidence and a precise locator. Article prose and generic disclaimers do
not establish that connection. One adequate primary source can suffice; no new
academic or multiple-independent-source quota is introduced. A failed connection
excludes the Trade item; it is not repaired by inventing a seed-price implication.
The current French grain/energy brief is excluded pending a genuine replacement.

Geographic diversity covers Europe, including non-EU European markets. Existing
registered sources continue to be collected without country quotas or an EU-only
filter. geographic_coverage.json tracks countries/regions in the latest 20 actual
published snapshot articles; drafts, scheduled slots and future records do not
count. Use verified story geography, never publisher nationality as a substitute.
At equal editorial score/eligibility, prefer lower recent country representation,
then region representation. Missing geography receives no artificial bonus.
Higher editorial value always takes priority; an important repeat-country story
is never rejected solely for geographic balance. Original scoring weights,
publication approvals, five-language format and image rights remain unchanged.


## Owner-authorized standard V2, 2026-11-17

All newly prepared briefs require 1,000–2,000 body characters in every EN/DE/FR/ES/IT version, in 3–5 paragraphs covering what, where/when, relevant details and practical seed-sector interest. Missing source-backed detail holds the package; padding is not permitted. Existing canonical URLs and original publication dates survive revisions; updated_at and revision history identify expansions, never renewed freshness.

Every article reserves a different real photograph across all streams. The persistent news_image_use_registry.json retains original/source identities, author, licence, attribution, original/asset SHA-256 and recomputed multi-crop perceptual features. Historical and retired uses remain reserved. Byte/source matches and conservative near-duplicate matches block publication, including renamed, recompressed, resized and common cropped variants. A near-match is held for review; this is not a guarantee against every adversarial image transformation. Missing licensed unique photography holds the article. Existing human factual, five-language, image and exact publication approval gates remain mandatory.

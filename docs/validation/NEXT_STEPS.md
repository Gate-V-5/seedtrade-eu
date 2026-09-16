USER CONSTRAINT — confirmed 2026-09-12 12:27 UTC: never attempt to access or sign in to any email account. User confirmed continuation within the existing September 12 21:00 Europe/Vilnius review gate.

# SeedTrade validation work plan

ACTIVE AUTHORIZATION — approved 2026-09-11: resume through 2026-09-12 21:00
Europe/Vilnius (18:00 UTC). This supersedes the closed September 11 gate below.
Preserve the final September 11 review. At the new gate stop, prepare the full
September 12 review, pause automation and await explicit approval. No Git push,
deployment or publication of anything without separate explicit approval.
v0.7 and the verified 36px audit stay frozen. Check time before each batch.

CURRENT STATUS (renewed batch 6): September 12 interim review is prepared in
DAILY_REVIEW_2026-09-12.md, with source qualification and changed-file inventory.
No qualified season reference or justified v0.7 change. Do not repeat exhausted
searches/tests without new evidence. At 18:00 UTC finalize that review, pause
automation and await approval. Stay quiet while unchanged; a concrete new lead
or user steering may justify further bounded work before the gate.

HISTORY (renewed batch 5): official LUCAS C2 field form did not establish
an explicit season observation. Close the direct season-reference lead on
current evidence; do not infer labels or acquire microdata speculatively.
Consolidate the September 12 source qualification findings and interim review,
including the proven screening fix, limitations and exact changed-file list.
No new classifier version is justified. Earlier next-step entries below are
history; do not repeat completed investigations without new evidence.

HISTORY (renewed batch 3): padded-ID defects in reference screening
were reproduced and fixed; nine tests pass. Investigate official LUCAS 2022
schema for explicit season labels and geographic sample availability as a new
reference lead. Verify suitability before downloading data. Do not repeat the
completed ID checks or use crop type as a proxy for season truth.

LATEST (renewed batch 4): LUCAS C3 B11 combines seasons; B13/B32 do not separate
them. Country microdata not acquired. See LUCAS_2022_SUITABILITY.md. Next inspect
the official field form or record descriptor via a different retrieval route
for an explicit observed-season field, before any local coverage analysis.
If no such evidence exists, retain LUCAS only as a potential crop-type study.

NEXT LEAD: EuroCrops/EuroCropsV2 primary research and JRC distribution may offer
Lithuanian parcel geometry. Verify country/year coverage, actual season-label
schema, licensing, geometry and upstream training provenance before acquisition
or validation claims. Do not assume 2021 geometry applies to 2023. Existing
diagnostics retain their old stop gates; do not rerun or alter them merely to
resume development. Use new, explicitly scoped scripts when justified.

LATEST (renewed batch 2): EuroCrops LT national metadata states non-commercial
use only; suitable terms for SeedTrade not established. Archive not downloaded.
See EUROCROPS_REFERENCE_LEAD.md. Next unaffected work: inspect reference
screening identity handling and demonstrate any duplicate/group split edge
cases with synthetic records before fixing them. Do not alter frozen v0.7.

REVIEW GATE CLOSED: 2026-09-11 18:00 UTC. Final review delivered at the first
post-gate wakeup (18:02 UTC); continuation automation PAUSED. No development,
research or tests until explicit user approval. Earlier plans below are history
and do not authorize resumption.

CURRENT STATUS (Batch 8): interim daily review and reproduction guide prepared.
No new independent evidence or justified classifier change. Do not rerun passed
tests/diagnostics or repeat exhausted searches without a new lead. Stay quiet
while status is unchanged. At 2026-09-11 18:00 UTC, stop development, reconcile
and finalize DAILY_REVIEW_2026-09-11.md, provide the full review to the user,
pause the automation and await explicit approval. A new source lead or user
steering before the gate may justify another bounded step.

Authorized through 2026-09-11 21:00 Europe/Vilnius (18:00 UTC). Check the
clock before each work batch. At the deadline stop development, prepare the
daily review, pause the continuation automation, and await explicit approval.
No Git push, deployment, web publication, or external-system changes.

The completed LT 2023 S03 PRIMARY BOUNDARY 36px audit is accepted as verified
and frozen. Do not rerun it. v0.7 code and saved outputs remain frozen.

## Next experiment: selection completeness and event concentration

Protocol recorded before execution, 2026-09-10.

Use the exact 2026-09-07 saved LT datasets for 2021–2023, S01–S05.
Read raw, v0.4, and v0.7 JSON without importing or executing classifiers.
Verify unique in-bounds coordinates and complete raw grids. For each sample,
compare the expected selected set (target CTY 1110, 1120, 1150, 1430 AND
available v0.4 baseline) to the observed v0.7 coordinate set. Report missing
target baseline records separately from non-target crop exclusions. Check
saved CTY and phenology agreement. Hash every input before and after analysis.

Describe conflict proportions using all selected pixels as the denominator;
also report directional-agreement/conflict denominators separately.
Group conflicts by the existing four-field event signature (emergence date,
emergence uncertainty, duration, harvest date). Report event concentration and
four-neighbour connected components within each event. Components are spatial
descriptors, not independent field observations or effective sample sizes.
Do not infer missing labels or accuracy from cross-layer agreement.

Acceptance: all selection, coordinate, identity, and unchanged-input checks
must pass before interpreting descriptive summaries. Fail closed on mismatch.
No data-driven threshold tuning or classifier changes in this experiment.

## Subsequent work

Completed: selection/event diagnostic and spatial geometry diagnostic. All
five LT sites have stable saved grids across years; no within-year sample
extent overlap. See WORK_LOG.md for checks and limitations. The independent
validation protocol is now drafted in INDEPENDENT_VALIDATION_PROTOCOL.md.
Next priority: authoritative Lithuanian reference availability, year coverage,
season-label definitions and upstream training provenance. Do not repeat the
completed diagnostics without a new failure or implementation change.

Availability inventory now exists in LT_REFERENCE_AVAILABILITY.md. Next:
inspect public catalogue 283 schema/release and official 2023 crop-code labels.
Do not integrate restricted Geoportal services. No independent parcel labels
have been established; public aggregate statistics remain contextual only.

Six 2023 season codes are now source-verified in LT_2023_SEASON_VOCABULARY.md
and its JSON vocabulary. The catalogue schema remains unresolved after a cache
miss and an empty structure page. Next bounded development: a reference-manifest
eligibility validator tested on synthetic fixtures; distinguish missing evidence
from failed checks and never treat aggregate/wrong-year/unlocated/training-used
records as independent reference. No repeated failing download attempts without
a changed approach. Keep all frozen artifacts untouched.

Reference metadata screening is implemented and seven synthetic tests pass;
see REFERENCE_SCREENING.md. Next priority is a changed public-data retrieval
approach for the documented catalogue download to inspect schema (bounded
read, no account data), subject to normal network permissions. Do not spend
further batches rechecking completed diagnostics or treating metadata-only
candidates as independent labels.

Latest: direct bounded download succeeded (Batch 6). The 2023 CSV provides
LAUKO_ID and season labels, but has no geometry or coordinate columns. See
lt_public_release_schema_v01.json. Stop retrying schema retrieval; next seek
public year-compatible parcel geometry with documented LAUKO_ID linkage and
training provenance. Holding-centre administrative areas cannot locate parcels.

Batch 7 investigated geometry catalogue 3396 and PPIS schema; neither establishes
a usable 2023 LAUKO_ID geometry join. See LT_GEOMETRY_LINKAGE.md. Next bounded
local step: consolidate the evidence, exact reproduction commands and review
inventory. Do not repeat broad geometry searches or invent labels to fill the
gap. No classifier change is justified by current consistency checks alone.

1. Use results to prioritize sample/event groups for independent validation.
2. Check spatial sample overlap and geographic comparability before pooling.
3. Research authoritative ground-reference availability and official CLMS
   product limitations; record provenance and evidence independence.
4. Prepare a field/reference-level validation protocol, with explicit held-out
   groups and no pixel-level independence claims. Acquire no account data or
   change external systems without authorization.
5. Propose a new classifier version only if evidence identifies a specific
   defect and a separately tested correction improves independent validation.

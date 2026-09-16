# SeedTrade daily review — interim

Prepared 2026-09-12 00:39 UTC (03:39 Europe/Vilnius). This is not the final
gate review. Authorization ends September 12 at 21:00 Europe/Vilnius
(18:00 UTC). Scope: renewed work after the September 11 gate, including
September 11 evening work. The final September 11 review remains unchanged.

## Completed work and results

- Reproduced two defects in the new reference-screening utility: whitespace
  padding could evade duplicate-ID and cross-split group checks. Added two
  failing regressions, then rejected padded reference/group IDs without
  silently rewriting them. All nine reference-screening tests passed.
- Investigated EuroCrops Lithuania releases and source metadata. A 2021 archive
  is listed, but national metadata restricts use to non-commercial purposes;
  suitability for SeedTrade remains unresolved. No archive acquired. No 2023
  field-ID linkage or upstream training independence established.
- Investigated official LUCAS 2022 classification and field form. Crop classes
  do not provide the required season distinctions, and no dedicated season
  observation was identified in the inspected form. No microdata acquired.
- Kept v0.7, original saved outputs and the verified LT 2023 S03 PRIMARY
  BOUNDARY 36px audit frozen. No new version proposed.

## Source qualification at this checkpoint

| Source | Established | Remaining gap / disposition |
|---|---|---|
| Lithuanian 2023 public crop CSV (prior window) | Season codes and field-ID column in bounded read | No geometry in inspected schema; year-compatible ID linkage and independence unresolved |
| EuroCrops Lithuania 2021 | Archive listed; documented national restriction | Usage suitability, season schema and training provenance unresolved; no acquisition |
| JRC EuroCropsV2 | Inspected coverage list omits Lithuania | Does not establish Lithuanian 2023 availability |
| LUCAS 2022 | Lithuania release listed; classification/form inspected | Direct season-reference lead closed on current evidence; possible separate crop-type study only |

Detailed primary-source links and inspection limits are in
EUROCROPS_REFERENCE_LEAD.md, LUCAS_2022_SUITABILITY.md and the prior
LT_REFERENCE_AVAILABILITY.md / LT_GEOMETRY_LINKAGE.md notes.

## Tests, conclusions and risks

Nine reference-screening tests passed after the code change, including the
two demonstrated regressions. The earlier eight selection/event and four
geometry tests were not rerun: their code was unchanged. The three suites now
contain 21 tests; this is not a claim of a new combined 21-test execution.
No frozen audit or saved-data diagnostic was rerun.

No independent agronomic accuracy has been measured. Metadata screening
produces candidates requiring evidence review, not verified ground truth.
Whitespace rejection does not establish equivalence of differently cased or
provider-specific identifiers. Source documentation and archive listings do
not establish local coverage, usable labels, rights or training independence.
The failed LUCAS record-descriptor retrieval leaves supplementary-field
coverage unresolved; do not interpret the form inspection as universal absence.

Keep v0.7 frozen. A new version needs independent evidence, not additional
threshold tuning on already inspected sites. The next substantive validation
depends on a qualified year-compatible season reference with geometry and
documented independence. Reopen research only with a concrete new source lead
or documented label protocol; avoid repeating exhausted searches and tests.

## Files added or changed in the renewed window

New:
- docs/validation/EUROCROPS_REFERENCE_LEAD.md
- docs/validation/LUCAS_2022_SUITABILITY.md
- docs/validation/DAILY_REVIEW_2026-09-12.md

Modified:
- collectors/phenology/reference_eligibility_v01.py
- collectors/phenology/test_reference_eligibility_v01.py
- docs/validation/REFERENCE_SCREENING.md
- docs/validation/REPRODUCTION.md
- docs/validation/NEXT_STEPS.md
- docs/validation/WORK_LOG.md

This inventory follows the recorded work and inspected files. Git was not
available on PATH during review preparation, so it is not a repository-wide
clean-status assertion. No push, deployment, publication, provider contact or
external dataset mutation occurred. The existing continuation automation was
updated to the user-approved September 12 deadline.

## Remaining review action

At or after 18:00 UTC, perform no development. Reconcile any later work into
this review, mark it final, pause continuation automation, deliver the full
summary and await explicit user approval. Until then, remain quiet if there
is no new evidence or actionable development finding.

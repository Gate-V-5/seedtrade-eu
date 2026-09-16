# SeedTrade daily review — final

Status: finalized at the first post-gate wakeup, 2026-09-11 18:02 UTC
(21:02 Europe/Vilnius). The gate was 21:00 Europe/Vilnius. No development or
tests occurred after the gate; only review finalization and automation pausing.
No development changes occurred after the interim package at approximately
12:00 UTC. Continuation automation is PAUSED. Explicit approval is required
before further work.

## Completed work and results

- Accepted the completed LT 2023 S03 PRIMARY BOUNDARY 36px audit as verified
  and frozen; did not rerun it. v0.7 code and original saved outputs untouched.
- Added a saved-output selection/event diagnostic across all 15 LT sample-years:
  600,000 raw pixels, 227,855 selected pixels, no missing target baselines,
  exact expected/saved selection agreement. All 33 input hashes unchanged.
- Found 20,938 conflict pixels in 30 sample-year event groups. These groups are
  descriptive and are not independent fields or effective sample sizes.
- Added geometry checks: all five sites use the same saved grid across the
  three years; no positive-area overlap in 30 within-year sample pairs.
  All 15 input hashes unchanged (these inputs overlap the first diagnostic's
  33; do not report 48 unique inputs).
- Added reference metadata screening to reject explicit unsuitable records,
  duplicate IDs and grouped holdout leakage, while retaining missing evidence.
  Complete metadata only produces a candidate for review.
- Recorded official CLMS uncertainty/reference interpretation and drafted an
  independent parcel/site validation protocol.
- Verified six official 2023 spring/winter crop codes. Bounded public CSV
  retrieval confirmed field IDs and season labels, but no geometry columns.
- Investigated geometry catalogue and institutional schema. A licensed,
  year-compatible LAUKO_ID geometry link and training independence remain open.

| Year | Selected pixels | Conflict pixels | Sample-year event groups |
|---|---:|---:|---:|
| 2021 | 76,978 | 3,476 | 7 |
| 2022 | 75,992 | 90 | 2 |
| 2023 | 74,885 | 17,372 | 21 |

## Tests and limitations

19 synthetic tests passed across three suites: selection/event (8), geometry
(4), reference eligibility (7). The two full saved-data diagnostics passed.
No tests rerun merely for this documentation package; no new executable change.

These results establish consistency and characterize disagreement, not
independent agronomic accuracy. Saved metadata agreement is not external
geolocation validation. Non-overlap is not statistical independence. The
already inspected sites cannot become untouched holdouts for future tuning.
The public CSV read was only 4096 bytes, so full coverage/uniqueness is unknown.
Reference-screening declarations still require evidence verification. PDF
vocabulary was text-verified; screenshot retrieval failed. No reference parcels
have been spatially matched to SeedTrade data.

## Conclusions and recommendations

Keep v0.7 frozen. No independent evidence currently justifies a new version.
Prioritize a documented 2023 field-ID-to-geometry link, applicable reuse terms,
source independence and parcel-level reference coverage. Then evaluate on
appropriately grouped references, with explicit abstentions and class metrics.
Provider contact, if desired, needs explicit user authorization. Avoid further
threshold tuning or repetitive diagnostics while the evidence gap remains.

## Files added or changed in this continuation

All listed files are new in this continuation; some were updated across batches.
Original project files and frozen artifacts were not edited.

Code and tests under collectors/phenology:
- selection_event_validation_v01.py
- test_selection_event_validation_v01.py
- spatial_geometry_validation_v01.py
- test_spatial_geometry_validation_v01.py
- reference_eligibility_v01.py
- test_reference_eligibility_v01.py

Reports/metadata under data/validation:
- selection_event_v01.json
- spatial_geometry_v01.json
- lt_2023_declared_season_vocabulary.json
- lt_public_release_schema_v01.json

Documentation under docs/validation:
- WORK_LOG.md
- NEXT_STEPS.md
- REFERENCE_NOTES.md
- INDEPENDENT_VALIDATION_PROTOCOL.md
- LT_REFERENCE_AVAILABILITY.md
- LT_2023_SEASON_VOCABULARY.md
- REFERENCE_SCREENING.md
- LT_GEOMETRY_LINKAGE.md
- DAILY_REVIEW_2026-09-11.md
- REPRODUCTION.md

No Git push, deployment, web publication, provider messages, account-data
access or external-system mutation occurred. Public read-only requests used
normal escalation after sandbox networking restrictions.

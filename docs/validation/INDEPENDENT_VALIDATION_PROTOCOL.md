# Independent validation protocol — draft 2026-09-11

Status: design only. No independent reference labels have been acquired.
The five LT sites and three years have already been inspected diagnostically;
they must not be described as an untouched holdout for a future tuned version.

## Questions and units

Evaluate winter/spring season identity separately from event-date accuracy.
A crop-type label alone cannot establish either season identity or emergence
date. The primary unit is a documented agricultural parcel and reference year,
with the same parcel and overlapping site footprints grouped across years.
Raster components are candidate locations, not parcel boundaries.

## Reference manifest requirements

Each accepted reference needs a stable reference ID; source and license;
acquisition date; reference year; parcel geometry and CRS; positional quality;
crop nomenclature; explicit season label definition; observed event dates and
their meaning if available; source uncertainty; and training/calibration-use
provenance for the upstream products. Missing values remain unavailable.
Retain rejected candidates with a reason rather than silently dropping them.

## Selection and separation

Use current conflict events only to select a diagnostic case-study queue.
Include agreement, weak/ambiguous, and insufficient-data cases to avoid
verifying only conflicts. Do not interpret this queue as a probability sample.
For an accuracy estimate, first define an eligible population and sampling
design, then record inclusion probabilities and reference availability before
revealing predictions to label reviewers.

For a future candidate version, reserve new sites or independent reference
groups before tuning. Keep all overlapping parcels/sites and repeated years
in one split. Record prior inspection and any upstream training overlap.
Temporal transfer requires a separate year-held-out analysis with appropriate
spatial grouping; the already inspected 2021–2023 data cannot become unseen.

## Metrics and reporting

Report reference coverage, missing/ambiguous labels, and abstentions alongside
the season confusion matrix. State exactly how pixel predictions are assigned
to each reference unit before evaluating results; never choose a parcel
aggregation rule after seeing its errors. Report class-specific performance
and sample counts. Use design-appropriate uncertainty intervals at the sampled
unit/group level only when enough independent groups and design information
exist. Do not apply a binomial pixel interval to spatially repeated signals.

Date errors require like-for-like event definitions and reference dates;
sowing is not automatically the remotely sensed emergence event. Report date
errors separately from season-class disagreement and CLMS confidence layers.

## Gate for proposing a classifier change

Identify a reproducible defect or independently supported failure mechanism,
specify a correction before evaluation, preserve frozen baselines, and compare
on reserved groups. Report regressions, coverage and uncertainty as well as
improvements. If reference evidence is unavailable, retain v0.7 and report the
evidence gap. This protocol does not authorize changing v0.7.

# Reference interpretation notes — 2026-09-10

These are research notes, not a classifier change or a completed independent
accuracy assessment. Official sources inspected online on 2026-09-10.

## Confidence-layer meaning

[CLMS Vegetated Land Cover Characteristics ATBD, section 3.6.4](https://library.land.copernicus.eu/products/High_Resolution_Layer_Vegetated_Land_Cover_Characteristics_ATBD_v2.html)
derives event uncertainty from the q10/q50/q90 fAPAR curves and event slope,
adding contributions on the two sides. A fallback also sums the two temporal
contributions. Section 3.6.5.1 defines duration from emergence and harvest and
its confidence as the average of those event confidences.

Implication for future SeedTrade diagnostics: a scalar uncertainty is not by
itself a symmetric plus/minus interval, a standard deviation, or a calibrated
probability of a season class. An interval sensitivity experiment must state
its additional assumptions. Shared derivation means these layers cannot be
counted as independent votes. No defect in frozen v0.7 is established here.

## Independent reference design

[CLMS Croplands Product User Manual, sections 8.2–8.3](https://library.land.copernicus.eu/products/High_Resolution_Layer_Croplands_2017-present_PUM_v2.html)
describes LUCAS and GSAA reference sampling, excludes training/calibration
records in relevant designs, and notes country/year availability limits.
It reports using LUCAS 2022 for CTY assessment, with no production-training use
of those samples in the described assessment.

Implication: first establish local coverage, matching reference year, label
definitions, positional quality and training provenance. A crop-type reference
is not automatically a winter/spring or emergence-date reference. The manual
does not establish that usable 2023 season labels exist in these five LT sites.
Repeated observations of the same field across years must remain grouped in
any development/held-out split. No reference data have been acquired yet.

# Reference metadata screening v0.1

`collectors/phenology/reference_eligibility_v01.py` exposes
`screen_manifest(records, year)` for local Python callers. It performs no I/O,
network access or classifier execution and does not mutate input records.

Required text fields: reference_id, source_url, license_evidence, group_id,
geometry_evidence, crs, position_quality_evidence, label_definition_evidence,
training_provenance_evidence. Evidence fields must refer to actual reviewed
sources before a real record is submitted; synthetic test text is not evidence.

Required declarations: unit=PARCEL; season=WINTER or SPRING;
training_use=EXCLUDED; geometry_review=VERIFIED; label_review=VERIFIED;
usage_review=PERMITTED; reference_year matching the requested integer year.
UNKNOWN or absent review information stays pending. Explicit unsuitable values
are rejected. Rejection takes precedence but missing evidence remains listed.

Optional split is DEVELOPMENT or HELD_OUT. Held-out records require
prior_inspection=false. Duplicate reference IDs and group IDs crossing splits
are rejected. Group IDs must be assigned upstream using real spatial overlap
and repeated-parcel/site identity; this function cannot detect geometry overlap.
Evaluate the full combined manifest to detect leakage across source files.

Identifier input rule (2026-09-12): reference_id and group_id with leading or
trailing whitespace are rejected with PADDED_ID. The utility preserves the
original values rather than silently trimming them. Correct the source manifest
and rescreen all records together; internal whitespace and case remain exact
because no provider-specific equivalence rules have been established.

Outputs: REJECTED, PENDING_EVIDENCE, or CANDIDATE_FOR_REVIEW, with reasons.
No output means proven independent ground truth or accuracy. The function
checks metadata claims, not evidence authenticity, URLs, licenses, geometry,
positional tolerance, crop-code mapping, sampling design or label correctness.
No real reference record has been accepted or screened in this batch.

Nine synthetic tests cover pending evidence, unsuitable references, duplicate
identity, split leakage, inspected holdout, immutability and empty input.
Two added regressions verify that padded reference/group IDs cannot enter the
candidate set. Both failed before the fix and passed after it.

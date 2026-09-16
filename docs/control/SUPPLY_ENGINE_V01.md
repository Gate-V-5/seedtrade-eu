# Supply Engine v0.1 — local research prototype

Implementation: collectors/supply/supply_v01.py. Tests: test_supply_v01.py.
Output: data/seed_production/supply_v01_2024.json.

44 measurement records from 28 source categories: 10 German quantity totals,
24 Polish assessed/qualified/disqualified area measurements, 10 Italian area
entries including four source blanks. These are not 44 independent production
observations. France has no accepted 2024 data; all five France coverage cells
are MISSING. HAS_OBSERVATIONS_NOT_FULL_COVERAGE is not complete coverage.

Exact decimal dt / 10 conversion yields tonnes only for quantity measurements.
Area never produces mass. Available supply and cross-country supply total stay
null. Original species labels, metrics, periods, source locators and limitations
are retained. No classifier import or execution. No frontend integration.

Nine tests pass: conversion/no inventory, zero versus missing, duplicates,
invalid values, unit mismatch, year filtering and country gaps, area semantics,
input immutability, assessment reconciliation. CLI refuses to overwrite its
saved result; use a new explicitly scoped output for future revisions.

Limits: source taxonomy not harmonized; reference year does not establish
identical reporting windows. Italian ryegrass includes second cuts. Certification
and field assessment are distinct from production and inventories. Source reuse
and visual verification remain unresolved. Metadata is not independently checked
by the engine. No quality score, production forecast or price is inferred.

## Metadata correction — September 13 04:32 UTC

Two new regressions demonstrated missing source metadata and unsupported
presented-area inputs (one failure, one error before correction). Normalized
records now retain provisional/as-of, source hash/sheet/date and use category.
Presented area is supported as a distinct hectare metric. All 11 Supply tests
pass. Separate supply_v01_2025.json contains six French observations; all retain
provisional=true and 2025-08-26, with null tonnes. The saved 2024 output remains
unchanged and predates this metadata correction; consult original source files
for provenance omitted there. Do not treat that historical output as regenerated.

## Reviewed output revision

Use supply_v01_2024_r02.json for current 2024 research (47 measurements, four
missing); retain supply_v01_2024.json as historical. Reproduction script
collectors/supply/build_reviewed_2024.py verifies PDF hashes, normalizes current
metadata, adds the separate Westerwolds source record and records input hashes.
It refuses output overwrite. Integration checks passed; no classifier changes.
Source limitations copied verbatim may retain historical visual-pending wording;
the attached verification reports and extraction_status provide the update.

September 13 09:42 validation update: provisional must be boolean or unknown;
provisional=true requires a valid YYYY-MM-DD as-of date. Eleven malformed input
subcases failed before correction. All 14 Supply tests now pass. French saved
output reproduced exactly in memory after the fix; no output/source edits.

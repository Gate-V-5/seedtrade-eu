# Reproduction and review instructions

Run from C:\SeedTrade. Runtime used:
`C:/Users/WDAGUtilityAccount/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`.
The new modules use the Python standard library only.

## Synthetic suites

For each name below run the Python executable with:
`-B -m unittest discover -s collectors/phenology -p NAME`

- test_selection_event_validation_v01.py — 8 tests
- test_spatial_geometry_validation_v01.py — 4 tests
- test_reference_eligibility_v01.py — 9 tests (two padded-ID regressions added
  during the September 12 work window; September 11 review retains its original count)

These suites do not rerun the frozen audit or classifier.

## Completed saved-data analyses

The completed selection_event_v01.json and spatial_geometry_v01.json contain
source paths and SHA256 hashes. Review these saved results directly. Their
scripts refuse to overwrite reports and include the 2026-09-11 18:00 UTC stop
gate. Do not delete reports or bypass that gate merely to rerun them. If a
future approved reproduction is necessary, explicitly revise the diagnostic
output location and authorized execution window while preserving originals.

No classifier module is imported or executed by these diagnostics. The
selection script reads exact 2026-09-07 LT raw, v0.4 and v0.7 JSON files;
the geometry script reads only the 15 exact raw JSON files. Source hashes are
verified before writing each report. The geometry script imports utility
functions from the new selection diagnostic only.

## Reference evidence

The vocabulary and public-release schema JSON are metadata, not a reference
dataset. Source URLs and inspection limits are recorded in them. The
reference_eligibility_v01 module exposes screen_manifest(records, year) without
I/O. See REFERENCE_SCREENING.md for fields, status semantics and limitations.
No tests or scripts establish geometry linkage or upstream independence.

# Geometry linkage evidence — 2026-09-11

The public 2023 declaration CSV has LAUKO_ID but no geometry. A spatial
comparison remains pending a documented, year-compatible geometry linkage.

[Catalogue 3396](https://data.gov.lt/datasets/3396/) describes anonymized crop
geometry with attributes, lists public access and identifies NMA as creator.
Its [RDF metadata](https://data.gov.lt/datasets/3396/dcat-ap.rdf) was retrieved
directly after the web tool rejected the RDF content type. The complete returned
XML ended within the 24,000-byte read limit and contained no distribution or
download/access URL. No historical year, field-ID schema or reuse license was
established from that record. Public catalogue access is not proof of a usable
2023 geometry release or permission to integrate the separate restricted service.

[Statistics Lithuania's PPIS transfer schema](https://duomenys.stat.gov.lt/en/paraisku-priemimo-informacine-sistema-valdytojas-lietuvos-respublikos-zemes-ukio-ministerija/)
describes a declared-field array including GEOMETRIJA (WKT), BLOKO_NR and
LAUKONR. It describes an institutional data transfer, not an open release.
It does not establish equality between those identifiers and the CSV LAUKO_ID.
No institutional records or personal data were accessed.

## What is still required

- A usable 2023 geometry release with applicable reuse terms.
- Documented identifier relationship to the declaration CSV, including year,
  uniqueness, split/merged parcels and update conventions.
- CRS, positional quality and spatial overlap checks against the saved sites.
- Independent training/calibration provenance for the intended evaluation.

Do not join by guessed identifier equality, holding-centre municipality, crop
name or national area proportions. No independent accuracy estimate is possible
from the currently acquired evidence alone. This is an evidence gap, not a
claim that no suitable dataset exists. Provider contact would require explicit
user authorization; no contact was made.

Next useful local work is to consolidate the validation evidence and runnable
test instructions for review. Further geometry investigation should use a new,
specific source lead rather than repeat these catalogue queries.

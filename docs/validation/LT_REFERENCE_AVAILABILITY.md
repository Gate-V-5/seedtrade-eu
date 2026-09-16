# Lithuanian reference availability — 2026-09-11

Update at 08:47 UTC: bounded direct retrieval succeeded for catalogue 283.
The 2023 release has field IDs and crop labels but no geometry/coordinate
columns. See data/validation/lt_public_release_schema_v01.json. The historical
metadata-only findings below are preserved; schema uncertainty is now resolved
for the observed header, while geometry linkage and independence remain open.

Metadata-only investigation. No parcel records, account data, or labels were
downloaded. No provider was contacted. All candidates remain unqualified for
independent accuracy estimation until label, geometry and training provenance
are established. Accessed official pages on 2026-09-11.

| Candidate | Evidence established | Unresolved / disposition |
|---|---|---|
| [ŽŪDC declared cereal areas, catalogue 283](https://data.gov.lt/datasets/283/?resource_version=255) | Description distinguishes winter and spring cereal areas by crop code; lists 2021, 2022 and 2023 CSV releases; catalogue displays CC BY 4.0. | File schema and parcel geometry not inspected. Do not assume area records can label pixels. Resource-detail fetch failed; structure route redirected then failed on a subsequent fetch. Public candidate for further schema inspection. |
| [ŽŪDC 2023 declared-area statistics](https://zudc.lt/statistika/informacija-apie-2023-m-deklaruotus-zemes-ukio-naudmenu-ir-paseliu-plotus/) | Lists 2023 crop-code totals and separate winter/spring cereal comparisons for 2017–2023. | Aggregate context only at this stage; cannot validate individual pixels. Linked tables have not been inspected for code mapping. |
| [Geoportal NMA crop service](https://www.geoportal.lt/mapproxy/nma_zun_paseliai/MapServer) | Description lists crop name/code, block and field identifiers, perimeter and area; service CRS records 3346. | Service explicitly restricts publication and use in other applications without consent. No integration or feature extraction performed. Historical year, season detail, license and training overlap unresolved. |
| [Geoportal ŽŪDC crop-group service](https://www.geoportal.lt/mapproxy/zuikvc_paseliai/MapServer) | Describes anonymized crop-field data by crop group; CRS records 3346. | Same explicit consent restriction for publication/application use. Crop groups may not resolve season. No integration or feature extraction performed. |
| [ŽŪDC 2026 declaration-system notice](https://zudc.lt/zemdirbiai-gales-anksciau-pasiruosti-2026-m-paseliu-deklaravimui/) | Notice identifies historical declared-field layers including 2022 and 2023 in the declaration system. | Existence in a system does not establish open download rights, schema or local coverage. No account access attempted. |

## Scientific implications

Public availability of aggregate winter/spring categories is promising for
understanding label definitions, but is not a parcel-level reference. No
upstream-training independence or observed emergence/harvest dates were
established. Do not transfer a national season proportion to the five sites.

The geographic services use a different recorded CRS from the LT saved rasters
(EPSG:32634). Any future authorized geometry matching needs explicit coordinate
transformation and positional checks; equal numeric coordinates are not a join.

Next bounded work: inspect the public catalogue schema or a bounded sample of
its documented public release, and verify the official 2023 crop-code labels.
If only aggregate geography exists, retain it as context and pursue another
public parcel-reference route. Restricted service integration requires provider
consent; contacting providers additionally requires explicit user authorization.

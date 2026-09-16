# LUCAS 2022 reference suitability — 2026-09-12 Lithuania time

Metadata/documentation investigation only; no microdata downloaded.

[Eurostat's 2022 database](https://ec.europa.eu/eurostat/web/lucas/database/2022)
lists Lithuania among its country downloads and provides classification, field
form, survey instructions and record-descriptor links. This confirms a country
release is listed, not that records intersect the five SeedTrade sites.

[Official C3 classification](https://ec.europa.eu/eurostat/documents/205002/13686460/C3-LUCAS-2022.pdf),
page 16, defines B11 common wheat to include both spring and winter wheat.
B13 identifies barley without a season distinction. Page 21 defines B32 rape
and turnip rape without a season distinction. These class codes alone cannot
provide independent winter/spring labels. This is especially relevant because
B32 is broader than a narrowly defined rapeseed-only reference.

Record-descriptor retrieval failed in the web tool. No conclusion is made that
all supplementary fields or imagery lack useful information. No season labels
were inferred from class, survey month, location or classifier output. No
coordinates or site intersections were inspected. The currently implemented
reference-screening utility is scoped to parcel references, so survey-point
assessment would need a separately defined protocol rather than relabeling
points as parcels.

Disposition: candidate for a separate crop-type/land-cover consistency study,
pending year, sampling, positional, label and independence checks. Not currently
a qualified season reference. Do not download a large country file solely to
count it as progress on the season-accuracy question.

Follow-up, 2026-09-11 23:35 UTC: inspected the official
[C2 field form](https://ec.europa.eu/eurostat/documents/205002/13686460/C2-LUCAS-2022.pdf).
Page 5 records land-cover classes, conditional crop species and crop coverage;
no dedicated winter/spring observation was identified. Whole-document text
search found no winter or harvest entry; spring matched grassland terminology.
This does not establish that every supplementary record or photograph lacks
season information. Pages 3–4 distinguish observation location, precision,
distance and observation type; any future point study must account for these.

Close this lead for direct season validation on current evidence. Reopen only
with a specific documented season field or an independently justified labeling
protocol. Only then assess local coverage. Existing
CLMS source notes about LUCAS 2022 training separation do not automatically
establish independence for every product, target, or record.

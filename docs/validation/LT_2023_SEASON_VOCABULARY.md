# Lithuanian 2023 declared-season vocabulary

The [official ŽŪDC 2023 crop-code totals](https://zudc.lt/wp-content/uploads/2024/01/4_Deklaruotos-zemes-ukio-naudmenos-ir-kiti-plotai_2023.pdf)
explicitly distinguish spring/winter wheat (KVV/KVŽ), barley (MIV/MIŽ), and
rapeseed (RAV/RAŽ). Page 1 text was retrieved on 2026-09-11. Screenshot retrieval
failed, so this is text-verified rather than visually verified.

Saved the six source labels and translations in
`data/validation/lt_2023_declared_season_vocabulary.json`. This is a vocabulary,
not acquired reference labels. Preserve the Lithuanian diacritics in codes.
Unknown codes remain unmapped; other years require their own source check.
No numeric CTY crosswalk or assignment for 'other cereals' is asserted.

This establishes that declaration nomenclature can express the desired season
distinction. It does not establish parcel geometry, coverage of the five sites,
observed event dates, or independence from upstream model training.

The [public cereal catalogue download](https://data.gov.lt/datasets/283/distribution/14323/download/)
could not be retrieved by the web tool (cache miss). The catalogue's structure
page was retrieved but exposed no model fields. Therefore the release schema
remains unresolved; neither parcel-level nor aggregate-only content is assumed.

Next: seek a documented public schema/download through the catalogue's public
metadata, or investigate an alternative authoritative parcel reference. Do not
repeat the same failing web route without a changed retrieval approach. Local
reference-ingestion validation can proceed with synthetic fixtures while actual
reference eligibility remains unestablished.

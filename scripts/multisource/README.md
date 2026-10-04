# Reproduce this task

The recovery package contains `implementation/` and `research/`. Official raw COMEXT evidence is under `research/raw-official/comext`, along with `COMEXT_REQUEST_MANIFEST.json` and yearly customs evidence. The commercial workbook and its normalized pilot are internal research files only; never copy them under public, src, or tracked Git data.

Run from the implementation directory, substituting the recovered research directory for WORK:

```
python scripts/multisource/normalize.py --work WORK
python scripts/multisource/recalculate.py --work WORK
python scripts/multisource/validate_universe.py --work WORK
python scripts/multisource/build_intersection.py --work WORK
```

`recalculate.py --apply` is explicitly gated on a complete 1080-request grid. It writes only derived country/customs totals and Trade Pulse; canonical taxonomy, Production data and species-page market data remain protected. Never sum the earlier 57,243 manifest-reported observation count into this replacement universe: full earlier raw rows were not independently available and source grains overlap.

The historical extractor and GlobalWits ingestion scripts are in the research directory. Read their preserved original sources and do not repeat full collection unless evidence is missing. The standard COMEXT fetch script is a bounded 40 CN × 27 reporter plan; Greece uses GR. Failed individual requests receive one ordinary retry. Empty official responses stay missing, not zero.

Commercial fields are future-compatible, but no company database, market prediction or Commercial Interpretation Layer is implemented. Licence gates fail closed; public fields require explicit permission evidence. Multi-provider reconciliation compares compatible grains without merging values, currencies, weights or source identities.

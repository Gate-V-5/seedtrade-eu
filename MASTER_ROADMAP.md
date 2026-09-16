# SeedTrade master roadmap

Status: evidence-based recovery and research prototype, not a launched commercial product.

## M1 DATA ENGINE

1. Backup & Recovery v1: recover 371 files, verify the 328+10 baseline, run every available local test suite, create canonical Git checkpoint and independently verified complete ZIP. Confirm off-Sandbox persistence. Gate: no major new phase without a reliable recovery copy.
2. Recovered: Weather/Phenology/Crop-Weather; DE/PL/IT/FR source artifacts; Supply v0.1; CN2026 mapping; crop basket v0.1; Globalwits audit. Recovered does not mean empirical accuracy, current data, or production readiness.
3. Recovered additional work: TradeObservation, per-metric multi-source validator, explicit complete-child aggregation and generic Basket v0.2. Retain immutable raw provenance and frozen classifier v0.7.
4. Complete bounded Eurostat/Comtrade adapters, verified CN2025 partition and real cross-check. Globalwits requires manual login; capture at least five genuinely comparable observations only when accessible and definitions established. Missing dimensions remain NOT_COMPARABLE.
5. Implement/test semantic revisions, seven-day refresh planning, historical vintage retention and failure protection. Do not enable a scheduler or automatically ingest authenticated sources.

## M2 INTELLIGENCE

Implement transparent MoM/YoY/rolling-year, net-mass balance, unit values and qualified partner concentration. Missing inputs remain UNKNOWN. No numerical role weights or invented species shares. Supply/Trade integration exposes production, certified mass, hectares, weather, trade, demand and prices separately. Gate: complete, comparable real observations and explicit provenance; tests alone do not validate the market model.

## M3 COMMERCIAL PRODUCT

Build qualified RFQ demand and observed-price capture, explainable customer views, data usage review, GA4/GTM/SEO readiness, monitoring and operating procedures. Gate: M1/M2 evidence, meaningful product acceptance tests and explicit user deployment/publication approval. Current demo RFQs and displayed market numbers remain demo data. No production price engine or public launch is authorized by backup permission.

## Checkpoint contract

TEST -> VERIFY -> HASH/INVENTORY -> COMMIT/PUSH -> PLAN B SNAPSHOT -> CONTINUE.
Record exact commit, archive SHA256 and inventory SHA256 in an external checkpoint receipt; embedding a commit's own hash in its content is impossible. MASTER_STATE identifies the checkpoint and parent, while the receipt binds it to the final commit.

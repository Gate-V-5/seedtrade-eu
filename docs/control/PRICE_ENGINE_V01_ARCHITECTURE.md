# Price Engine v0.1 architecture — proposed, not implemented

Purpose: report supported price evidence without presenting trade ratios or
modeled estimates as transaction quotes. No live price feed or model is built.

## Data contract

Each record needs source URL/version and retrieval time, observation period,
country/market, exact species or explicit aggregate, currency, price unit,
measurement type, and source quality/reuse limitations. Quotes additionally
need delivery basis, tax inclusion, seed grade/certification, treatment, pack
size, quantity basis and quote date where supplied. Unknown fields stay null.
Separate observed transaction price, offered quote, official survey average,
trade unit value and modeled estimate. Never silently substitute one for another.

## Local processing flow

Source adapters produce immutable raw evidence and normalized records. Validate
identifiers, finite values, periods, currency and units before calculation.
Preserve missing/confidential/suppressed values distinctly from true zero.
Store currency conversion as a derived record with rate source/date; no implicit
current exchange rate on historical observations. Retain original values.

Trade unit values may be computed as value divided by positive net mass only
when numerator and denominator share reporter, partner, direction, period,
classification edition and coverage. Verify reported value scale first. Label
as trade unit value; it does not establish a market quote or available supply.
Reject mixed-species attribution using the Trade Intelligence mapping. The
current mapping covers original CN 2026 only, so it cannot authorize 2024 joins.
Imports and exports stay separate; no mirror-flow double counting.

Supply Engine observations can provide dated context only. Its certification
quantities and assessment areas do not determine a price or inventory. No
hectare-to-price or area-to-tonnage shortcut. Any future price model needs a
separate protocol, held-out time periods and documented predictive validation.

## Outputs and implementation gate

Return a record with value (nullable), type, basis, source, date and explicit
missing prerequisites. Do not emit a synthetic single European species price
from incompatible grades, periods, currencies, aggregate codes or countries.

Implement after obtaining at least one qualified price or matched trade-value/
mass source. Tests must cover denominator zero/missing, suppressed values,
currency/value scaling, period mismatches, mixed species and stale observations.
No numeric prices have been obtained or computed in this cycle. This architecture
requires no external service, account, database migration or deployment.

# SeedTrade — Focus & Delivery Charter (2026-11-05)

Status: owner-directed development priorities. Planning document only; **not** a deployment authorization.

## Outcome
Build a credible EU seed intelligence and B2B platform with measurable commercial activity. The €1m annual turnover in 3–5 years is a target, not a forecast.

## Operating rules
1. One integrated, verifiable work package at a time. Each must improve data trust, complete a customer workflow, or remove a specific security blocker.
2. Reuse current Hostinger Node.js 22 / Express / React, MariaDB, GitHub and existing modules. No new VPS, mTLS expansion, subscriptions or modules without demonstrated need.
3. Prefer read-only inspection before changes; no staging or production deployment, database write, live email, credential change, or activation without explicit owner authorization.
4. Record source branch, commit, evidence, limitations, acceptance criteria and rollback for each package. A mocked PASS is not a runtime PASS.
5. Do not repeat previously passing tests unless changed code or dependencies justify it. Avoid repetitive diagnostics and cosmetic work before core workflows function.
6. Never publish credentials, database contents, private keys or environment dumps.

## Priority 1 — DATA TRUST
Independent external review (partial, without repository access) flagged possible inconsistencies in Trade Pulse export value/weight/ranges, ambiguous month vs rolling-12 labels, and possibly synthetic ±20% price bands. These are **audit hypotheses**, not confirmed code defects.
- Inspect exact source datasets, calculations, and rendered values for the affected metrics.
- Recompute value/volume and compare against displayed unit values, with proper coverage/aggregation definitions.
- Confirm whether price bands are independently sourced; remove or explicitly relabel unsupported bands.
- Review staging indexing, public marketplace claims, provenance, build identity and any commercial relationship disclosure.
Acceptance: reproducible figures, transparent periods/units/source/method, no misleading price labels, and targeted tests.

## Priority 2 — B2B END-TO-END
- Historical local tests: 36 PASS; build PASS, but not evidence of deployed functionality.
- Reported staging MariaDB: u230581718_staging_b2b, MariaDB 11.8.9; five registration tables and three FKs verified via phpMyAdmin.
- Direct SSH MariaDB authentication: ERROR 1045 even after password reset. Hostinger confirms managed Node.js should use local TCP 127.0.0.1:3306, but actual Node.js connection remains unverified.
- SMTP delivery, proxy policy and browser end-to-end registration remain unverified.
- Feature branch differs from staging deployment. API is intentionally disabled.
- Read-only probe scripts/b2b_staging_db_readonly_probe.mjs exists but has **not** been executed in the managed runtime.
Next: prove managed Node.js-to-MariaDB connectivity using isolated credentials/config and no production impact; then verify SMTP delivery with approved synthetic accounts, proxy security, and one complete staging registration. Preserve disabled default until acceptance.

## Priority 3 — COMMERCIAL PILOT
Test a single high-value workflow: breeder/distributor seed multiplication demand matched with verified seed producers/farmers.
- Recruit 10–20 pilot companies, validate actual needs, contracts and willingness to pay.
- Track qualified requests, matches, offers, completed contracts and gross margin; do not equate site visits with revenue.
- Defer full RFQ/chat/marketplace expansion until evidence warrants it.

## Current package
DATA TRUST / DT-01: read-only trace of Trade Pulse arithmetic, periods and price-band derivation. Deliver discrepancy table with source paths and minimal proposed fixes. Do not alter production or staging.

## Independent audit limits
The external report's 4.5/10 score is provisional: it reviewed public pages but not repository code, tests or infrastructure. Verify its findings before treating them as established defects.

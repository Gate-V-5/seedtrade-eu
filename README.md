# SeedTrade.eu

Public source for the SeedTrade.eu read-only European seed market intelligence website.

## Stage 6 simplified Marketplace V1 — local candidate, 2026-11-20

MB Gate-V is the platform operator and manual broker, identified by its approved
public legal identifiers. It does not need a Member account, company approval,
billing authority or transaction administrator to receive confirmed enquiries.
Existing genuine Member registration, email verification/password setup,
independent company approval, listings, opted-in notices and confirmed enquiries
are reused. Publication records explicit acceptance of the exact 1% terms.
The listing author pays only on executed goods value excluding VAT; enquiries
alone are free. Negotiation, contracts, delivery and invoicing remain manual.

The historical transaction engine and evidence remain available in their prior
scope. Simplified mode refuses automated member and operator transaction actions
and mounts no transaction-administrator routes. Privileged company review and
member management retain separate MFA and explicit permission requirements.

The hosted composition is prepared behind all existing Marketplace/registration
release gates. It additionally requires `B2B_BROKERAGE_TERMS_HASH` to match the
current `digest(simpleTerms)` and `B2B_BROKERAGE_TERMS_APPROVAL_REF` to reference
genuine owner acceptance of that exact text. Neither value is approval by itself.
No production configuration is changed. The five-language exact draft is in
[brokerage-terms-review.html](docs/stage6-simplified-v1/brokerage-terms-review.html).
Previous accepted legal versions and the three unpublished drafts are preserved.

Production pilot remains blocked by the existing specific provider/recovery
privacy facts and completed-notice approval, exact brokerage-text approval,
operational MFA enrollment for privileged review as applicable, controlled
delivery verification, release/recovery sealing and separate deployment approval.
Gate-V Member registration, automated billing and transaction-admin enrollment
are not V1 release prerequisites. Use the existing GitHub → Hostinger process
and close-first rollback; do not publish from the local preview.

Focused checks: `node --test tests/b2bSimplifiedRelease.test.mjs
tests/b2bSimpleMarketplace.test.mjs tests/b2bSimpleRegistration.test.mjs`.
All mail and production-shape composition in these tests use synthetic adapters.
Prior real MySQL/MariaDB migration checks are reused; this correction adds no schema.

## Build and test

Requirements: Node.js, npm, and Python 3.

```sh
npm ci
npm test
npm run build:vite
```

The production build is written to `dist/`. The build includes prerendered, static-first HTML for public routes so core content remains visible without JavaScript.

## Publication safety

This is a **PUBLIC repository**. Only data explicitly approved as `PUBLIC_SAFE` may be committed. Private, licensed, raw-source, credential, operational, and recovery material must remain outside this repository. The committed `src/generated/` files are the reviewed public website data layer; private source and transformation layers are intentionally excluded.

## EU Seed Trade Pulse

`src/generated/trade_pulse_public.json` is the publication-safe aggregate derived from verified Eurostat COMEXT DS-045409 rows. It separates EU internal dispatches, extra-EU imports and extra-EU exports; excludes the 2026-07 partial period; and labels weighted trade value per net kilogram as **unit value**, not market price. The raw normalized COMEXT source is intentionally kept outside this public repository. `scripts/generate_trade_pulse.py` regenerates the public aggregate when an authorized verified source path is supplied.
